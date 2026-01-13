# ai_detection.py
"""
AI Detection Module - Hugging Face Space Integration
Handles defect detection by calling external Hugging Face Space API
This version does NOT load the model locally - saves 2-4GB RAM!
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import traceback
import requests

load_dotenv()

router = APIRouter(prefix="/ai-detection", tags=["AI Detection"])

# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

# URL to your Hugging Face Space API
# After deploying, update this with your actual Space URL
HF_SPACE_URL = os.environ.get(
    "HF_SPACE_URL",
    "https://symmetrixs-edaa.hf.space"
)

# Timeout for API requests (seconds)
API_TIMEOUT = 120

# Confidence threshold for detections
CONFIDENCE_THRESHOLD = float(os.environ.get("DETECTION_CONFIDENCE", "0.5"))

DEFECT_MAPPINGS = {
    "corrosion": {
        "finding": "Surface corrosion and rust detected on metal surface.",
        "recommendation": "Clean affected area and apply anti-corrosion coating. Monitor for progression."
    },
    "dents": {
        "finding": "Surface deformation/dent observed on structure.",
        "recommendation": "Assess depth and structural impact. Repair or replace if compromising integrity."
    },
    "scratch_mark": {
        "finding": "Scratch marks detected on surface.",
        "recommendation": "Evaluate depth. Apply protective coating if surface integrity is compromised."
    },
    "welding_defects": {
        "finding": "Weld irregularity or defect detected.",
        "recommendation": "Inspect weld quality. Re-weld if structural integrity is at risk."
    },
    "no_defect": {
        "finding": "No significant defects detected.",
        "recommendation": "Maintain routine monitoring and scheduled inspections."
    }
}

# ---------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------

class Detection(BaseModel):
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]

class DetectionResult(BaseModel):
    photo_id: int
    detections: List[Detection]
    finding: str
    recommendation: str
    detection_count: int
    annotated_image_base64: Optional[str] = None

class BatchDetectionRequest(BaseModel):
    photo_ids: List[int]
    photo_urls: List[str]
    category: str

# ---------------------------------------------------------
# API Client Functions
# ---------------------------------------------------------

def call_hf_space_api(endpoint: str, **kwargs):
    """
    Call Hugging Face Space API
    
    Args:
        endpoint: API endpoint (e.g., "/detect-by-url")
        **kwargs: Additional arguments to pass to requests
    
    Returns:
        API response JSON
    """
    try:
        url = f"{HF_SPACE_URL}{endpoint}"
        
        # Add timeout if not specified
        if 'timeout' not in kwargs:
            kwargs['timeout'] = API_TIMEOUT
        
        response = requests.post(url, **kwargs)
        response.raise_for_status()
        
        return response.json()
    
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="AI detection service timeout. Please try again."
        )
    except requests.exceptions.RequestException as e:
        print(f"❌ HF Space API error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"AI detection service unavailable: {str(e)}"
        )

def detect_by_url_remote(photo_url: str) -> dict:
    """
    Detect defects by calling HF Space with image URL
    
    Args:
        photo_url: URL to image (Supabase storage URL)
    
    Returns:
        Detection result dict
    """
    try:
        result = call_hf_space_api(
            "/detect-by-url",
            data={"photo_url": photo_url}
        )
        return result
    
    except Exception as e:
        print(f"❌ Detection failed for URL {photo_url}: {e}")
        # Return empty detection on failure
        return {
            "success": False,
            "detections": [],
            "finding": "Detection failed. Please review manually.",
            "recommendation": "Manual inspection required.",
            "detection_count": 0,
            "annotated_image_base64": None
        }

def detect_by_file_remote(file_content: bytes, filename: str) -> dict:
    """
    Detect defects by uploading file to HF Space
    
    Args:
        file_content: Image file bytes
        filename: Original filename
    
    Returns:
        Detection result dict
    """
    try:
        files = {"file": (filename, file_content, "image/jpeg")}
        result = call_hf_space_api(
            "/detect-single",
            files=files
        )
        return result
    
    except Exception as e:
        print(f"❌ Detection failed for file {filename}: {e}")
        return {
            "success": False,
            "detections": [],
            "finding": "Detection failed. Please review manually.",
            "recommendation": "Manual inspection required.",
            "detection_count": 0,
            "annotated_image_base64": None
        }

# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

@router.get("/health")
def health_check():
    """Check if AI detection service is running"""
    try:
        # Ping the HF Space health endpoint
        response = requests.get(f"{HF_SPACE_URL}/health", timeout=10)
        hf_status = response.json()
        
        return {
            "status": "healthy",
            "hf_space_url": HF_SPACE_URL,
            "hf_space_status": hf_status,
            "connection": "ok"
        }
    except Exception as e:
        return {
            "status": "error",
            "hf_space_url": HF_SPACE_URL,
            "error": str(e),
            "connection": "failed"
        }

@router.post("/detect-single")
async def detect_single_image(file: UploadFile = File(...)):
    """
    Detect defects in a single uploaded image
    Forwards request to HF Space API
    """
    try:
        # Read file content
        content = await file.read()
        
        # Send to HF Space
        result = detect_by_file_remote(content, file.filename)
        
        return result
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

@router.post("/detect-by-url")
def detect_by_url(photo_url: str):
    """
    Detect defects in an image from a URL (Supabase storage)
    Forwards request to HF Space API
    """
    try:
        result = detect_by_url_remote(photo_url)
        return result
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

@router.post("/detect-batch")
def detect_batch(request: BatchDetectionRequest):
    """
    Detect defects in multiple photos at once
    Forwards batch request to HF Space API
    """
    try:
        # Send entire batch to HF Space
        result = call_hf_space_api(
            "/detect-batch",
            json={
                "photo_ids": request.photo_ids,
                "photo_urls": request.photo_urls,
                "category": request.category
            }
        )
        
        return result
    
    except Exception as e:
        traceback.print_exc()
        # If batch fails, try one by one
        print("⚠️ Batch detection failed, trying one by one...")
        
        results = []
        for photo_id, photo_url in zip(request.photo_ids, request.photo_urls):
            try:
                detection_result = detect_by_url_remote(photo_url)
                
                result = DetectionResult(
                    photo_id=photo_id,
                    detections=[Detection(**d) for d in detection_result.get("detections", [])],
                    finding=detection_result.get("finding", "Detection failed"),
                    recommendation=detection_result.get("recommendation", "Manual inspection required"),
                    detection_count=detection_result.get("detection_count", 0),
                    annotated_image_base64=detection_result.get("annotated_image_base64")
                )
                results.append(result)
            
            except Exception as e:
                print(f"❌ Error detecting photo {photo_id}: {e}")
                results.append(DetectionResult(
                    photo_id=photo_id,
                    detections=[],
                    finding="Detection failed. Please review manually.",
                    recommendation="Manual inspection required.",
                    detection_count=0,
                    annotated_image_base64=None
                ))
        
        return {
            "success": True,
            "processed": len(results),
            "results": [r.dict() for r in results]
        }

@router.get("/defect-types")
def get_defect_types():
    """Get list of all detectable defect types"""
    return {
        "defect_types": list(DEFECT_MAPPINGS.keys()),
        "mappings": DEFECT_MAPPINGS
    }

@router.get("/test-connection")
def test_hf_connection():
    """Test connection to Hugging Face Space"""
    try:
        response = requests.get(f"{HF_SPACE_URL}/", timeout=10)
        return {
            "status": "success",
            "hf_space_url": HF_SPACE_URL,
            "response": response.json()
        }
    except Exception as e:
        return {
            "status": "failed",
            "hf_space_url": HF_SPACE_URL,
            "error": str(e)
        }
