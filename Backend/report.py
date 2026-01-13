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
            return [] # No inspections created by this user
            
        inspection_ids = [item['InspectionID'] for item in insp_response.data]
        
        # Step 2: Get Reports for these Inspection IDs
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

        # 2. Convert to PDF using LibreOffice (or docx2pdf if available)
        temp_dir = tempfile.mkdtemp()
        docx_path = os.path.join(temp_dir, "input.docx")
        pdf_path = os.path.join(temp_dir, "input.pdf") # LibreOffice default
        final_pdf_path = os.path.join(temp_dir, "output.pdf")

        # Save DOCX to temp
        with open(docx_path, "wb") as f:
            f.write(file_content)

        # Convert
        conversion_success = False
        
        if convert is not None:
             # Plan A: Windows
            try:
                try:
                    pythoncom.CoInitialize()
                except:
                    pass
                convert(docx_path, final_pdf_path)
                if os.path.exists(final_pdf_path):
                    conversion_success = True
            except Exception as e:
                print(f"docx2pdf failed: {e}")
        
        if not conversion_success:
            # Plan B: Linux/LibreOffice
            cmd = ["soffice", "--headless", "--convert-to", "pdf", "--outdir", temp_dir, docx_path]
            print(f"Running LibreOffice conversion: {' '.join(cmd)}")
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if result.returncode == 0 and os.path.exists(pdf_path):
                final_pdf_path = pdf_path
                conversion_success = True

        if not conversion_success or not os.path.exists(final_pdf_path):
             raise Exception("PDF file was not created by the converter")

        # 3. Upload Generated PDF
        filename_pdf = f"Approved-PDF-{inspection_id}-{int(time.time())}.pdf"
        with open(final_pdf_path, "rb") as f:
            pdf_content = f.read()
        
        supabase.storage.from_(bucket_name).upload(
            path=filename_pdf,
            file=pdf_content,
            file_options={"content-type": "application/pdf"}
        )
        url_pdf = supabase.storage.from_(bucket_name).get_public_url(filename_pdf)

        # 4. Update Database
        # Update Report Table
        supabase.table("Report").update({
            "ApprovedWordFile": url_docx,
            "ApprovedPdfFile": url_pdf
        }).eq("InspectionID", inspection_id).execute()

        # Update Inspection Table Status to 'Approved'
        supabase.table("Inspection").update({"Status": "Approved"}).eq("InspectionID", inspection_id).execute()

        # Notification
        try:
            insp = supabase.table("Inspection").select("UserID_Inspector, ReportNo").eq("InspectionID", inspection_id).execute()
            if insp.data:
                uid_int = insp.data[0]['UserID_Inspector']
                rno = insp.data[0]['ReportNo']
                
                # Fetch AuthUUID from User table
                u_res = supabase.table("User").select("AuthUUID").eq("UserID", uid_int).execute()
                if u_res.data and u_res.data[0].get('AuthUUID'):
                    uuid_str = u_res.data[0]['AuthUUID']
                    print(f"DEBUG_NOTIF: AuthUUID {uuid_str} found. Sending Approved Notification...")
                    
                    supabase.table("Notification").insert({
                        "UserID": uuid_str,
                        "Message": f"Your report {rno} has been Approved.",
                        "Type": "success"
                    }).execute()
                else:
                    print(f"ERROR: AuthUUID not found for UserID {uid_int}")
        except Exception as e:
            print(f"Notification Error (Ignored): {e}")

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
        # Revert Report Table
        supabase.table("Report").update({
            "ApprovedWordFile": None,
            "ApprovedPdfFile": None,
            "Comment": "Status: Completed" # Or whatever appropriate
        }).eq("InspectionID", inspection_id).execute()

        # Revert Inspection Table Status
        supabase.table("Inspection").update({"Status": "Completed"}).eq("InspectionID", inspection_id).execute()

        return {"message": "Report reverted to Completed status"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 10. Convert DOCX to PDF (Helper Endpoint)
@router.post("/convert")
async def convert_docx_to_pdf(file: UploadFile = File(...)):
    # 1. Prepare Paths
    temp_dir = tempfile.mkdtemp()
    docx_path = os.path.join(temp_dir, "input.docx")
    pdf_path = os.path.join(temp_dir, "input.pdf") # LibreOffice preserves name, so it will be input.pdf
    final_pdf_path = os.path.join(temp_dir, "output.pdf") # We will rename it or serve it directly

    try:
        # 2. Save Uploaded DOCX
        with open(docx_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # 3. Conversion Logic
        # Priority 1: LibreOffice (Preferred for Deployment)
        conversion_success = False
        
        # Try LibreOffice first (both command and common Windows path)
        soffice_paths = ["soffice", r"C:\Program Files\LibreOffice\program\soffice.exe"]
        
        for soffice_cmd in soffice_paths:
            try:
                cmd = [
                    soffice_cmd, 
                    "--headless", 
                    "--convert-to", 
                    "pdf", 
                    "--outdir", 
                    temp_dir, 
                    docx_path
                ]
                print(f"Running LibreOffice conversion with: {soffice_cmd}")
                result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                
                if result.returncode == 0 and os.path.exists(pdf_path):
                    conversion_success = True
                    final_pdf_path = pdf_path
                    break # Success!
                else:
                    print(f"LibreOffice ({soffice_cmd}) failed. Stderr: {result.stderr.decode()}")

            except FileNotFoundError:
                 print(f"LibreOffice command '{soffice_cmd}' not found. Trying next...")

        # Priority 2: Windows docx2pdf (Fallback for local dev without LibreOffice)
        if not conversion_success and convert is not None:
             print("Falling back to docx2pdf (MS Word)...")
             try:
                try:
                    pythoncom.CoInitialize()
                except:
                    pass
                convert(docx_path, final_pdf_path)
                if os.path.exists(final_pdf_path):
                     conversion_success = True
             except Exception as e:
                 print(f"docx2pdf fallback failed: {e}")

        if not conversion_success:
             raise Exception("PDF Conversion Failed. Server needs LibreOffice ('soffice') installed for deployment, or MS Word for local testing.")

        # 4. Check Result
        if not os.path.exists(final_pdf_path):
             raise Exception("PDF file was not created by the converter")

        return FileResponse(final_pdf_path, filename="report.pdf", media_type="application/pdf")

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
