# vessel.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

router = APIRouter(prefix="/vessel", tags=["Vessel / Equipment"])

# ---------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------

class VesselBase(BaseModel):
    EquipDescription: Optional[str] = None
    EquipType: Optional[str] = None
    TagNo: Optional[str] = None
    PlantName: Optional[str] = None
    DOSH: Optional[str] = None
    Photo: Optional[str] = None
    Last_Inspection_Date: Optional[str] = None
    Next_Inspection_Date: Optional[str] = None


class VesselCreate(VesselBase):
    EquipDescription: str
    EquipType: str
    TagNo: str
    PlantName: str
    DOSH: str


class VesselUpdate(VesselBase):
    pass


# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

# 1️⃣ Get all vessels
@router.get("/")
def get_all_vessels():
    try:
        response = supabase.table("Equipment").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 2️⃣ Get vessel by ID
@router.get("/{equip_id}")
def get_single_vessel(equip_id: int):
    try:
        response = (
            supabase.table("Equipment")
            .select("*")
            .eq("EquipID", equip_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Vessel not found")

        return response.data[0]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 3️⃣ Insert new vessel
@router.post("/")
def create_vessel(vessel: VesselCreate):
    try:
        new_data = vessel.dict()

        response = (
            supabase.table("Equipment")
            .insert(new_data)
            .execute()
        )

        return {
            "message": "Vessel added successfully",
            "data": response.data[0]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 4️⃣ Update existing vessel
@router.put("/{equip_id}")
def update_vessel(equip_id: int, vessel: VesselUpdate):
    try:
        update_data = {k: v for k, v in vessel.dict().items() if v is not None}

        response = (
            supabase.table("Equipment")
            .update(update_data)
            .eq("EquipID", equip_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Vessel not found or update failed")

        return {
            "message": "Vessel updated successfully",
            "data": response.data[0]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 5️⃣ Delete vessel
@router.delete("/{equip_id}")
def delete_vessel(equip_id: int):
    try:
        response = (
            supabase.table("Equipment")
            .delete()
            .eq("EquipID", equip_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Vessel not found")

        return {"message": "Vessel deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
