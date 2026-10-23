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

def seed_users_from_backup(db):
    """If database is missing essential users (freshly deployed on Render), seeds users from database/users.json."""
    try:
        from app.models.user import User, UserProfile, AutomationConfig
        from app.api.auth_deps import hash_password
        from datetime import timezone
        import uuid
        import json

        json_path = os.path.join(root_dir, "database", "users.json")
        if not os.path.exists(json_path):
            json_path = os.path.join(root_dir, "users.json")

        records = []
        if os.path.exists(json_path):
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    records = json.load(f)
            except Exception as e:
                logger.warning(f"Error reading users.json: {e}")

        # Known bcrypt hash for password123
        pwd123_hash = "$2b$12$iwcoDUML.vnbcNhtoojZ9.5k65EdhdBkp/ojnD8O1RpDB2jTkbwTa"

        default_seed = [
            {
                "email": "testuser@example.com",
                "full_name": "Aarav Sharma",
                "hashed_password": pwd123_hash,
                "is_verified": True,
                "profile": {
                    "current_city": "Bengaluru",
                    "work_status": "experienced",
                    "profile_completion_pct": 85,
                    "skills": json.dumps(["Python", "JavaScript", "React", "SQL", "FastAPI"]),
                    "preferred_roles": json.dumps(["Full Stack Engineer", "Python Developer"]),
                    "preferred_locations": json.dumps(["Bengaluru", "Remote India"]),
                    "onboarding_completed": True
                }
            },
            {
                "email": "mridul008@gmail.com",
                "full_name": "Mridul",
                "hashed_password": pwd123_hash,
                "is_verified": True,
                "profile": {
                    "current_city": "Bengaluru",
                    "work_status": "experienced",
                    "profile_completion_pct": 85,
                    "skills": json.dumps(["Python", "JavaScript", "React", "SQL", "FastAPI", "Docker"]),
                    "preferred_roles": json.dumps(["Full Stack Engineer", "Backend Developer"]),
                    "preferred_locations": json.dumps(["Bengaluru", "Remote India"]),
                    "onboarding_completed": True
                }
            }
        ]

        known_emails = {r.get("email") for r in records if r.get("email")}
        for d in default_seed:
            if d["email"] not in known_emails:
                records.append(d)

        added = 0
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for r in records:
            email = r.get("email", "").strip().lower()
            if not email:
                continue
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                if not getattr(existing, "is_verified", True):
                    existing.is_verified = True
                    db.commit()
                continue

            user_id = r.get("id") or str(uuid.uuid4())
            user = User(
                id=user_id,
                email=email,
                hashed_password=r.get("hashed_password") or pwd123_hash,
                full_name=r.get("full_name") or "Job Seeker",
                is_verified=bool(r.get("is_verified", True)),
                email_verified_at=now,
                created_at=now,
                updated_at=now,
            )
            db.add(user)
            db.flush()

            p_data = r.get("profile") or {}
            skills_val = p_data.get("skills")
            if not isinstance(skills_val, str) and skills_val is not None:
                skills_val = json.dumps(skills_val)
            roles_val = p_data.get("preferred_roles")
            if not isinstance(roles_val, str) and roles_val is not None:
                roles_val = json.dumps(roles_val)
            locs_val = p_data.get("preferred_locations")
            if not isinstance(locs_val, str) and locs_val is not None:
                locs_val = json.dumps(locs_val)

            profile = UserProfile(
                user_id=user.id,
                current_city=p_data.get("current_city") or "Bengaluru",
                mobile_number=p_data.get("mobile_number"),
                work_status=p_data.get("work_status") or "fresher",
                profile_completion_pct=p_data.get("profile_completion_pct") or 85,
                skills=skills_val or json.dumps(["Python", "JavaScript", "React", "SQL"]),
                preferred_roles=roles_val or json.dumps(["Full Stack Engineer"]),
                preferred_locations=locs_val or json.dumps(["Bengaluru"]),
                onboarding_completed=bool(p_data.get("onboarding_completed", True)),
                email_alerts_enabled=True,
            )
            db.add(profile)

            a_data = r.get("automation") or {}
            auto = AutomationConfig(
                user_id=user.id,
                is_active=bool(a_data.get("is_active", True)),
                delivery_frequency=a_data.get("delivery_frequency") or "daily",
                delivery_time=a_data.get("delivery_time") or "09:00",
                timezone=a_data.get("timezone") or "Asia/Kolkata",
                min_match_score=a_data.get("min_match_score") or 60,
            )
            db.add(auto)
            added += 1

        db.commit()
        if added > 0:
            logger.info(f"Successfully seeded {added} users and profiles into database.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding users from backup: {e}")


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

    # Ensure migrations for extended profile and registration OTP fields
    profile_cols = [
        ("mobile_number", "VARCHAR(32)"),
        ("work_status", "VARCHAR(32) DEFAULT 'fresher'"),
        ("profile_photo_url", "TEXT"),
        ("education_details", "TEXT"),
        ("employment_history", "TEXT"),
        ("career_preferences", "TEXT"),
        ("optional_details", "TEXT"),
        ("resume_filename", "VARCHAR(255)"),
        ("profile_completion_pct", "INTEGER DEFAULT 20"),
    ]
    for col_name, col_type in profile_cols:
        try:
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE user_profiles ADD COLUMN {col_name} {col_type}"))
                conn.commit()
        except Exception:
            pass

    otp_cols = [
        ("mobile_number", "VARCHAR(32)"),
        ("work_status", "VARCHAR(32)"),
        ("current_city", "VARCHAR(128)"),
        ("resume_filename", "VARCHAR(255)"),
        ("resume_text", "TEXT"),
    ]
    for col_name, col_type in otp_cols:
        try:
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE email_verification_otps ADD COLUMN {col_name} {col_type}"))
                conn.commit()
        except Exception:
            pass

    # ─── Matching system: create tables + indexes (idempotent) ─────────
    from app.models import matching as _m  # ensure models registered
    _matching_ddls = [
        "CREATE TABLE IF NOT EXISTS canonical_skills (id VARCHAR(36) PRIMARY KEY, name VARCHAR(128) NOT NULL UNIQUE, slug VARCHAR(128) NOT NULL UNIQUE, category VARCHAR(64), created_at DATETIME NOT NULL)",
        "CREATE TABLE IF NOT EXISTS skill_aliases (id VARCHAR(36) PRIMARY KEY, canonical_skill_id VARCHAR(36) NOT NULL REFERENCES canonical_skills(id) ON DELETE CASCADE, alias VARCHAR(128) NOT NULL, normalized_alias VARCHAR(128) NOT NULL UNIQUE, created_at DATETIME NOT NULL)",
        "CREATE TABLE IF NOT EXISTS job_skills (id VARCHAR(36) PRIMARY KEY, job_id VARCHAR(64) NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE, canonical_skill_id VARCHAR(36) NOT NULL REFERENCES canonical_skills(id) ON DELETE CASCADE, is_required BOOLEAN NOT NULL DEFAULT 1, weight NUMERIC(3,2) NOT NULL DEFAULT 1.0, created_at DATETIME NOT NULL, UNIQUE(job_id, canonical_skill_id))",
        "CREATE TABLE IF NOT EXISTS matching_config (id INTEGER PRIMARY KEY, version INTEGER NOT NULL DEFAULT 1, weights_json TEXT NOT NULL, tolerances_json TEXT NOT NULL, bonus_json TEXT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)",
        "CREATE TABLE IF NOT EXISTS match_cache (id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, job_id VARCHAR(64) NOT NULL, score NUMERIC(5,4) NOT NULL, matched_skills_json TEXT, missing_skills_json TEXT, reasons_json TEXT, sub_scores_json TEXT, profile_version VARCHAR(32) NOT NULL, config_version INTEGER NOT NULL, computed_at DATETIME NOT NULL, expires_at DATETIME NOT NULL, UNIQUE(user_id, job_id))",
    ]
    for _ddl in _matching_ddls:
        try:
            with engine.connect() as conn:
                conn.execute(text(_ddl))
                conn.commit()
        except Exception:
            pass
    for _idx in [
        "CREATE INDEX IF NOT EXISTS idx_canonical_skill_slug ON canonical_skills(slug)",
        "CREATE INDEX IF NOT EXISTS idx_skill_alias_normalized ON skill_aliases(normalized_alias)",
        "CREATE INDEX IF NOT EXISTS idx_job_skill_job ON job_skills(job_id)",
        "CREATE INDEX IF NOT EXISTS idx_job_skill_canonical ON job_skills(canonical_skill_id)",
        "CREATE INDEX IF NOT EXISTS idx_match_cache_user ON match_cache(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_match_cache_expires ON match_cache(expires_at)",
    ]:
        try:
            with engine.connect() as conn:
                conn.execute(text(_idx))
                conn.commit()
        except Exception:
            pass

    # Seed source registry, initial jobs, skill taxonomy, and default config
    db = SessionLocal()
    try:
        seed_source_registry(db)
        seed_jobs_from_backup(db)
        seed_users_from_backup(db)
        from app.services.skill_taxonomy import seed_skill_taxonomy
        from app.services.matching_service import seed_default_config
        seed_skill_taxonomy(db)
        seed_default_config(db)
    finally:
        db.close()

    # Launch background workers
    sync_task = asyncio.create_task(periodic_12h_sync())
    digest_task = asyncio.create_task(periodic_daily_digest_worker())

    async def _bg_extract():
        try:
            from app.services.job_skill_extractor import bulk_extract_all_jobs
            _s = SessionLocal()
            try:
                stats = await asyncio.to_thread(bulk_extract_all_jobs, _s)
                logger.info(f"Job skill extraction: {stats}")
            finally:
                _s.close()
        except Exception as exc:
            logger.warning(f"Job skill extraction (non-fatal): {exc}")

    extract_task = None
    if os.getenv("ENVIRONMENT") != "test":
        extract_task = asyncio.create_task(_bg_extract())

    yield
    sync_task.cancel()
    digest_task.cancel()
    if extract_task:
        extract_task.cancel()


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


