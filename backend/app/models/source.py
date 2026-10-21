from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, Index
from sqlalchemy.orm import relationship
from app.database import Base

class JobSource(Base):
    __tablename__ = "job_sources"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    source_type = Column(String(32), nullable=False)  # ats, aggregator, direct_career_page
    ats_platform = Column(String(32), nullable=True, index=True)  # greenhouse, lever, ashby, etc.
    official_domain = Column(String(128), nullable=True)
    career_page_url = Column(Text, nullable=True)
    api_endpoint = Column(Text, nullable=True)
    board_identifier = Column(String(128), nullable=True)  # company slug for ATS
    access_method = Column(String(32), nullable=False)  # public_api, partner_feed, manual_review
    
    # Permission status: approved, not_reviewed, restricted, unavailable
    permission_status = Column(String(32), nullable=False, default="not_reviewed", index=True)
    auth_requirement = Column(String(32), nullable=False, default="none")  # none, api_key, oauth
    rate_limit_notes = Column(Text, nullable=True)

    # Synchronization tracking
    last_sync_at = Column(DateTime, nullable=True)
    last_successful_sync_at = Column(DateTime, nullable=True)
    sync_status = Column(String(32), nullable=False, default="idle")  # idle, running, success, failed
    last_error = Column(Text, nullable=True)
    coverage_notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    jobs = relationship("JobListing", back_populates="source", cascade="all, delete-orphan")
    sync_logs = relationship("SyncLog", back_populates="source", cascade="all, delete-orphan")
