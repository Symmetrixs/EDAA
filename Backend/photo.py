from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import traceback
import base64
from datetime import datetime
import time

load_dotenv()

# Initialize Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

router = APIRouter(prefix="/photo", tags=["Photo Reporting"])

# ---------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------

class PhotoBase(BaseModel):
    InspectionID: int
    PhotoURL: str
    PhotoNumbering: Optional[float] = None
    Category: Optional[str] = None
    Caption: Optional[str] = None
    FindingID: Optional[int] = None
    RecommendID: Optional[int] = None

class PhotoCreate(PhotoBase):
    pass

class PhotoUpdate(BaseModel):
    PhotoURL: Optional[str] = None
    PhotoNumbering: Optional[float] = None
    Category: Optional[str] = None
    Caption: Optional[str] = None
    FindingID: Optional[int] = None
    RecommendID: Optional[int] = None

class CanvasSaveRequest(BaseModel):
    inspection_id: int
    group_photo_ids: List[int]
    canvas_image_base64: str

# ---------------------------------------------------------
# Helper Function
# ---------------------------------------------------------

async def upload_annotated_image_to_storage(annotated_image_base64, inspection_id, photo_id):
    """Upload annotated image to Supabase Storage"""
    if not annotated_image_base64:
        return None
    
    try:
        # Decode base64
        image_bytes = base64.b64decode(annotated_image_base64)
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"annotated_{inspection_id}_{photo_id}_{timestamp}.jpg"
        
        # Upload to storage
        supabase.storage.from_("inspection-photos").upload(
            path=f"annotated/{filename}",
            file=image_bytes,
            file_options={"content-type": "image/jpeg"}
        )
        
        # Get public URL
        url = supabase.storage.from_("inspection-photos").get_public_url(f"annotated/{filename}")
        
        print(f"✅ Uploaded: {url}")
        return url
        
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        traceback.print_exc()
        return None

# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

@router.post("/", status_code=201)
def add_photo(photo: PhotoCreate):
    try:
        new_data = photo.dict()
        response = supabase.table("PhotoReport").insert(new_data).execute()
        
        if not response.data:
            return {"message": "Photo added", "request_data": new_data}
            
        return response.data[0]
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to add photo: {str(e)}")

@router.get("/inspection/{inspection_id}")
def get_photos_by_inspection(inspection_id: int):
    try:
        response = supabase.table("PhotoReport")\
            .select("*, Finding(Description), Recommendation(Description)")\
            .eq("InspectionID", inspection_id)\
            .order("PhotoNumbering", desc=False)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/all/{inspection_id}")
def delete_all_photos(inspection_id: int):
    try:
        response = supabase.table("PhotoReport")\
            .delete()\
            .eq("InspectionID", inspection_id)\
            .execute()
        return {"message": "All photos deleted successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{photo_id}")
def get_photo(photo_id: int):
    try:
        response = supabase.table("PhotoReport")\
            .select("*")\
            .eq("PhotoID", photo_id)\
            .execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Photo not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{photo_id}")
def update_photo(photo_id: int, photo: PhotoUpdate):
    try:
        update_data = {k: v for k, v in photo.dict().items() if v is not None}
        
        response = supabase.table("PhotoReport")\
            .update(update_data)\
            .eq("PhotoID", photo_id)\
            .execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Photo not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{photo_id}")
def delete_photo(photo_id: int):
    try:
        response = supabase.table("PhotoReport")\
            .delete()\
            .eq("PhotoID", photo_id)\
            .execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Photo not found")
        return {"message": "Photo deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
def upload_photo(file: UploadFile = File(...)):
    try:
        bucket_name = "inspection-images" 
        file_ext = file.filename.split('.')[-1]
        filename = f"{int(time.time())}_{file.filename}"
        
        file_content = file.file.read()
        
        supabase.storage.from_(bucket_name).upload(
            path=filename,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        public_url = supabase.storage.from_(bucket_name).get_public_url(filename)
        
        return {"url": public_url}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload: {str(e)}")

# ---------------------------------------------------------
# AI Detection Endpoints with Storage
# ---------------------------------------------------------

@router.post("/batch-detect/{inspection_id}")
async def batch_detect_and_save(inspection_id: int, category: str):
    """AI detection with storage upload"""
    try:
        # Get photos
        photos_response = supabase.table("PhotoReport")\
            .select("PhotoID, PhotoURL, Caption, PhotoNumbering")\
            .eq("InspectionID", inspection_id)\
            .eq("Category", category)\
            .order("PhotoNumbering")\
            .execute()
        
        if not photos_response.data:
            return {"success": True, "processed": 0, "results": []}
        
        # Use ALL photos (both main and grouped)
        all_photos = photos_response.data
        
        photo_ids = [p["PhotoID"] for p in all_photos]
        photo_urls = [p["PhotoURL"] for p in all_photos]
        
        print(f"📸 Detecting {len(all_photos)} photos")
        
        # Call AI detection
        import httpx
        async with httpx.AsyncClient(timeout=300.0) as client:
            ai_response = await client.post(
                "http://localhost:8000/ai-detection/detect-batch",
                json={"photo_ids": photo_ids, "photo_urls": photo_urls, "category": category}
            )
            ai_results = ai_response.json()
        
        if not ai_results.get("success"):
            raise HTTPException(status_code=500, detail="AI detection failed")
        
        # Process results
        processed_results = []
        
        for result in ai_results["results"]:
            photo_id = result["photo_id"]
            
            # Create Finding
            finding_response = supabase.table("Finding").insert({
                "Description": result["finding"]
            }).execute()
            
            if not finding_response.data:
                continue
            
            finding_id = finding_response.data[0]["FindingID"]
            
            # Create Recommendation
            recommendation_response = supabase.table("Recommendation").insert({
                "Description": result["recommendation"]
            }).execute()
            
            if not recommendation_response.data:
                continue
            
            recommendation_id = recommendation_response.data[0]["RecommendID"]
            
            # Upload annotated image to storage
            annotated_url = await upload_annotated_image_to_storage(
                result.get("annotated_image_base64"),
                inspection_id,
                photo_id
            )
            
            # Update PhotoReport
            update_data = {
                "FindingID": finding_id,
                "RecommendID": recommendation_id,
            }
            
            if annotated_url:
                update_data["AnnotatedPhotoURL"] = annotated_url
                update_data["AIDetectionDate"] = datetime.now().isoformat()
                
                # Get max confidence
                if result.get("detections"):
                    max_conf = max([d["confidence"] for d in result["detections"]])
                    update_data["DetectionConfidence"] = max_conf
            
            supabase.table("PhotoReport")\
                .update(update_data)\
                .eq("PhotoID", photo_id)\
                .execute()
            
            processed_results.append({
                **result,
                "annotated_photo_url": annotated_url
            })
        
        print(f"✅ Complete: {len(processed_results)} photos")
        
        return {
            "success": True,
            "processed": len(processed_results),
            "results": processed_results
        }
    
    except Exception as e:
        print(f"❌ Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/redetect/{photo_id}")
async def redetect_single_photo(photo_id: int):
    """Re-detect single photo with storage"""
    try:
        # Get photo
        photo_response = supabase.table("PhotoReport")\
            .select("*")\
            .eq("PhotoID", photo_id)\
            .execute()
        
        if not photo_response.data:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        photo = photo_response.data[0]
        
        # Call AI detection
        import httpx
        async with httpx.AsyncClient(timeout=60.0) as client:
            ai_response = await client.post(
                "http://localhost:8000/ai-detection/detect-by-url",
                params={"photo_url": photo["PhotoURL"]}
            )
            ai_result = ai_response.json()
        
        # Update or create Finding
        if photo.get("FindingID"):
            supabase.table("Finding")\
                .update({"Description": ai_result["finding"]})\
                .eq("FindingID", photo["FindingID"])\
                .execute()
            finding_id = photo["FindingID"]
        else:
            finding_response = supabase.table("Finding").insert({
                "Description": ai_result["finding"]
            }).execute()
            finding_id = finding_response.data[0]["FindingID"]
        
        # Update or create Recommendation
        if photo.get("RecommendID"):
            supabase.table("Recommendation")\
                .update({"Description": ai_result["recommendation"]})\
                .eq("RecommendID", photo["RecommendID"])\
                .execute()
            recommendation_id = photo["RecommendID"]
        else:
            recommendation_response = supabase.table("Recommendation").insert({
                "Description": ai_result["recommendation"]
            }).execute()
            recommendation_id = recommendation_response.data[0]["RecommendID"]
        
        # Upload annotated image
        annotated_url = await upload_annotated_image_to_storage(
            ai_result.get("annotated_image_base64"),
            photo["InspectionID"],
            photo_id
        )
        
        # Update PhotoReport
        update_data = {
            "FindingID": finding_id,
            "RecommendID": recommendation_id,
        }
        
        if annotated_url:
            update_data["AnnotatedPhotoURL"] = annotated_url
            update_data["AIDetectionDate"] = datetime.now().isoformat()
            if ai_result.get("detections"):
                max_conf = max([d["confidence"] for d in ai_result["detections"]])
                update_data["DetectionConfidence"] = max_conf
        
        supabase.table("PhotoReport")\
            .update(update_data)\
            .eq("PhotoID", photo_id)\
            .execute()
        
        return {
            "success": True,
            "photo_id": photo_id,
            "finding": ai_result["finding"],
            "recommendation": ai_result["recommendation"],
            "annotated_image_base64": ai_result.get("annotated_image_base64"),
            "annotated_photo_url": annotated_url,
            "detection_count": ai_result.get("detection_count", 0)
        }
    
    except Exception as e:
        print(f"❌ Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================================
# Canvas Save Endpoint
# ======================================================================

@router.post("/save-canvas-annotation")
async def save_canvas_annotation(request: CanvasSaveRequest):
    """Save canvas annotation for a group of photos"""
    try:
        canvas_image_base64 = request.canvas_image_base64
        
        # Remove data URL prefix if present
        if canvas_image_base64.startswith('data:image'):
            canvas_image_base64 = canvas_image_base64.split(',')[1]
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(canvas_image_base64)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"canvas_{request.inspection_id}_{timestamp}.png"
        
        # Upload to Supabase Storage
        try:
            upload_response = supabase.storage.from_("inspection-photos").upload(
                f"canvas/{filename}",
                image_bytes,
                {"content-type": "image/png", "upsert": "true"}
            )
            print(f"✅ Uploaded canvas to storage: canvas/{filename}")
        except Exception as upload_error:
            print(f"❌ Upload error: {upload_error}")
            raise HTTPException(status_code=500, detail=f"Failed to upload canvas: {str(upload_error)}")
        
        # Get public URL
        public_url = supabase.storage.from_("inspection-photos").get_public_url(f"canvas/{filename}")
        print(f"🎨 Canvas URL: {public_url}")
        
        # Update all photos in the group with the canvas URL
        updated_count = 0
        for photo_id in request.group_photo_ids:
            try:
                supabase.table("PhotoReport")\
                    .update({"CanvasPhotoURL": public_url})\
                    .eq("PhotoID", photo_id)\
                    .execute()
                updated_count += 1
                print(f"✅ Updated photo {photo_id} with canvas URL")
            except Exception as e:
                print(f"⚠️ Failed to update photo {photo_id}: {e}")
        
        return {
            "success": True,
            "message": "Canvas saved successfully",
            "canvas_url": public_url,
            "updated_photos": updated_count,
            "photo_ids": request.group_photo_ids
        }
    
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ Error saving canvas: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================================
# Remove AI Endpoint
# ======================================================================

@router.delete("/remove-ai/{photo_id}")
async def remove_ai_findings(photo_id: int):
    """Remove AI-generated findings, recommendations, and annotated image"""
    try:
        # Get current photo data
        photo_response = supabase.table("PhotoReport")\
            .select("FindingID, RecommendID, AnnotatedPhotoURL")\
            .eq("PhotoID", photo_id)\
            .execute()
        
        if not photo_response.data or len(photo_response.data) == 0:
            raise HTTPException(status_code=404, detail=f"Photo {photo_id} not found")
        
        photo_data = photo_response.data[0]
        finding_id = photo_data.get("FindingID")
        recommend_id = photo_data.get("RecommendID")
        annotated_url = photo_data.get("AnnotatedPhotoURL")
        
        # Delete Finding if exists
        if finding_id:
            try:
                supabase.table("Finding").delete().eq("FindingID", finding_id).execute()
                print(f"✅ Deleted Finding {finding_id}")
            except Exception as e:
                print(f"⚠️ Could not delete Finding: {e}")
        
        # Delete Recommendation if exists
        if recommend_id:
            try:
                supabase.table("Recommendation").delete().eq("RecommendID", recommend_id).execute()
                print(f"✅ Deleted Recommendation {recommend_id}")
            except Exception as e:
                print(f"⚠️ Could not delete Recommendation: {e}")
        
        # Delete annotated image from storage if exists
        if annotated_url:
            try:
                filename = annotated_url.split("/")[-1]
                supabase.storage.from_("inspection-photos").remove([f"annotated/{filename}"])
                print(f"✅ Deleted annotated image {filename}")
            except Exception as e:
                print(f"⚠️ Could not delete annotated image: {e}")
        
        # Update PhotoReport - clear all AI-related fields
        update_data = {
            "FindingID": None,
            "RecommendID": None,
            "AnnotatedPhotoURL": None,
            "AIDetectionDate": None,
            "DetectionConfidence": None
        }
        
        supabase.table("PhotoReport")\
            .update(update_data)\
            .eq("PhotoID", photo_id)\
            .execute()
        
        print(f"✅ Cleared AI data for photo {photo_id}")
        
        return {
            "success": True,
            "message": "AI findings removed successfully",
            "photo_id": photo_id
        }
    
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ Error removing AI findings: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================================
# Remove Canvas Endpoint
# ======================================================================

@router.delete("/remove-canvas/{photo_id}")
async def remove_canvas(photo_id: int):
    """Remove canvas annotation from a photo"""
    try:
        # Get current photo data
        photo_response = supabase.table("PhotoReport")\
            .select("CanvasPhotoURL")\
            .eq("PhotoID", photo_id)\
            .execute()
        
        if not photo_response.data:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        photo_data = photo_response.data[0]
        canvas_url = photo_data.get("CanvasPhotoURL")
        
        # Delete canvas image from storage if exists
        if canvas_url:
            try:
                filename = canvas_url.split("/")[-1]
                supabase.storage.from_("inspection-photos").remove([f"canvas/{filename}"])
                print(f"✅ Deleted canvas image {filename}")
            except Exception as e:
                print(f"⚠️ Could not delete canvas image: {e}")
        
        # Clear CanvasPhotoURL from database
        supabase.table("PhotoReport")\
            .update({"CanvasPhotoURL": None})\
            .eq("PhotoID", photo_id)\
            .execute()
        
        print(f"✅ Cleared canvas data for photo {photo_id}")
        
        return {
            "success": True,
            "message": "Canvas removed successfully",
            "photo_id": photo_id
        }
    
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ Error removing canvas: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
