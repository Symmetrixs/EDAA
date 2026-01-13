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

router = APIRouter(prefix="/team", tags=["Team Management"])

# ---------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------

class TeamCreate(BaseModel):
    InspectionID: int

class TeamMemberAdd(BaseModel):
    TeamID: int
    UserID: int

# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

# 1. Create Team (usually when Inspection is created or manually)
@router.post("/", status_code=201)
def create_team(team: TeamCreate):
    try:
        # Check if team already exists for this inspection
        existing = supabase.table("Team").select("*").eq("InspectionID", team.InspectionID).execute()
        if existing.data:
            return existing.data[0] # Return existing team

        new_data = team.dict()
        response = supabase.table("Team").insert(new_data).execute()
        
        if not response.data:
             raise HTTPException(status_code=500, detail="Failed to create team")
        
        return response.data[0]
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# 2. Add Member to Team
@router.post("/member", status_code=201)
def add_team_member(member: TeamMemberAdd):
    try:
        # Check if already a member
        existing = (
            supabase.table("Inspector_Team")
            .select("*")
            .eq("TeamID", member.TeamID)
            .eq("UserID", member.UserID)
            .execute()
        )
        if existing.data:
             raise HTTPException(status_code=400, detail="User is already in this team")

        new_data = member.dict()
        response = supabase.table("Inspector_Team").insert(new_data).execute()
        
        if not response.data:
             raise HTTPException(status_code=500, detail="Failed to add member")
             
        # --- Notification Logic ---
        try:
            # 1. Get InspectionID from Team
            team_res = supabase.table("Team").select("InspectionID").eq("TeamID", member.TeamID).execute()
            if team_res.data:
                inspection_id = team_res.data[0]["InspectionID"]
                
                # 2. Get ReportNo from Inspection
                insp_res = supabase.table("Inspection").select("ReportNo").eq("InspectionID", inspection_id).execute()
                report_no = insp_res.data[0]["ReportNo"] if insp_res.data else "Unknown"

                # 3. Get AuthUUID
                user_res = supabase.table("User").select("AuthUUID").eq("UserID", member.UserID).execute()
                
                if user_res.data and user_res.data[0]["AuthUUID"]:
                    auth_uuid = user_res.data[0]["AuthUUID"]
                    
                    msg = f"You have been added to the team for Inspection {report_no}."
                    
                    supabase.table("Notification").insert({
                        "UserID": auth_uuid,
                        "Message": msg,
                        "Type": "success",
                        "IsRead": False 
                    }).execute()
                    
        except Exception as notif_err:
             print(f"Notification Error: {notif_err}") # Non-blocking error
        
        return response.data[0]
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# 3. Remove Member from Team
@router.delete("/member/{team_id}/{user_id}")
def remove_team_member(team_id: int, user_id: int):
    try:
        response = (
            supabase.table("Inspector_Team")
            .delete()
            .eq("TeamID", team_id)
            .eq("UserID", user_id)
            .execute()
        )
        # Verify deletion? Supabase delete doesn't always return data if empty, but usually fine.
        return {"message": "Member removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4. Get Team by Inspection ID
@router.get("/inspection/{inspection_id}")
def get_team_by_inspection(inspection_id: int):
    try:
        response = supabase.table("Team").select("*").eq("InspectionID", inspection_id).execute()
        if not response.data:
             raise HTTPException(status_code=404, detail="Team not found for this inspection")
        return response.data[0]
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

# 5. Get Members of a Team (with Inspector Details)
@router.get("/{team_id}/members")
def get_team_members(team_id: int):
    try:
        # Step 1: Get UserIDs from Inspector_Team
        # We want to join with Inspector table. 
        # Supabase syntax: select("*, Inspector(FullName, PhoneNo, Photo)")
        # This assumes Foreign Key is set up correctly in DB: Inspector_Team.UserID -> Inspector.UserID
        
        response = (
            supabase.table("Inspector_Team")
            .select("*, Inspector(UserID, FullName, PhoneNo, Photo)")
            .eq("TeamID", team_id)
            .execute()
        )
        
        return response.data
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# 6. Get Inspections Shared With User (Where User is in Team)
@router.get("/shared/{user_id}")
def get_shared_inspections(user_id: int):
    try:
        # 1. Get Team IDs the user belongs to
        member_res = supabase.table("Inspector_Team").select("TeamID").eq("UserID", user_id).execute()
        if not member_res.data:
            return []
        
        team_ids = [m['TeamID'] for m in member_res.data]
        
        # 2. Get InspectionInfos for these Teams
        # We also want the Report data if available.
        # Structure: Team -> InspectionID
        team_res = supabase.table("Team").select("InspectionID").in_("TeamID", team_ids).execute()
        if not team_res.data:
            return []
            
        inspection_ids = [t['InspectionID'] for t in team_res.data]
        
        # 3. Get Inspection Details + Report
        # Query Inspection table, include Report info (if any)
        # Note: 'Report' table has FK InspectionID.
        # Supabase Reverse Join: select("*, Report(*)")
        response = (
            supabase.table("Inspection")
            .select("*, Report(*)")
            .in_("InspectionID", inspection_ids)
            .execute()
        )
        
        return response.data
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
