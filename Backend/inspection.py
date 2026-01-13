from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import traceback

load_dotenv()

# Initialize Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY")

if not url:
    raise ValueError("SUPABASE_URL environment variable is not set.")
if not key:
    raise ValueError("SUPABASE_ANON_KEY environment variable is not set.")

supabase: Client = create_client(url, key)

router = APIRouter(prefix="/inspection", tags=["Inspection"])

# ---------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------

class InspectionBase(BaseModel):
    EquipID: int
    UserID_Inspector: int
    ReportNo: str
    ReportDate: str
    Findings: Optional[str] = None
    Post_Final_Inspection: Optional[str] = None
    NDTs: Optional[str] = None
    Recommendations: Optional[str] = None
    Status: Optional[str] = "Pending"

class InspectionCreate(InspectionBase):
    pass

class InspectionUpdate(BaseModel):
    EquipID: Optional[int] = None
    UserID_Inspector: Optional[int] = None
    ReportNo: Optional[str] = None
    ReportDate: Optional[str] = None
    Findings: Optional[str] = None
    Post_Final_Inspection: Optional[str] = None
    NDTs: Optional[str] = None
    Recommendations: Optional[str] = None
    Status: Optional[str] = None

# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

# 1. Create Inspection
@router.post("/", status_code=201)
def create_inspection(inspection: InspectionCreate):
    try:
        new_data = inspection.dict()
        print(f"Creating Inspection with data: {new_data}")
        
        response = (
            supabase.table("Inspection")
            .insert(new_data)
            .execute()
        )
        
        print(f"Supabase Response: {response}")
        
        if not response.data:
             # Fallback: if data is empty, maybe try to fetch it or just return what we have
             # But usually insert returns data. If not, it might be an error or policy issue.
             print("Warning: No data returned from insert.")
             pass

        if response.data:
            return response.data[0]
        else:
             # If successful but no data returned (unlikely with default supabase-py unless minimal),
             # we at least want to return 201.
             return {"message": "Inspection created (no data returned)", "request_data": new_data}

    except Exception as e:
        traceback.print_exc()
        print(f"Error creating inspection: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create inspection: {str(e)}")

# 2. Get All Inspections
@router.get("/")
def get_all_inspections():
    try:
        # Order by InspectionID DESC to show newest first
        response = (
            supabase.table("Inspection")
            .select("*, Equipment(*)")
            .order("InspectionID", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2b. Get Inspections by User ID
@router.get("/user/{user_id}")
def get_inspections_by_user(user_id: int):
    try:
        response = (
            supabase.table("Inspection")
            .select("*, Equipment(*)")
            .eq("UserID_Inspector", user_id)
            .order("InspectionID", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 3. Get Inspection by ID
@router.get("/{inspection_id}")
def get_inspection(inspection_id: int):
    try:
        response = (
            supabase.table("Inspection")
            .select("*")
            .eq("InspectionID", inspection_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Inspection not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4. Update Inspection
@router.put("/{inspection_id}")
def update_inspection(inspection_id: int, inspection: InspectionUpdate):
    try:
        # Filter out None values to only update provided fields
        update_data = {k: v for k, v in inspection.dict().items() if v is not None}
        
        print(f"🔄 Updating Inspection {inspection_id} with data: {update_data}")
        
        response = (
            supabase.table("Inspection")
            .update(update_data)
            .eq("InspectionID", inspection_id)
            .execute()
        )
        if not response.data:
             raise HTTPException(status_code=404, detail="Inspection not found or update failed")
        
        updated_inspection = response.data[0]
        print(f"✅ Update successful: {updated_inspection}")
        
        # If status changed to "Completed", update equipment inspection dates
        if update_data.get("Status") == "Completed":
            try:
                equip_id = updated_inspection.get("EquipID")
                report_date = updated_inspection.get("ReportDate")
                
                if equip_id and report_date:
                    from datetime import datetime, timedelta
                    
                    # Parse the report date
                    last_inspection = datetime.strptime(report_date, "%Y-%m-%d")
                    # Calculate next inspection (1 year later)
                    next_inspection = last_inspection + timedelta(days=365)
                    
                    # Update equipment
                    equipment_update = {
                        "Last_Inspection_Date": report_date,
                        "Next_Inspection_Date": next_inspection.strftime("%Y-%m-%d")
                    }
                    
                    supabase.table("Equipment").update(equipment_update).eq("EquipID", equip_id).execute()
                    print(f"📅 Updated Equipment {equip_id}: Last={report_date}, Next={next_inspection.strftime('%Y-%m-%d')}")
            except Exception as equip_err:
                print(f"⚠️ Failed to update equipment dates: {equip_err}")
                # Don't fail the whole request if equipment update fails
        
        return updated_inspection
    except Exception as e:
        print(f"❌ Error updating inspection {inspection_id}: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# 5. Delete Inspection (Cascade)
@router.delete("/{inspection_id}")
def delete_inspection(inspection_id: int):
    try:
        # 1a. Handle Team Dependencies (Inspector_Team -> Team -> Inspection)
        # Fetch TeamIDs associated with this inspection
        teams = supabase.table("Team").select("TeamID").eq("InspectionID", inspection_id).execute()
        team_ids = [t['TeamID'] for t in teams.data] if teams.data else []

        if team_ids:
            # Delete Members first (Inspector_Team)
            supabase.table("Inspector_Team").delete().in_("TeamID", team_ids).execute()
            # Delete Teams second
            supabase.table("Team").delete().in_("TeamID", team_ids).execute()

        # 1b. Fetch associated photos to get FindingID and RecommendID
        photos = supabase.table("PhotoReport").select("FindingID, RecommendID").eq("InspectionID", inspection_id).execute()
        
        finding_ids = set()
        recommend_ids = set()
        
        if photos.data:
            for p in photos.data:
                if p.get("FindingID"):
                    finding_ids.add(p["FindingID"])
                if p.get("RecommendID"):
                    recommend_ids.add(p["RecommendID"])

        # 2a. Delete associated Report (if any)
        supabase.table("Report").delete().eq("InspectionID", inspection_id).execute()

        # 2b. Delete associated photos
        supabase.table("PhotoReport").delete().eq("InspectionID", inspection_id).execute()

        # 3. Delete Findings (if any)
        if finding_ids:
            supabase.table("Finding").delete().in_("FindingID", list(finding_ids)).execute()

        # 4. Delete Recommendations (if any)
        if recommend_ids:
            supabase.table("Recommendation").delete().in_("RecommendID", list(recommend_ids)).execute()

        # 5. Delete the inspection
        response = (
            supabase.table("Inspection")
            .delete()
            .eq("InspectionID", inspection_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Inspection not found")
        
        return {"message": "Inspection and all associated data (Teams, Reports, Photos, Findings, Recommendations) deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
