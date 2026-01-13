# auth.py
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import os
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY") 


if not url:
    raise ValueError("SUPABASE_URL environment variable is not set.")
if not key:
    raise ValueError("SUPABASE_ANON_KEY environment variable is not set.")

supabase: Client = create_client(url, key)
router = APIRouter(prefix="/auth", tags=["Authentication"])


# -----------------------
# Pydantic Models
# -----------------------
class UserRegister(BaseModel):
    email: str
    password: str
    username: str

class UserLogin(BaseModel):
    email: str
    password: str


# -----------------------
# REGISTER
# -----------------------
@router.post("/register")
def register(user: UserRegister):
    try:

        # 1️⃣ Check if email already exists in our database table
        existing_user = (
            supabase.table("User")
            .select("Email")
            .eq("Email", user.email)
            .execute()
        )
        if existing_user.data:
            raise HTTPException(
                status_code=400, 
                detail="User with this email already exists"
            )

        # 2️⃣ Create account inside Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password
        })

        if auth_response.user is None:
            raise HTTPException(status_code=400, detail="Supabase Auth failed")

        user_uuid = auth_response.user.id

        # 3️⃣ Insert into USER table (no password stored)
        new_user = (
            supabase.table("User")
            .insert({
                "UserName": user.username,
                "Email": user.email,
                "AuthUUID": user_uuid  # Store the UUID
            })
            .execute()
        )

        if not new_user.data:
            raise HTTPException(status_code=500, detail="Failed to insert user into database")

        user_id = new_user.data[0]["UserID"]

        # 4️⃣ Create default Inspector profile
        supabase.table("Inspector").insert({
            "UserID": user_id,
            "FullName": user.username,
            "PhoneNo": "",
            "Address": "",
            "Photo": ""
        }).execute()

        return {
            "message": "Registration successful",
            "user_id": user_id,
            "role": "inspector"
        }

    except Exception as e:
        print("REGISTER ERROR:", e)
        raise HTTPException(status_code=400, detail=str(e))


# -----------------------
# LOGIN
# -----------------------
@router.post("/login")
def login(user: UserLogin):
    try:
        # 1️⃣ Login through Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })

        if auth_response.session is None:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        email = auth_response.user.email
        user_uuid = auth_response.user.id

        # 2️⃣ Match to USER table
        # Strategy: Try finding by AuthUUID first (Reliable). Fallback to Email (Legacy/Migration).
        
        user_record = (
            supabase.table("User")
            .select("UserID", "Email", "AuthUUID")
            .eq("AuthUUID", user_uuid)
            .execute()
        )
        
        # If not found by UUID, try Email (Migration Step)
        if not user_record.data:
            print(f"User not found by UUID ({user_uuid}), trying Email ({email})...")
            user_record = (
                supabase.table("User")
                .select("UserID", "Email", "AuthUUID")
                .eq("Email", email)
                .execute()
            )
            
            if user_record.data:
                # Found by email! Link the UUID now for future reliability.
                user_id_found = user_record.data[0]["UserID"]
                print(f"Migrating User {user_id_found} to UUID {user_uuid}")
                supabase.table("User").update({"AuthUUID": user_uuid}).eq("UserID", user_id_found).execute()
        
        if not user_record.data:
            raise HTTPException(
                status_code=404,
                detail="User exists in Auth but missing in User table"
            )

        # Check if email needs sync (e.g. they changed email in Auth, but SQL has old one)
        # We rely on UUID now, so we can update SQL email safely if it differs.
        sql_email = user_record.data[0].get("Email")
        user_id = user_record.data[0]["UserID"]
        
        if sql_email != email:
            print(f"Syncing Email: SQL({sql_email}) -> Auth({email})")
            supabase.table("User").update({"Email": email}).eq("UserID", user_id).execute()

        role = "unknown"

        # 3️⃣ Check Admin table
        admin_check = (
            supabase.table("Admin")
            .select("UserID, FullName")
            .eq("UserID", user_id)
            .execute()
        )

        name = "User" # Default
        photo_url = None

        if admin_check.data:
            role = "admin"
            name = admin_check.data[0].get("FullName", "Admin")
            # Admin might not have photo column, skipping for now or add if schema has it
        else:
            # 4️⃣ Check Inspector table
            inspector_check = (
                supabase.table("Inspector")
                .select("UserID, FullName, Photo")
                .eq("UserID", user_id)
                .execute()
            )

            if inspector_check.data:
                role = "inspector"
                name = inspector_check.data[0].get("FullName", "Inspector")
                photo_url = inspector_check.data[0].get("Photo")

        return {
            "message": "Login successful",
            "access_token": auth_response.session.access_token,
            "user": {
                "id": user_id,
                "uuid": user_uuid,
                "email": email,
                "role": role,
                "name": name,
                "photo": photo_url
            }
        }

    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# -----------------------
# UPDATE PROFILE
# -----------------------
class UserUpdate(BaseModel):
    username: str | None = None
    email: str | None = None
    password: str | None = None

@router.get("/profile/{user_id}")
def get_profile(user_id: int):
    try:
        response = supabase.table("User").select("*").eq("UserID", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile/{user_id}")
def update_profile(user_id: int, user: UserUpdate, token: str = Header(None, alias="Authorization")):
    try:
        # Extract Bearer token
        if not token.startswith("Bearer "):
             raise HTTPException(status_code=401, detail="Invalid Authorization header format. Expected 'Bearer <token>'")
             
        jwt = token.replace("Bearer ", "").strip()
        
        if not jwt or len(jwt.split(".")) < 2:
            raise HTTPException(status_code=401, detail="Invalid Access Token. Please Log Out and Log In again.")

        # 1. Update Supabase Auth (Email / Password)
        # We need a client authenticated as the USER.
        # We can create a new client or use the existing one with the token?
        # supabase-py's `auth.update_user` works on the current session.
        # We can instantiate a temp client with the same URL/Key but set the session.
        
        # Temp Client
        # Fix: Use ClientOptions object, not dict
        authed_client = create_client(url, key, options=ClientOptions(headers={'Authorization': token}))
        
        auth_attrs = {}
        if user.email:
            auth_attrs["email"] = user.email
        if user.password:
            auth_attrs["password"] = user.password

        # Check if email is updated or pending
        email_message = ""
        
        if auth_attrs:
            # Fix: Explicitly set session for GoTrue to recognize the user
            # We use "dummy" for refresh_token as we only need access_token for this request
            authed_client.auth.set_session(jwt, "dummy_refresh_token")
            
            auth_response = authed_client.auth.update_user(auth_attrs)
            
            if not auth_response.user:
                 raise HTTPException(status_code=400, detail="Failed to update Supabase Auth profile")

            # 2. Update USER table logic (inside if block because it depends on auth_response)
            user_data = {}
            if user.username:
                user_data["UserName"] = user.username
            
            if user.email:
                # Check what Supabase says is the current email
                current_auth_email = auth_response.user.email
                new_email_request = user.email
                
                if current_auth_email == new_email_request:
                    # Update immediate (Secure Change Disabled)
                    user_data["Email"] = user.email
                else:
                    # Update pending (Secure Change Enabled)
                    # Do NOT update SQL.
                    email_message = " Email update pending confirmation. Please check your inbox."

            if user_data:
                supabase.table("User").update(user_data).eq("UserID", user_id).execute()

        # Handle purely username update (no auth attrs)
        else:
            if user.username:
                 supabase.table("User").update({"UserName": user.username}).eq("UserID", user_id).execute()

            
        # 3. Update Inspector Table (FullName) - Synchronize Username
        if user.username:
             supabase.table("Inspector").update({"FullName": user.username}).eq("UserID", user_id).execute()

        msg = "Profile updated successfully."
        if email_message:
            msg += email_message
            
        return {"message": msg}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Update Profile Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
