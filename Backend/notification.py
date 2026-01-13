
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Initialize Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY")

if not url:
    raise ValueError("SUPABASE_URL environment variable is not set.")
if not key:
    raise ValueError("SUPABASE_ANON_KEY environment variable is not set.")

supabase: Client = create_client(url, key)

router = APIRouter(prefix="/notification", tags=["Notifications"])

# ---------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------

class NotificationBase(BaseModel):
    UserID: str # UUID
    Message: str
    Type: Optional[str] = "info" # info, success, warning, error
    IsRead: Optional[bool] = False

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    NotificationID: int
    CreatedAt: str

# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

# 1. Get Notifications for a User
@router.get("/{user_id}")
def get_notifications(user_id: str):
    try:
        response = (
            supabase.table("Notification")
            .select("*")
            .eq("UserID", user_id)
            .order("CreatedAt", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. Mark Notification as Read
@router.put("/{notification_id}/read")
def mark_as_read(notification_id: int):
    try:
        response = (
            supabase.table("Notification")
            .update({"IsRead": True})
            .eq("NotificationID", notification_id)
            .execute()
        )
        if not response.data:
             raise HTTPException(status_code=404, detail="Notification not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 3. Create Notification (System use)
@router.post("/")
def create_notification(notification: NotificationCreate):
    try:
        data = notification.dict()
        # Ensure CreatedAt is handled by DB default or add here if needed
        response = (
            supabase.table("Notification")
            .insert(data)
            .execute()
        )
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4. Delete Notification
@router.delete("/{notification_id}")
def delete_notification(notification_id: int):
    try:
        response = (
            supabase.table("Notification")
            .delete()
            .eq("NotificationID", notification_id)
            .execute()
        )
        return {"message": "Notification deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
