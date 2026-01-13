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
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

router = APIRouter(prefix="/recommendation", tags=["Recommendation"])

# ---------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------

class RecommendationBase(BaseModel):
    Description: str

class RecommendationCreate(RecommendationBase):
    pass

class RecommendationUpdate(BaseModel):
    Description: Optional[str] = None

# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

# 1. Create Recommendation
@router.post("/", status_code=201)
def create_recommendation(recommendation: RecommendationCreate):
    try:
        # Check for default "Nil"
        if recommendation.Description.strip().lower() in ["nil", "nil."]:
             # Return ID 1 without creating a new record
             # We construct the response manually to match expected DB structure
             return {
                 "RecommendID": 1,
                 "Description": "Nil"
             }

        new_data = recommendation.dict()
        response = supabase.table("Recommendation").insert(new_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create recommendation")
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. Get All Recommendations
@router.get("/")
def get_all_recommendations():
    try:
        response = supabase.table("Recommendation").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 3. Get Recommendation by ID
@router.get("/{recommend_id}")
def get_recommendation(recommend_id: int):
    try:
        response = supabase.table("Recommendation").select("*").eq("RecommendID", recommend_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4. Update Recommendation
@router.put("/{recommend_id}")
def update_recommendation(recommend_id: int, recommendation: RecommendationUpdate):
    try:
        update_data = {k: v for k, v in recommendation.dict().items() if v is not None}
        response = supabase.table("Recommendation").update(update_data).eq("RecommendID", recommend_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Recommendation not found or update failed")
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 5. Delete Recommendation
@router.delete("/{recommend_id}")
def delete_recommendation(recommend_id: int):
    try:
        response = supabase.table("Recommendation").delete().eq("RecommendID", recommend_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        return {"message": "Recommendation deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
