import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, Numeric, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    saved_jobs = relationship("SavedJob", back_populates="user", cascade="all, delete-orphan")
    automation = relationship("AutomationConfig", back_populates="user", uselist=False, cascade="all, delete-orphan")
    automation_logs = relationship("AutomationLog", back_populates="user", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    email_notifications = relationship("EmailNotificationLog", back_populates="user", cascade="all, delete-orphan")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    current_city = Column(String(128), nullable=True)
    current_state = Column(String(128), nullable=True)
    preferred_locations = Column(Text, nullable=True)  # JSON list
    preferred_roles = Column(Text, nullable=True)      # JSON list
    skills = Column(Text, nullable=True)               # JSON list
    experience_level = Column(String(64), nullable=True) # fresher, 1-3_years, 3-5_years, 5+_years
    years_experience = Column(Numeric(4, 1), nullable=True)
    education = Column(String(128), nullable=True)
    preferred_industries = Column(Text, nullable=True) # JSON list
    employment_types = Column(Text, nullable=True)     # JSON list: ["full_time", "internship"]
    work_modes = Column(Text, nullable=True)           # JSON list: ["remote", "hybrid", "on_site"]
    min_salary = Column(Numeric(12, 2), nullable=True)
    resume_text = Column(Text, nullable=True)
    email_alerts_enabled = Column(Boolean, default=True, nullable=False)
    onboarding_completed = Column(Boolean, default=False, nullable=False)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="profile")


class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(String(64), ForeignKey("job_listings.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), default="saved", nullable=False)  # saved, applied, interviewing, offered, rejected
    notes = Column(Text, nullable=True)
    applied_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="saved_jobs")
    job = relationship("JobListing")

    __table_args__ = (
        Index("idx_user_job_unique", "user_id", "job_id", unique=True),
    )


class AutomationConfig(Base):
    __tablename__ = "automation_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    preferred_titles = Column(Text, nullable=True)     # JSON list
    preferred_locations = Column(Text, nullable=True)  # JSON list
    preferred_skills = Column(Text, nullable=True)     # JSON list
    work_modes = Column(Text, nullable=True)           # JSON list
    experience_level = Column(String(64), nullable=True)
    min_salary = Column(Numeric(12, 2), nullable=True)
    delivery_frequency = Column(String(32), default="daily", nullable=False)
    delivery_time = Column(String(16), default="09:00", nullable=False)
    timezone = Column(String(64), default="Asia/Kolkata", nullable=False)
    min_match_score = Column(Integer, default=60, nullable=False)
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="automation")


class AutomationLog(Base):
    __tablename__ = "automation_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    jobs_found = Column(Integer, default=0, nullable=False)
    jobs_sent = Column(Integer, default=0, nullable=False)
    status = Column(String(32), default="success", nullable=False)  # success, no_matches, failed
    sent_job_ids = Column(Text, nullable=True)  # JSON list of job IDs
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="automation_logs")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(128), default="My Resume", nullable=False)
    template = Column(String(64), default="modern", nullable=False)
    content_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="resumes")


class EmailNotificationLog(Base):
    __tablename__ = "email_notification_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(String(64), nullable=True, index=True)
    email_type = Column(String(32), default="instant_alert", nullable=False) # instant_alert, daily_digest, test_email
    recipient_email = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    status = Column(String(32), default="sent", nullable=False) # sent, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="email_notifications")

    __table_args__ = (
        Index("idx_user_job_alert", "user_id", "job_id"),
    )
