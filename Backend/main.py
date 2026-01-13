from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from supabase import create_client, Client

from ai_detection import router as ai_detection_router
from auth import router as auth_router
from vessel import router as vessel_router
from inspector import router as inspector_router
from admin import router as admin_router
from inspection import router as inspection_router
from photo import router as photo_router
from finding import router as finding_router
from recommendation import router as recommendation_router
from report import router as report_router
from team import router as team_router
from notification import router as notification_router

# 1. Load Environment Variables
load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("❌ Supabase credentials not found in .env file")

# 2. Initialize Supabase Client
supabase: Client = create_client(url, key)

# 3. Initialize FastAPI
app = FastAPI()

# 4. Setup CORS (Allow Frontend to talk to Backend)
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "*", # Allow all origins for deployment (or add your specific Render URL)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 5. Routes
app.include_router(auth_router)
app.include_router(vessel_router)
app.include_router(inspector_router)
app.include_router(admin_router)
app.include_router(inspection_router)
app.include_router(photo_router)
app.include_router(finding_router)
app.include_router(recommendation_router)
app.include_router(report_router)
app.include_router(team_router)
app.include_router(notification_router)
app.include_router(ai_detection_router)


if __name__ == "__main__":
    import uvicorn
    # Run server: host 0.0.0.0 allows network access, port 8000 is standard
    uvicorn.run(app, host="0.0.0.0", port=8000)
