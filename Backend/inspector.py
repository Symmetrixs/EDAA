# inspector.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY")

if not url:
    raise ValueError("SUPABASE_URL environment variable is not set.")
if not key:
    raise ValueError("SUPABASE_ANON_KEY environment variable is not set.")

supabase: Client = create_client(url, key)

router = APIRouter(prefix="/inspector", tags=["Inspector Management"])

# ---------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------

class InspectorBase(BaseModel):
    FullName: Optional[str] = None
    PhoneNo: Optional[str] = None
    Address: Optional[str] = None
    Photo: Optional[str] = None


class InspectorCreate(InspectorBase):
    UserID: int
    FullName: str


class InspectorUpdate(InspectorBase):
    pass


# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

# 1️⃣ Get all inspectors
@router.get("/")
def get_all_inspectors():
    try:
        response = supabase.table("Inspector").select("*").execute()
        return response.data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 2️⃣ Get inspector by UserID
@router.get("/{user_id}")
def get_inspector(user_id: int):
    try:
        response = (
            supabase.table("Inspector")
            .select("*")
            .eq("UserID", user_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Inspector not found")

        return response.data[0]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 3️⃣ Insert new inspector
@router.post("/")
def create_inspector(inspector: InspectorCreate):
    try:
        new_data = inspector.dict()

        response = (
            supabase.table("Inspector")
            .insert(new_data)
            .execute()
        )

        return {
            "message": "Inspector created successfully",
            "data": response.data[0]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 4️⃣ Update inspector details
@router.put("/{user_id}")
def update_inspector(user_id: int, inspector: InspectorUpdate):
    try:
        update_data = {k: v for k, v in inspector.dict().items() if v is not None}

        response = (
            supabase.table("Inspector")
            .update(update_data)
            .eq("UserID", user_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Inspector not found or update failed")

        return {
            "message": "Inspector updated successfully",
            "data": response.data[0]
        }

    except Exception as e:
        print(f"Update Error: {e}") # Debug log
        raise HTTPException(status_code=500, detail=str(e))

# 5️⃣ Get Inspector Stats (Dashboard)
@router.get("/{user_id}/stats")
def get_inspector_stats(user_id: int):
    # Helper to safely get count
    def get_count_by_user(userid, value=None):
        try:
            query = supabase.table("Inspection").select("InspectionID", count="exact").eq("UserID_Inspector", userid)
            if value:
                # If value is a list, use in_
                if isinstance(value, list):
                     query = query.in_("Status", value)
                else:
                     query = query.eq("Status", value)
            res = query.execute()
            return res.count if res.count is not None else (len(res.data) if res.data else 0)
        except Exception:
            return 0

    try:
        total_inspections = get_count_by_user(user_id)
        pending_reports = get_count_by_user(user_id, "Pending")
        
        # Completed = Approved + Completed
        completed_reports = get_count_by_user(user_id, ["Approved", "Completed"])

        return {
            "total_inspections": total_inspections,
            "pending_reports": pending_reports,
            "completed_reports": completed_reports
        }
    except Exception as e:
        return {
            "total_inspections": 0,
            "pending_reports": 0,
            "completed_reports": 0,
            "error": str(e)
        }
