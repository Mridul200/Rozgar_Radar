import hashlib
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.job import JobListing
from services.job_ingestion.normalizer import NormalizedJob

class Deduplicator:
    @staticmethod
    def compute_fingerprint(company: str, normalized_title: str, location: Optional[str]) -> str:
        """Computes a deterministic MD5 hash for company + title + coarse location."""
        coarse_loc = (location or "unspecified").lower().strip()
        # Coarsen location to avoid false negatives due to formatting differences
        raw_key = f"{company.lower().strip()}|{normalized_title.lower().strip()}|{coarse_loc}"
        return hashlib.md5(raw_key.encode("utf-8")).hexdigest()

    @staticmethod
    def find_duplicate(
        db: Session,
        source_id: str,
        job: NormalizedJob
    ) -> Tuple[bool, Optional[str], Optional[JobListing]]:
        """
        Layered duplicate check:
        Returns:
            (is_duplicate: bool, match_reason: str or None, matching_existing_job: JobListing or None)
        """
        # Layer 1: Check by exact source_id + provider_job_id
        if job.provider_job_id:
            existing = db.query(JobListing).filter(
                JobListing.source_id == source_id,
                JobListing.provider_job_id == job.provider_job_id
            ).first()
            if existing:
                return (True, "same_source_provider_id", existing)

        # Layer 2: Check by exact canonical application URL
        if job.canonical_url:
            existing_url = db.query(JobListing).filter(
                JobListing.canonical_url == job.canonical_url
            ).first()
            if existing_url:
                return (True, "canonical_url_match", existing_url)

        # Layer 3: Check by composite fingerprint (Company + Normalized Title + Location)
        fingerprint = Deduplicator.compute_fingerprint(
            job.company_name, job.normalized_title, job.location_raw
        )
        existing_fp = db.query(JobListing).filter(
            JobListing.dedup_fingerprint == fingerprint,
            JobListing.is_duplicate == False
        ).first()

        if existing_fp:
            return (True, "fingerprint_match", existing_fp)

        return (False, None, None)
