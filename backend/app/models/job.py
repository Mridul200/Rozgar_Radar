from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, Numeric, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base, utc_now

class JobListing(Base):
    __tablename__ = "job_listings"

    id = Column(String(64), primary_key=True, index=True)
    source_id = Column(String(64), ForeignKey("job_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_job_id = Column(String(128), nullable=True, index=True)

    title = Column(String(256), nullable=False, index=True)
    normalized_title = Column(String(256), nullable=False, index=True)
    company_name = Column(String(128), nullable=False, index=True)
    company_domain = Column(String(128), nullable=True)

    location_raw = Column(String(256), nullable=True)
    city = Column(String(128), nullable=True, index=True)
    country = Column(String(64), nullable=True, index=True)

    # Location Classification & Ingestion Eligibility:
    # 'india_office', 'remote_india', 'apac_worldwide', 'international_only'
    location_category = Column(String(32), default="international_only", nullable=False, index=True)
    is_india_eligible = Column(Boolean, default=False, nullable=False, index=True)
    location_eligibility_reason = Column(String(256), nullable=True)

    # Work mode: remote, hybrid, on_site, not_disclosed
    work_mode = Column(String(32), nullable=False, default="not_disclosed", index=True)

    # Employment type: full_time, part_time, contract, internship, not_disclosed
    employment_type = Column(String(32), nullable=False, default="not_disclosed", index=True)
    department = Column(String(128), nullable=True)

    # Content
    description = Column(Text, nullable=True)
    description_plain = Column(Text, nullable=True)

    # Compensation
    salary_min = Column(Numeric(12, 2), nullable=True)
    salary_max = Column(Numeric(12, 2), nullable=True)
    salary_currency = Column(String(8), nullable=True)
    salary_pay_period = Column(String(16), nullable=True)  # yearly, monthly, hourly

    required_qualifications = Column(Text, nullable=True)  # JSON-encoded array or bullet points

    # Application links
    application_url = Column(Text, nullable=False)
    canonical_url = Column(Text, nullable=False, index=True)

    # Timestamps
    publication_date = Column(DateTime, nullable=True, index=True)
    application_deadline = Column(DateTime, nullable=True)
    first_seen_at = Column(DateTime, default=utc_now, nullable=False)
    last_seen_at = Column(DateTime, default=utc_now, nullable=False)
    last_checked_at = Column(DateTime, default=utc_now, nullable=False)

    # Freshness Status:
    # 'active', 'potentially_expired', 'link_failed', 'source_unavailable', 'needs_review'
    freshness_status = Column(String(32), nullable=False, default="active", index=True)

    # Deduplication
    is_duplicate = Column(Boolean, default=False, nullable=False, index=True)
    canonical_job_id = Column(String(64), nullable=True, index=True)
    dedup_fingerprint = Column(String(128), nullable=True, index=True)

    # Audit payload
    raw_metadata = Column(Text, nullable=True)

    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    source = relationship("JobSource", back_populates="jobs")

    __table_args__ = (
        Index("idx_job_source_provider", "source_id", "provider_job_id"),
        Index("idx_job_company_title", "company_name", "normalized_title"),
    )
