import os
import re
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings, _PROJECT_ROOT

logger = logging.getLogger("rozgar_database")

def utc_now() -> datetime:
    """Return current naive UTC datetime for SQLite compatibility and consistent timestamp defaults."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def normalize_database_url(url: Optional[str] = None) -> str:
    """
    Normalizes DATABASE_URL for robust multi-environment execution:
    1. Replaces legacy postgres:// with postgresql:// for SQLAlchemy 1.4/2.0 compatibility.
    2. Resolves relative SQLite file paths against the project root so that regardless
       of current working directory (e.g. root, backend/, or backend/agent/),
       the exact canonical database file is always resolved.
    3. Canonicalizes references to 'jobs.db' or './database/jobs.db' to point to the
       production SQLite database in 'database/jobs.db'.
    """
    db_url = url or settings.DATABASE_URL or ""

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    if db_url.startswith("sqlite:///"):
        if db_url == "sqlite:///:memory:":
            return db_url

        path_part = db_url[len("sqlite:///"):]

        # Check if path_part is absolute:
        # On Windows: C:/... or C:\... (len >= 3 and path_part[1] == ':')
        # On Unix: starts with /
        is_abs = (len(path_part) >= 3 and path_part[1] == ":") or (
            path_part.startswith("/") and not path_part.startswith("/.")
        )

        if not is_abs:
            cleaned = path_part.replace("\\", "/").lstrip("./")
            canonical_db = os.path.join(_PROJECT_ROOT, "database", "jobs.db").replace("\\", "/")

            if cleaned in ("jobs.db", "database/jobs.db"):
                resolved = canonical_db
            else:
                resolved = os.path.abspath(os.path.join(_PROJECT_ROOT, cleaned)).replace("\\", "/")

            db_url = f"sqlite:///{resolved}"

    return db_url


def get_sanitized_database_url(url: Optional[str] = None) -> str:
    """
    Returns a sanitized string representation of DATABASE_URL suitable for logs/diagnostics
    without exposing passwords or internal user home directories.
    """
    target = url or normalize_database_url()
    if not target:
        return "Not Configured"
    if target.startswith("sqlite"):
        if ":memory:" in target:
            return "sqlite:///:memory:"
        raw_path = target.replace("sqlite:///", "")
        filename = os.path.basename(raw_path)
        parent_dir = os.path.basename(os.path.dirname(raw_path))
        if parent_dir:
            return f"sqlite:///{parent_dir}/{filename}"
        return f"sqlite:///{filename}"

    # Mask password for postgresql/mysql: postgresql://user:***@host:port/dbname
    return re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", target)


# Resolved and normalized database URL
db_url = normalize_database_url()

# Connection arguments for SQLite (e.g. check_same_thread=False)
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency to yield database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_database_initialized(
    target_engine=None,
    log: Optional[logging.Logger] = None,
    seed_if_empty: bool = True
) -> Dict[str, Any]:
    """
    Safe startup diagnostic and idempotent schema verification.
    Verifies that 'job_listings' and associated tables exist.
    If missing, initializes tables safely from metadata and seeders without dropping data.
    """
    eng = target_engine or engine
    _log = log or logger

    inspector = inspect(eng)
    tables = inspector.get_table_names()

    if "job_listings" not in tables:
        _log.warning("Table 'job_listings' missing. Initializing database schema...")
        # Import all models to ensure metadata is populated
        try:
            import app.models.job  # noqa
            import app.models.matching  # noqa
            import app.models.user  # noqa
        except ImportError:
            try:
                import backend.app.models.job  # noqa
                import backend.app.models.matching  # noqa
                import backend.app.models.user  # noqa
            except ImportError:
                pass

        Base.metadata.create_all(bind=eng)

        # Idempotent column migrations
        _run_migrations(eng)

    # Query job count
    job_count = 0
    with eng.connect() as conn:
        try:
            job_count = conn.execute(text("SELECT COUNT(*) FROM job_listings")).scalar() or 0
        except Exception:
            job_count = 0

    if job_count == 0 and seed_if_empty:
        db = SessionLocal() if target_engine is None else sessionmaker(bind=eng)()
        try:
            _seed_if_empty(db, _log)
            job_count = conn.execute(text("SELECT COUNT(*) FROM job_listings")).scalar() if False else 0
        finally:
            db.close()
        with eng.connect() as conn:
            try:
                job_count = conn.execute(text("SELECT COUNT(*) FROM job_listings")).scalar() or 0
            except Exception:
                job_count = 0

    sanitized = get_sanitized_database_url(str(eng.url))
    diagnostic = {
        "status": "healthy" if job_count > 0 else "unseeded",
        "dialect": eng.dialect.name,
        "sanitized_url": sanitized,
        "job_listings_exists": True,
        "job_count": job_count,
    }

    _log.info(f"Database verified: {sanitized} | dialect={eng.dialect.name} | jobs={job_count:,}")
    return diagnostic


def _run_migrations(eng):
    """Applies idempotent migrations (safe ALTER TABLE and matching DDLs)."""
    with eng.connect() as conn:
        # user_profiles migrations
        try:
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN notification_email VARCHAR(255)"))
            conn.commit()
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 1"))
            conn.commit()
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN email_verified_at DATETIME"))
            conn.commit()
        except Exception:
            pass

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
                conn.execute(text(f"ALTER TABLE email_verification_otps ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception:
                pass

        # Matching system DDLs
        _matching_ddls = [
            "CREATE TABLE IF NOT EXISTS canonical_skills (id VARCHAR(36) PRIMARY KEY, name VARCHAR(128) NOT NULL UNIQUE, slug VARCHAR(128) NOT NULL UNIQUE, category VARCHAR(64), created_at DATETIME NOT NULL)",
            "CREATE TABLE IF NOT EXISTS skill_aliases (id VARCHAR(36) PRIMARY KEY, canonical_skill_id VARCHAR(36) NOT NULL REFERENCES canonical_skills(id) ON DELETE CASCADE, alias VARCHAR(128) NOT NULL, normalized_alias VARCHAR(128) NOT NULL UNIQUE, created_at DATETIME NOT NULL)",
            "CREATE TABLE IF NOT EXISTS job_skills (id VARCHAR(36) PRIMARY KEY, job_id VARCHAR(64) NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE, canonical_skill_id VARCHAR(36) NOT NULL REFERENCES canonical_skills(id) ON DELETE CASCADE, is_required BOOLEAN NOT NULL DEFAULT 1, weight NUMERIC(3,2) NOT NULL DEFAULT 1.0, created_at DATETIME NOT NULL, UNIQUE(job_id, canonical_skill_id))",
            "CREATE TABLE IF NOT EXISTS matching_config (id INTEGER PRIMARY KEY, version INTEGER NOT NULL DEFAULT 1, weights_json TEXT NOT NULL, tolerances_json TEXT NOT NULL, bonus_json TEXT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)",
            "CREATE TABLE IF NOT EXISTS match_cache (id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, job_id VARCHAR(64) NOT NULL, score NUMERIC(5,4) NOT NULL, matched_skills_json TEXT, missing_skills_json TEXT, reasons_json TEXT, sub_scores_json TEXT, profile_version VARCHAR(32) NOT NULL, config_version INTEGER NOT NULL, computed_at DATETIME NOT NULL, expires_at DATETIME NOT NULL, UNIQUE(user_id, job_id))",
        ]
        for ddl in _matching_ddls:
            try:
                conn.execute(text(ddl))
                conn.commit()
            except Exception:
                pass


def _seed_if_empty(db, _log):
    """Seeds initial records if job_listings is empty."""
    from app.models.job import JobListing
    try:
        if db.query(JobListing).count() > 0:
            return
    except Exception:
        return

    # Seed source registry
    try:
        from services.job_ingestion.source_registry import seed_source_registry
        seed_source_registry(db)
    except Exception as e:
        _log.warning(f"Failed to seed source registry: {e}")

    # Seed jobs from backup JSON
    json_path = os.path.join(_PROJECT_ROOT, "database", "jobs.json")
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                records = json.load(f)
            jobs_to_add = []
            for r in records:
                pub_date = None
                if r.get("publication_date"):
                    try:
                        pub_date = datetime.fromisoformat(r["publication_date"])
                    except Exception:
                        pass
                deadline = None
                if r.get("application_deadline"):
                    try:
                        deadline = datetime.fromisoformat(r["application_deadline"])
                    except Exception:
                        pass
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
            _log.info(f"Seeded {len(jobs_to_add)} jobs from backup.")
        except Exception as e:
            db.rollback()
            _log.warning(f"Failed to seed jobs from backup: {e}")

    # Seed taxonomy and matching config
    try:
        from app.services.skill_taxonomy import seed_skill_taxonomy
        from app.services.matching_service import seed_default_config
        seed_skill_taxonomy(db)
        seed_default_config(db)
    except Exception as e:
        _log.warning(f"Failed to seed matching taxonomy/config: {e}")
