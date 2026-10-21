import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

# Resolve project root (two levels up from this file: backend/app/config.py â†’ project root)
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_DATABASE_DIR = os.path.join(_PROJECT_ROOT, "database")
_DEFAULT_DB_PATH = os.path.join(_DATABASE_DIR, "jobs.db").replace("\\", "/")
if not os.path.exists(os.path.join(_DATABASE_DIR, "jobs.db")) and os.path.exists(os.path.join(_PROJECT_ROOT, "jobs.db")):
    _DEFAULT_DB_PATH = os.path.join(_PROJECT_ROOT, "jobs.db").replace("\\", "/")
_ENV_FILE_PATH = os.path.join(_PROJECT_ROOT, ".env")

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # API configuration
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: List[str] = ["*"]

    # Database: Supports SQLite (local) and PostgreSQL/Supabase (production)
    DATABASE_URL: str = Field(
        default=f"sqlite:///{_DEFAULT_DB_PATH}",
        description="Database connection URL"
    )

    # Supabase Configuration
    SUPABASE_URL: str = "https://sscjavqdyydxmrjltvgs.supabase.co"
    SUPABASE_ANON_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzY2phdnFkeXlkeG1yamx0dmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MjE5MTAsImV4cCI6MjEwODA5NzkxMH0.q14RkuQHiH-nxbsfVGUyzarWQI2kQE7MNwIrcrWEqgA"
    SUPABASE_SERVICE_ROLE_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzY2phdnFkeXlkeG1yamx0dmdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjUyMTkxMCwiZXhwIjoyMTA4MDk3OTEwfQ._Pw6dXf1KCEzwc_rITISrKBMtZFU5lWGHGvv-M8u-3g"

    # Admin key for protected sync triggers
    ADMIN_API_KEY: str = "change-this-secure-admin-key-in-production"

    # Ingestion tuning
    SYNC_INTERVAL_HOURS: int = 24
    SYNC_TIMEOUT_SECONDS: int = 60
    MAX_RETRIES_PER_SOURCE: int = 3
    RETRY_BACKOFF_FACTOR: float = 2.0
    RATE_LIMIT_DELAY_SECONDS: float = 1.0

    # Ingestion Location Filtering: "all" or "india_focused"
    INGESTION_LOCATION_FILTER: str = Field(
        default="all",
        description="Location ingestion filter mode: 'all' or 'india_focused' (excludes international_only)"
    )

    # Brevo (Sendinblue) Email API Configuration
    # Sign up free at https://app.brevo.com -> SMTP & API -> API Keys
    BREVO_API_KEY: str = Field(default="", description="Brevo Transactional Email API key")
    BREVO_SENDER_EMAIL: str = Field(default="", description="Verified sender email address in Brevo")
    BREVO_SENDER_NAME: str = Field(default="HirePulse", description="Sender display name")

    model_config = {
        "env_file": _ENV_FILE_PATH,
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

settings = Settings()