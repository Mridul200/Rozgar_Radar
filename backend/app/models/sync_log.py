from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(String(64), primary_key=True, index=True)
    source_id = Column(String(64), ForeignKey("job_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    trigger_type = Column(String(32), nullable=False, default="scheduled")  # manual, scheduled
    status = Column(String(32), nullable=False, default="running", index=True)  # running, success, partial, failed
    
    jobs_fetched = Column(Integer, default=0, nullable=False)
    jobs_created = Column(Integer, default=0, nullable=False)
    jobs_updated = Column(Integer, default=0, nullable=False)
    duplicates_found = Column(Integer, default=0, nullable=False)
    duration_ms = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)

    started_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    source = relationship("JobSource", back_populates="sync_logs")
