from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
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
router = APIRouter(prefix="/finding", tags=["Finding"])

# ---------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------

class FindingBase(BaseModel):
    Description: str

class FindingCreate(FindingBase):
    pass

class FindingUpdate(BaseModel):
    Description: Optional[str] = None

# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

# 1. Create Finding
@router.post("/", status_code=201)
def create_finding(finding: FindingCreate):
    try:
        new_data = finding.dict()
        response = supabase.table("Finding").insert(new_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create finding")
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. Get All Findings (Optional, for autocomplete)
@router.get("/")
def get_all_findings():
    try:
        response = supabase.table("Finding").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 3. Get Finding by ID
@router.get("/{finding_id}")
def get_finding(finding_id: int):
    try:
        response = supabase.table("Finding").select("*").eq("FindingID", finding_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Finding not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4. Update Finding
@router.put("/{finding_id}")
def update_finding(finding_id: int, finding: FindingUpdate):
    try:
        update_data = {k: v for k, v in finding.dict().items() if v is not None}
        response = supabase.table("Finding").update(update_data).eq("FindingID", finding_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Finding not found or update failed")
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 5. Delete Finding
@router.delete("/{finding_id}")
def delete_finding(finding_id: int):
    try:
        response = supabase.table("Finding").delete().eq("FindingID", finding_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Finding not found")
        return {"message": "Finding deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
