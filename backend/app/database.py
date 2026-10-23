from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

def utc_now() -> datetime:
    """Return current naive UTC datetime for SQLite compatibility and consistent timestamp defaults."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

# Normalize postgres:// to postgresql:// for SQLAlchemy 1.4/2.0 compatibility on Render/Heroku
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Adjust connection args for SQLite if needed (e.g. check_same_thread=False)
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
