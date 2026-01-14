from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import os
import shutil
import tempfile
try:
    import pythoncom
except ImportError:
    pythoncom = None

try:
    from docx2pdf import convert
except ImportError:
    convert = None
import subprocess
from supabase import create_client, Client
from dotenv import load_dotenv
import traceback
import time
import io

# Optional PDF generator
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import cm
    REPORTLAB_AVAILABLE = True
except Exception:
    REPORTLAB_AVAILABLE = False

load_dotenv()

# Initialize Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY")

if not url:
    raise ValueError("SUPABASE_URL environment variable is not set.")
if not key:
    raise ValueError("SUPABASE_ANON_KEY environment variable is not set.")

supabase: Client = create_client(url, key)

router = APIRouter(prefix="/report", tags=["Report"])

# ---------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------

class ReportBase(BaseModel):
    InspectionID: int
    WordFile: Optional[str] = None
    PdfFile: Optional[str] = None
    UserID: Optional[int] = None # Reviewed By (Admin ID)
    Comment: Optional[str] = None

class ReportCreate(ReportBase):
    pass

class ReportUpdate(BaseModel):
    WordFile: Optional[str] = None
    PdfFile: Optional[str] = None
    UserID: Optional[int] = None
    Comment: Optional[str] = None

class GenerateReportRequest(BaseModel):
    InspectionID: int
    ReportDate: Optional[str] = None

# ---------------------------------------------------------
# Helper Function: Check if LibreOffice is available
# ---------------------------------------------------------

def find_libreoffice():
    """Find LibreOffice executable path"""
    # Linux/Docker paths
    linux_paths = [
        "soffice",
        "/usr/bin/soffice",
        "/usr/bin/libreoffice",
        "libreoffice"
    ]
    
    # Windows paths (for local dev)
    windows_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"
    ]
    
    all_paths = linux_paths + windows_paths
    
    for path in all_paths:
        try:
            # Use 'which' on Linux or check file existence
            if os.path.isabs(path):
                if os.path.exists(path):
                    return path
            else:
                # For non-absolute paths, use shutil.which to find in PATH
                result = shutil.which(path)
                if result:
                    return result
        except Exception:
            continue
    
    return None

# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

# 1. Create Report Entry
@router.post("/", status_code=201)
def create_report(report: ReportCreate):
    try:
        new_data = report.dict()
        existing = supabase.table("Report").select("*").eq("InspectionID", report.InspectionID).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Report already exists for this Inspection ID. Use Update instead.")

        response = supabase.table("Report").insert(new_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create report entry")
            
        return response.data[0]
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# 2. Get All Reports
@router.get("/")
def get_all_reports():
    try:
        response = (
            supabase.table("Report")
            .select("*, Inspection(*, Equipment(*), Inspector(*))")
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 3. Get Report by InspectionID (PK)
@router.get("/{inspection_id}")
def get_report(inspection_id: int):
    try:
        response = supabase.table("Report").select("*").eq("InspectionID", inspection_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Report not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4. Update Report
@router.put("/{inspection_id}")
def update_report(inspection_id: int, report: ReportUpdate):
    try:
        print(f"DEBUG: update_report {inspection_id} payload: {report.dict()}")
        update_data = {k: v for k, v in report.dict().items() if v is not None}
        print(f"DEBUG: update_data for DB: {update_data}")
        
        response = (
            supabase.table("Report")
            .update(update_data)
            .eq("InspectionID", inspection_id)
            .execute()
        )
        print(f"DEBUG: DB Update Response: {response.data}")
        if not response.data:
            raise HTTPException(status_code=404, detail="Report not found or update failed")

        # Notification: If Comment is updated, notify Inspector
        if report.Comment:
            print(f"DEBUG_NOTIF: Admin Commenting on Insp {inspection_id}")
            try:
                insp = supabase.table("Inspection").select("UserID_Inspector, ReportNo").eq("InspectionID", inspection_id).execute()
                if insp.data:
                    uid_int = insp.data[0]['UserID_Inspector']
                    rno = insp.data[0]['ReportNo']
                    
                    print(f"DEBUG_NOTIF: Inspector ID {uid_int} found. Fetching AuthUUID...")

                    # Fetch AuthUUID from User table
                    u_res = supabase.table("User").select("AuthUUID").eq("UserID", uid_int).execute()
                    if u_res.data and u_res.data[0].get('AuthUUID'):
                        uuid_str = u_res.data[0]['AuthUUID']
                        print(f"DEBUG_NOTIF: AuthUUID {uuid_str} found. Sending...")
                        
                        supabase.table("Notification").insert({
                            "UserID": uuid_str,
                            "Message": f"Admin added a comment on Report {rno}: {report.Comment}",
                            "Type": "info"
                        }).execute()
                    else:
                        print(f"ERROR: AuthUUID not found for UserID {uid_int}")
            except Exception as e:
                print(f"Notification Error (Ignored): {e}")

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 5. Delete Report
@router.delete("/{inspection_id}")
def delete_report(inspection_id: int):
    try:
        response = supabase.table("Report").delete().eq("InspectionID", inspection_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"message": "Report deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 6. Upload Report File (Word/PDF)
@router.post("/upload")
def upload_report_file(file: UploadFile = File(...)):
    try:
        bucket_name = "inspection-reports" 
        filename = f"{int(time.time())}_{file.filename}"
        
        file_content = file.file.read()
        
        response = supabase.storage.from_(bucket_name).upload(
            path=filename,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        public_url = supabase.storage.from_(bucket_name).get_public_url(filename)
        
        return {"url": public_url}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

# 7. Get Reports for Specific Inspector (My Reports)
@router.get("/inspector/{user_id}")
def get_reports_by_inspector(user_id: int):
    try:
        # Step 1: Get Inspection IDs created by this user
        insp_response = supabase.table("Inspection").select("InspectionID").eq("UserID_Inspector", user_id).execute()
        
        if not insp_response.data:
            # No inspections created by this user
            return []

        inspection_ids = [item["InspectionID"] for item in insp_response.data]

        # Step 2: Get Reports matching those Inspection IDs
        if not inspection_ids:
            return []

        response = supabase.table("Report").select("*").in_("InspectionID", inspection_ids).execute()
        return response.data
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# 8. Approve report with Upload (Admin action)
@router.post("/{inspection_id}/approve-upload")
async def approve_report_upload(inspection_id: int, file: UploadFile = File(...)):
    try:
        # 1. Upload Signed Word File
        bucket_name = "inspection-reports"
        filename_docx = f"Approved-Word-{inspection_id}-{int(time.time())}.docx"
        file_content = await file.read()
        
        supabase.storage.from_(bucket_name).upload(
            path=filename_docx,
            file=file_content,
            file_options={"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
        )
        url_docx = supabase.storage.from_(bucket_name).get_public_url(filename_docx)

        # 2. Convert to PDF using LibreOffice
        temp_dir = tempfile.mkdtemp()
        docx_path = os.path.join(temp_dir, "input.docx")
        pdf_path = os.path.join(temp_dir, "input.pdf")

        # Save DOCX to temp
        with open(docx_path, "wb") as f:
            f.write(file_content)

        # Find LibreOffice
        soffice_path = find_libreoffice()
        conversion_success = False
        
        if soffice_path:
            try:
                cmd = [
                    soffice_path,
                    "--headless",
                    "--convert-to", "pdf",
                    "--outdir", temp_dir,
                    docx_path
                ]
                print(f"✅ Found LibreOffice at: {soffice_path}")
                print(f"🔄 Running conversion: {' '.join(cmd)}")
                
                result = subprocess.run(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=30,
                    check=False
                )
                
                print(f"📤 Return code: {result.returncode}")
                print(f"📤 Stdout: {result.stdout.decode()}")
                print(f"📤 Stderr: {result.stderr.decode()}")
                
                if result.returncode == 0 and os.path.exists(pdf_path):
                    conversion_success = True
                    print(f"✅ PDF created successfully at {pdf_path}")
            except subprocess.TimeoutExpired:
                print("⏱️ LibreOffice conversion timed out")
            except Exception as e:
                print(f"❌ LibreOffice conversion error: {e}")
        
        # Fallback to docx2pdf (Windows only)
        if not conversion_success and convert is not None:
            print("🔄 Trying docx2pdf fallback...")
            try:
                if pythoncom:
                    pythoncom.CoInitialize()
                convert(docx_path, pdf_path)
                if os.path.exists(pdf_path):
                    conversion_success = True
                    print("✅ PDF created with docx2pdf")
            except Exception as e:
                print(f"❌ docx2pdf failed: {e}")

        if not conversion_success or not os.path.exists(pdf_path):
            raise Exception(f"PDF conversion failed. LibreOffice path: {soffice_path}")

        # 3. Upload Generated PDF
        filename_pdf = f"Approved-PDF-{inspection_id}-{int(time.time())}.pdf"
        with open(pdf_path, "rb") as f:
            pdf_content = f.read()
        
        supabase.storage.from_(bucket_name).upload(
            path=filename_pdf,
            file=pdf_content,
            file_options={"content-type": "application/pdf"}
        )
        url_pdf = supabase.storage.from_(bucket_name).get_public_url(filename_pdf)

        # 4. Update Database
        supabase.table("Report").update({
            "ApprovedWordFile": url_docx,
            "ApprovedPdfFile": url_pdf
        }).eq("InspectionID", inspection_id).execute()

        supabase.table("Inspection").update({"Status": "Approved"}).eq("InspectionID", inspection_id).execute()

        # Notification
        try:
            insp = supabase.table("Inspection").select("UserID_Inspector, ReportNo").eq("InspectionID", inspection_id).execute()
            if insp.data:
                uid_int = insp.data[0]['UserID_Inspector']
                rno = insp.data[0]['ReportNo']
                
                u_res = supabase.table("User").select("AuthUUID").eq("UserID", uid_int).execute()
                if u_res.data and u_res.data[0].get('AuthUUID'):
                    uuid_str = u_res.data[0]['AuthUUID']
                    print(f"DEBUG_NOTIF: Sending approval notification to {uuid_str}")
                    
                    supabase.table("Notification").insert({
                        "UserID": uuid_str,
                        "Message": f"Your report {rno} has been Approved.",
                        "Type": "success"
                    }).execute()
        except Exception as e:
            print(f"Notification Error: {e}")

        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)

        return {"message": "Report approved and uploaded", "docx_url": url_docx, "pdf_url": url_pdf}

    except Exception as e:
        traceback.print_exc()
        if 'temp_dir' in locals():
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

# 9. Revert Approval (Admin action)
@router.put("/{inspection_id}/revert-approval")
def revert_approval(inspection_id: int):
    try:
        supabase.table("Report").update({
            "ApprovedWordFile": None,
            "ApprovedPdfFile": None,
            "Comment": "Status: Completed"
        }).eq("InspectionID", inspection_id).execute()

        supabase.table("Inspection").update({"Status": "Completed"}).eq("InspectionID", inspection_id).execute()

        return {"message": "Report reverted to Completed status"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 10. Convert DOCX to PDF (Helper Endpoint)
@router.post("/convert")
async def convert_docx_to_pdf_endpoint(file: UploadFile = File(...)):
    temp_dir = tempfile.mkdtemp()
    docx_path = os.path.join(temp_dir, "input.docx")
    pdf_path = os.path.join(temp_dir, "input.pdf")

    try:
        # Save uploaded DOCX
        with open(docx_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # Find LibreOffice
        soffice_path = find_libreoffice()
        conversion_success = False
        
        if soffice_path:
            try:
                cmd = [
                    soffice_path,
                    "--headless",
                    "--convert-to", "pdf",
                    "--outdir", temp_dir,
                    docx_path
                ]
                print(f"✅ Found LibreOffice at: {soffice_path}")
                print(f"🔄 Running conversion: {' '.join(cmd)}")
                
                result = subprocess.run(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=30,
                    check=False
                )
                
                print(f"📤 Return code: {result.returncode}")
                print(f"📤 Stdout: {result.stdout.decode()}")
                print(f"📤 Stderr: {result.stderr.decode()}")
                
                if result.returncode == 0 and os.path.exists(pdf_path):
                    conversion_success = True
                    print(f"✅ PDF created successfully at {pdf_path}")
            except subprocess.TimeoutExpired:
                print("⏱️ LibreOffice conversion timed out")
            except Exception as e:
                print(f"❌ LibreOffice conversion error: {e}")
        else:
            print("❌ LibreOffice not found in system")
        
        # Fallback to docx2pdf (Windows only)
        if not conversion_success and convert is not None:
            print("🔄 Trying docx2pdf fallback...")
            try:
                if pythoncom:
                    pythoncom.CoInitialize()
                convert(docx_path, pdf_path)
                if os.path.exists(pdf_path):
                    conversion_success = True
                    print("✅ PDF created with docx2pdf")
            except Exception as e:
                print(f"❌ docx2pdf failed: {e}")

        if not conversion_success:
            raise Exception(f"PDF conversion failed. LibreOffice found: {soffice_path is not None}")

        if not os.path.exists(pdf_path):
            raise Exception("PDF file was not created")

        return FileResponse(
            pdf_path,
            filename="report.pdf",
            media_type="application/pdf"
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        # Cleanup after response is sent
        pass  # FileResponse will handle the file, cleanup later