import os
import sys

# Ensure project root & backend are on sys.path so services and ai can be imported cleanly
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api import api_router
from services.job_ingestion.source_registry import seed_source_registry
from services.job_ingestion.scheduler import run_all_sources
from services.digest_scheduler import periodic_daily_digest_worker
import asyncio
import logging

logger = logging.getLogger("hirepulse_main")

async def periodic_12h_sync():
    """Runs data synchronization across all approved sources every 12 hours."""
    TWELVE_HOURS = 12 * 3600
    while True:
        try:
            await asyncio.sleep(TWELVE_HOURS)
            logger.info("Executing automated 12-hour scheduled sync for all approved sources...")
            await run_all_sources(trigger_type="scheduled")
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error(f"Error during periodic 12h sync: {exc}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    # Seed source registry if needed
    db = SessionLocal()
    try:
        seed_source_registry(db)
    finally:
        db.close()

    # Launch background workers
    sync_task = asyncio.create_task(periodic_12h_sync())
    digest_task = asyncio.create_task(periodic_daily_digest_worker())
    yield
    sync_task.cancel()
    digest_task.cancel()

app = FastAPI(
    title="HirePulse — Multi-Source Job Aggregator API",
    description=(
        "Production-ready backend API for multi-source job aggregation, "
        "normalization, duplicate detection, freshness tracking, and universal embedding."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Open CORS configuration enabling any external website or mobile app to consume jobs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for embeddable JavaScript widget
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Mount API routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/", tags=["Health"])
def root_info():
    return {
        "name": "HirePulse Job Aggregation API",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs",
        "widget_url": "/static/widget.js",
        "endpoints": {
            "jobs": f"{settings.API_V1_PREFIX}/jobs",
            "filters": f"{settings.API_V1_PREFIX}/jobs/filters",
            "sources": f"{settings.API_V1_PREFIX}/sources",
            "sync": f"{settings.API_V1_PREFIX}/sync",
            "sync_logs": f"{settings.API_V1_PREFIX}/sync/logs",
            "auth": f"{settings.API_V1_PREFIX}/auth",
            "profile": f"{settings.API_V1_PREFIX}/profile",
            "saved_jobs": f"{settings.API_V1_PREFIX}/saved-jobs",
            "automation": f"{settings.API_V1_PREFIX}/automation",
            "resumes": f"{settings.API_V1_PREFIX}/resumes",
        }
    }

from fastapi.responses import FileResponse

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}

@app.get("/download/db", tags=["Download"])
def download_sqlite_db():
    """Direct one-click download for the SQLite jobs.db file."""
    db_path = os.path.join(root_dir, "database", "jobs.db")
    if not os.path.exists(db_path):
        db_path = os.path.join(root_dir, "jobs.db")
    if not os.path.exists(db_path):
        return {"error": "Database file not found"}
    return FileResponse(
        path=db_path,
        filename="jobs.db",
        media_type="application/x-sqlite3"
    )

@app.get("/download/csv", tags=["Download"])
def download_jobs_csv():
    """Direct one-click download for jobs.csv (Openable directly in Microsoft Excel)."""
    csv_path = os.path.join(root_dir, "database", "jobs.csv")
    if not os.path.exists(csv_path):
        csv_path = os.path.join(root_dir, "jobs.csv")
    if not os.path.exists(csv_path):
        return {"error": "CSV file not found"}
    return FileResponse(
        path=csv_path,
        filename="jobs.csv",
        media_type="text/csv"
    )

@app.get("/download/json", tags=["Download"])
def download_jobs_json():
    """Direct one-click download for jobs.json."""
    json_path = os.path.join(root_dir, "database", "jobs.json")
    if not os.path.exists(json_path):
        json_path = os.path.join(root_dir, "jobs.json")
    if not os.path.exists(json_path):
        return {"error": "JSON file not found"}
    return FileResponse(
        path=json_path,
        filename="jobs.json",
        media_type="application/json"
    )


