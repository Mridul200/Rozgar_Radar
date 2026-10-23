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
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api import api_router
from app.api.auth_deps import verify_admin
import json
from datetime import datetime
from app.models.job import JobListing
from services.job_ingestion.source_registry import seed_source_registry
from services.job_ingestion.scheduler import run_all_sources
from services.digest_scheduler import periodic_daily_digest_worker
import asyncio
import logging

logger = logging.getLogger("hirepulse_main")

def seed_jobs_from_backup(db):
    """If database has 0 jobs (e.g. freshly deployed on Render), seeds jobs from database/jobs.json."""
    try:
        count = db.query(JobListing).count()
        if count > 0:
            logger.info(f"Database already has {count} jobs. Skipping backup seed.")
            return

        json_path = os.path.join(root_dir, "database", "jobs.json")
        if not os.path.exists(json_path):
            json_path = os.path.join(root_dir, "jobs.json")
        if not os.path.exists(json_path):
            logger.warning(f"No jobs.json backup found at {json_path}")
            return

        logger.info(f"Seeding jobs from backup file: {json_path}...")
        with open(json_path, "r", encoding="utf-8") as f:
            records = json.load(f)

        jobs_to_add = []
        for r in records:
            pub_date = None
            if r.get("publication_date"):
                try:
                    pub_date = datetime.fromisoformat(r["publication_date"])
                except Exception:
                    pub_date = None

            deadline = None
            if r.get("application_deadline"):
                try:
                    deadline = datetime.fromisoformat(r["application_deadline"])
                except Exception:
                    deadline = None

            job = JobListing(
                id=r.get("id"),
                source_id=r.get("source_id") or "agg_arbeitnow",
                provider_job_id=r.get("provider_job_id"),
                title=r.get("title", ""),
                normalized_title=r.get("normalized_title") or r.get("title", "").lower().strip(),
                company_name=r.get("company_name", "Unknown"),
                company_domain=r.get("company_domain"),
                location_raw=r.get("location_raw"),
                city=r.get("city"),
                country=r.get("country"),
                location_category=r.get("location_category") or "apac_worldwide",
                is_india_eligible=bool(r.get("is_india_eligible", True)),
                location_eligibility_reason=r.get("location_eligibility_reason"),
                work_mode=r.get("work_mode") or "remote",
                employment_type=r.get("employment_type") or "full_time",
                department=r.get("department"),
                salary_min=r.get("salary_min"),
                salary_max=r.get("salary_max"),
                salary_currency=r.get("salary_currency"),
                salary_pay_period=r.get("salary_pay_period"),
                application_url=r.get("application_url", ""),
                canonical_url=r.get("canonical_url") or r.get("application_url", ""),
                publication_date=pub_date,
                application_deadline=deadline,
                freshness_status=r.get("freshness_status") or "active",
                is_duplicate=bool(r.get("is_duplicate", False)),
            )
            jobs_to_add.append(job)

        db.bulk_save_objects(jobs_to_add)
        db.commit()
        logger.info(f"Successfully seeded {len(jobs_to_add)} jobs from backup into database.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding jobs from backup: {e}")

async def periodic_12h_sync():
    """Runs data synchronization across all approved sources every 12 hours with an initial post-boot sync."""
    try:
        # Initial sync 15 seconds after boot to fetch latest jobs immediately
        await asyncio.sleep(15)
        logger.info("Executing initial post-boot sync for all approved sources...")
        await run_all_sources(trigger_type="scheduled")
    except asyncio.CancelledError:
        return
    except Exception as exc:
        logger.error(f"Error during initial sync: {exc}")

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
    # Ensure migration for notification_email column and email verification columns
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN notification_email VARCHAR(255)"))
            conn.commit()
    except Exception:
        pass

    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 1"))
            conn.commit()
    except Exception:
        pass

    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN email_verified_at DATETIME"))
            conn.commit()
    except Exception:
        pass

    # Seed source registry and initial jobs if database is empty
    db = SessionLocal()
    try:
        seed_source_registry(db)
        seed_jobs_from_backup(db)
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
_cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]
_allow_credentials = False if _cors_origins == ["*"] else True

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prevent stale caching of API responses across browsers, proxies, and client router
@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/") or request.url.path in ("/health", "/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

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

@app.get("/download/db", tags=["Download"], dependencies=[Depends(verify_admin)])
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


