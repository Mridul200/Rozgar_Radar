from datetime import datetime, timezone, timedelta
from typing import List
from sqlalchemy.orm import Session
from app.models.job import JobListing
from app.models.source import JobSource

class FreshnessEngine:
    """
    Manages listing lifecycle states cautiously.
    Status transitions:
    - 'active': Successfully seen in recent source synchronization.
    - 'potentially_expired': Missing from source feed across multiple syncs or older than threshold.
    - 'link_failed': HTTP check on application link returned 404/410.
    - 'source_unavailable': Source is temporarily offline / failing.
    - 'needs_review': Data inconsistencies or user reported.
    """

    EXPIRY_THRESHOLD_DAYS = 30
    POTENTIALLY_EXPIRED_DAYS = 7

    @staticmethod
    def update_source_listings_freshness(
        db: Session,
        source: JobSource,
        seen_job_ids: List[str]
    ) -> int:
        """
        After a successful sync for a source, check previously existing active jobs.
        If a job was NOT seen in this successful fetch:
        - We DO NOT delete it.
        - If last_seen_at was more than 7 days ago, we cautiously flag it as 'potentially_expired'.
        - If source check failed, we never mark it expired.
        """
        now = datetime.now(timezone.utc)
        updated_count = 0

        # Query all active jobs for this source
        all_source_jobs = db.query(JobListing).filter(
            JobListing.source_id == source.id,
            JobListing.freshness_status == "active"
        ).all()

        for job in all_source_jobs:
            if job.provider_job_id not in seen_job_ids and job.id not in seen_job_ids:
                # Job was missing from this sync
                last_seen = job.last_seen_at
                if last_seen:
                    if last_seen.tzinfo is not None and now.tzinfo is None:
                        last_seen = last_seen.replace(tzinfo=None)
                    elif last_seen.tzinfo is None and now.tzinfo is not None:
                        now_cmp = now.replace(tzinfo=None)
                    else:
                        now_cmp = now
                    days_since_seen = (now_cmp - last_seen).days
                    if days_since_seen >= FreshnessEngine.POTENTIALLY_EXPIRED_DAYS:
                        job.freshness_status = "potentially_expired"
                        updated_count += 1
            else:
                # Job was confirmed active
                job.last_checked_at = now

        db.commit()
        return updated_count

    @staticmethod
    def mark_source_unavailable(db: Session, source: JobSource):
        """Marks source status without declaring individual jobs as expired."""
        source.sync_status = "failed"
        source.last_sync_at = datetime.utcnow()
        db.commit()
