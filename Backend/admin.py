# admin.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY")

if not url:
    raise ValueError("SUPABASE_URL environment variable is not set.")
if not key:
    raise ValueError("SUPABASE_ANON_KEY environment variable is not set.")

supabase: Client = create_client(url, key)

router = APIRouter(prefix="/admin", tags=["Admin Management"])

# ---------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------

class AdminBase(BaseModel):
    FullName: Optional[str] = None
    PhoneNo: Optional[str] = None
    Address: Optional[str] = None
    Photo: Optional[str] = None


class AdminCreate(AdminBase):
    UserID: int
    FullName: str  # required


class AdminUpdate(AdminBase):
    pass


# ---------------------------------------------------------
# API Routes
# ---------------------------------------------------------

# 8️⃣ Get Admin Dashboard Stats
@router.get("/stats")
def get_dashboard_stats():
    # Helper to safely get count
    def get_count(table_name, key="Status", value=None):
        try:
            query = supabase.table(table_name).select("InspectionID" if table_name == "Inspection" else "UserID", count="exact")
            if value:
                query = query.eq(key, value)
            res = query.execute()
            # If head=True is problematic, we use count from body, or length of data
            return res.count if res.count is not None else (len(res.data) if res.data else 0)
        except Exception:
            return 0

    try:
        total_inspections = get_count("Inspection")
        pending_reports = get_count("Inspection", "Status", "Pending")
        
        # Count "Completed" + "Approved"
        completed_count = get_count("Inspection", "Status", "Completed")
        approved_count = get_count("Inspection", "Status", "Approved")
        total_completed = completed_count + approved_count

        active_inspectors = get_count("Inspector")

        return {
            "total_inspections": total_inspections,
            "pending_reports": pending_reports,
            "completed_reports": total_completed, # Added field
            "active_inspectors": active_inspectors
        }
    except Exception as e:
        return {
            "total_inspections": 0,
            "pending_reports": 0,
            "completed_reports": 0,
            "active_inspectors": 0,
            "error": str(e)
        }



# 9️⃣ Approve Report (Transaction: Update Status, Comment, & Notify)
class ApproveRequest(BaseModel):
    inspection_id: int
    admin_name: str

@router.post("/approve_report")
def approve_report_action(req: ApproveRequest):
    try:
        # 1. Fetch Inspection Details (to get Inspector ID and ReportNo)
        insp_res = supabase.table("Inspection").select("ReportNo, UserID_Inspector").eq("InspectionID", req.inspection_id).execute()
        if not insp_res.data:
            raise HTTPException(status_code=404, detail="Inspection not found")
        
        inspection = insp_res.data[0]
        report_no = inspection["ReportNo"]
        inspector_id = inspection["UserID_Inspector"]
        
        # 2. Fetch Inspector's AuthUUID (for Notification)
        # Inspector table links UserID to User table
        user_res = supabase.table("User").select("AuthUUID").eq("UserID", inspector_id).execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="Inspector User not found")
        
        inspector_uuid = user_res.data[0]["AuthUUID"]
        
        # 3. Update Inspection Status
        supabase.table("Inspection").update({"Status": "Approved"}).eq("InspectionID", req.inspection_id).execute()
        
        # 4. Update Report Comment
        comment = f"{req.admin_name} approved the report {report_no}."
        # Check if report entry exists, update it.
        # Note: Report table usually has same ID as InspectionID if 1:1, or we query by InspectionID
        supabase.table("Report").update({"Comment": comment}).eq("InspectionID", req.inspection_id).execute()
        
        # 5. Send Notification
        notif_data = {
            "UserID": inspector_uuid,
            "Message": f"Your report {report_no} has been approved by {req.admin_name}.",
            "Type": "success",
            "IsRead": False
        }
        supabase.table("Notification").insert(notif_data).execute()
        
        return {"message": "Report approved and inspector notified"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 1️⃣ Get all admins
@router.get("/")
def get_all_admins():
    try:
        response = supabase.table("Admin").select("*").execute()
        return response.data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 2️⃣ Get admin by UserID
@router.get("/{user_id}")
def get_admin(user_id: int):
    try:
        response = (
            supabase.table("Admin")
            .select("*")
            .eq("UserID", user_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Admin not found")

        return response.data[0]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 3️⃣ Insert new admin
@router.post("/")
def create_admin(admin: AdminCreate):
    try:
        new_data = admin.dict()

        response = (
            supabase.table("Admin")
            .insert(new_data)
            .execute()
        )

        return {
            "message": "Admin created successfully",
            "data": response.data[0]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 4️⃣ Update admin details
@router.put("/{user_id}")
def update_admin(user_id: int, admin: AdminUpdate):
    try:
        update_data = {k: v for k, v in admin.dict().items() if v is not None}

        response = (
            supabase.table("Admin")
            .update(update_data)
            .eq("UserID", user_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Admin not found or update failed")

        return {
            "message": "Admin updated successfully",
            "data": response.data[0]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# User Management Routes
# ---------------------------------------------------------

# 5️⃣ Get All Users (Admin View)
@router.get("/users/all")
def get_all_users():
    try:
        # Fetch Users
        response = supabase.table("User").select("*").execute()
        users = response.data
        
        result = []
        for u in users:
            uid = u["UserID"]
            role = "unknown"
            name = u.get("UserName", "User")
            
            # Check Inspector
            insp = supabase.table("Inspector").select("FullName").eq("UserID", uid).execute()
            if insp.data:
                role = "inspector"
                name = insp.data[0]["FullName"]
            
            # Check Admin
            adm = supabase.table("Admin").select("FullName").eq("UserID", uid).execute()
            if adm.data:
                role = "admin"
                name = adm.data[0]["FullName"]
                
            result.append({
                "id": uid,
                "name": name,
                "email": u["Email"],
                "role": role
            })
            
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str # 'admin' or 'inspector'

# 6️⃣ Create User (Admin Action)
@router.post("/users")
def create_user_by_admin(user: CreateUserRequest):
    try:
        # 1. Supabase Auth Create (Admin API usually required, but we use client here)
        # Note: server-side auth might require service_role key for admin actions without sending emails etc.
        # For this demo, we use basic sign_up.
        
        auth_response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password
        })
        
        if not auth_response.user:
             # It might return none if email confirm is on. We assume auto-confirm for now or handle it.
             # If user exists, it throws.
             pass

        user_uuid = auth_response.user.id if auth_response.user else "temp_uuid"

        # 2. Insert into User Table
        new_user = (
            supabase.table("User")
            .insert({
                "UserName": user.name,
                "Email": user.email,
                "AuthUUID": user_uuid
            })
            .execute()
        )
        
        if not new_user.data:
             raise HTTPException(status_code=500, detail="DB Insert Failed")
             
        user_id = new_user.data[0]["UserID"]
        
        # 3. Add to Role Table
        if user.role == "admin":
             supabase.table("Admin").insert({"UserID": user_id, "FullName": user.name}).execute()
        else:
             supabase.table("Inspector").insert({"UserID": user_id, "FullName": user.name}).execute()
             
        return {"message": "User created successfully", "userId": user_id}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# 7️⃣ Delete User
@router.delete("/users/{user_id}")
def delete_user(user_id: int):
    try:
        response = supabase.table("User").delete().eq("UserID", user_id).execute()
        return {"message": "User deleted (SQL only)"}

    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))
# 🔟 Get Equipment Defect Stats
@router.get("/stats/equipment")
def get_equipment_defect_stats(year: Optional[str] = None):
    try:
        # 1. Get all equipment
        vessels_res = supabase.table("Equipment").select("EquipID, EquipDescription").execute()
        vessels = vessels_res.data
        if not vessels:
            return []
            
        # print(f"[Stats] Found {len(vessels)} equipment items")
        stats_map = {}
        equip_id_map = {}

        # Define categories
        categories = ["corrosion", "dents", "scratch_mark", "welding_defects"]

        for v in vessels:
            eid = v["EquipID"]
            name = v["EquipDescription"]
            equip_id_map[eid] = name
            stats_map[eid] = {
                "name": name, 
                "total": 0, 
                **{cat: 0 for cat in categories}
            }

        # 2. Get all InspectionIDs linked to these EquipIDs (Filtered by Year)
        # Map InspectionID -> EquipID
        insp_query = supabase.table("Inspection").select("InspectionID, EquipID, ReportDate")
        
        if year and year.isdigit():
            start_date = f"{year}-01-01"
            end_date = f"{year}-12-31"
            insp_query = insp_query.gte("ReportDate", start_date).lte("ReportDate", end_date)
            
        insp_res = insp_query.execute()
        
        insp_map = {} # InspectionID -> EquipID
        processed_inspection_ids = []
        
        if insp_res.data:
            for i in insp_res.data:
                insp_map[i["InspectionID"]] = i["EquipID"]
                processed_inspection_ids.append(i["InspectionID"])
        
        if not processed_inspection_ids:
            # If no inspections found for this year, return empty stats (with zeroes)
            return list(stats_map.values())

        # 3. Get all Photos with Findings (where Description is not null)
        # Filter by the relevant Inspection IDs to optimize
        # Supabase 'in' query supports list
        photo_res = supabase.table("PhotoReport")\
            .select("InspectionID, Finding(Description)")\
            .not_.is_("FindingID", "null")\
            .in_("InspectionID", processed_inspection_ids)\
            .execute()
            
        if photo_res.data:
            for p in photo_res.data:
                # Get inspection ID for this photo
                insp_id = p.get("InspectionID")
                # Get Equipment ID for this inspection
                equip_id = insp_map.get(insp_id)
                
                # If valid equipment found
                if equip_id and equip_id in stats_map:
                    finding = p.get("Finding")
                    if finding and finding.get("Description"):
                        desc = finding["Description"].lower()
                        
                        # Increment Total
                        stats_map[equip_id]["total"] += 1
                        
                        # Increment Categories
                        if "corrosion" in desc or "rust" in desc:
                            stats_map[equip_id]["corrosion"] += 1
                        elif "dent" in desc or "deformation" in desc:
                            stats_map[equip_id]["dents"] += 1
                        elif "scratch" in desc or "mark" in desc or "paint" in desc:
                            stats_map[equip_id]["scratch_mark"] += 1
                        elif "weld" in desc:
                            stats_map[equip_id]["welding_defects"] += 1

        # Convert map to list
        stats = list(stats_map.values())
        
        # Sort by total defects descending
        stats.sort(key=lambda x: x["total"], reverse=True)
        
        return stats

    except Exception as e:
        print(f"Error fetching equipment stats: {e}")
        import traceback
        traceback.print_exc()
        return []
