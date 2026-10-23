import sys
import os
import time
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

# Ensure backend path is importable
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import SessionLocal, Base, engine, utc_now
from app.models.source import JobSource
from app.models.job import JobListing
from app.models.sync_log import SyncLog
from app.config import settings
from services.job_ingestion.connectors import get_connector
from services.job_ingestion.deduplicator import Deduplicator
from services.job_ingestion.freshness import FreshnessEngine
from services.job_ingestion.source_registry import seed_source_registry
from services.job_ingestion.location_filter import IngestionLocationFilter
from services.job_ingestion.normalizer import Normalizer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("scheduler")

# Concurrency lock guard
_RUNNING_LOCK = False

async def sync_source(db: Session, source: JobSource, trigger_type: str = "scheduled", location_filter_mode: Optional[str] = None) -> Dict[str, Any]:
    """Synchronizes a single source and records detailed logs and stats."""
    start_time = time.time()
    sync_id = f"sync_{uuid.uuid4().hex[:12]}"
    
    sync_log = SyncLog(
        id=sync_id,
        source_id=source.id,
        trigger_type=trigger_type,
        status="running",
        started_at=datetime.now(timezone.utc)
    )
    db.add(sync_log)
    
    source.sync_status = "running"
    source.last_sync_at = datetime.now(timezone.utc)
    db.commit()

    jobs_fetched = 0
    jobs_created = 0
    jobs_updated = 0
    duplicates_found = 0
    jobs_filtered_location = 0
    seen_provider_ids = []

    try:
        connector = get_connector(source)
        normalized_jobs = await connector.fetch_and_normalize()
        jobs_fetched = len(normalized_jobs)
        now = datetime.now(timezone.utc)
        loc_mode = location_filter_mode or getattr(settings, "INGESTION_LOCATION_FILTER", "all")
        created_job_records = []

        for nj in normalized_jobs:
            # Apply location classification & verification filter
            should_ingest, loc_res = IngestionLocationFilter.filter_for_ingestion(
                title=nj.title,
                location_raw=nj.location_raw,
                city=nj.city,
                country=nj.country,
                work_mode=nj.work_mode,
                description=nj.description_plain or nj.description,
                mode=loc_mode
            )
            nj.location_category = loc_res.category
            nj.is_india_eligible = loc_res.is_india_eligible
            nj.location_eligibility_reason = loc_res.reason

            if not should_ingest:
                jobs_filtered_location += 1
                logger.debug(f"Skipping job outside India feed: {nj.title} ({nj.location_raw}) - {loc_res.reason}")
                continue

            # Ensure application deadline is calculated
            if not nj.application_deadline:
                nj.application_deadline = Normalizer.calculate_application_deadline(
                    publication_date=nj.publication_date,
                    employment_type=nj.employment_type,
                    title=nj.title,
                    first_seen_at=now
                )

            if nj.provider_job_id:
                seen_provider_ids.append(nj.provider_job_id)

            # Check for duplicate
            is_dup, reason, existing_match = Deduplicator.find_duplicate(db, source.id, nj)

            if is_dup and existing_match:
                if reason in ["same_source_provider_id", "canonical_url_match"] and existing_match.source_id == source.id:
                    # Same job refreshed from the same source
                    existing_match.last_seen_at = now
                    existing_match.last_checked_at = now
                    existing_match.freshness_status = "active"
                    existing_match.location_category = nj.location_category
                    existing_match.is_india_eligible = nj.is_india_eligible
                    existing_match.location_eligibility_reason = nj.location_eligibility_reason
                    if nj.location_raw:
                        existing_match.location_raw = nj.location_raw
                    if nj.city:
                        existing_match.city = nj.city
                    if nj.country:
                        existing_match.country = nj.country
                    if nj.work_mode and nj.work_mode != "not_disclosed":
                        existing_match.work_mode = nj.work_mode
                    if nj.publication_date:
                        existing_match.publication_date = nj.publication_date
                    if nj.application_deadline:
                        existing_match.application_deadline = nj.application_deadline
                    # Update fields if new data provided
                    if nj.description and not existing_match.description:
                        existing_match.description = nj.description
                    if nj.salary_min and not existing_match.salary_min:
                        existing_match.salary_min = nj.salary_min
                        existing_match.salary_max = nj.salary_max
                    jobs_updated += 1
                else:
                    # Duplicate cross-posted or duplicate fingerprint
                    duplicates_found += 1
                    # We store duplicate record with is_duplicate=True for provenance tracking
                    dup_id = f"job_{uuid.uuid4().hex[:12]}"
                    job_record = JobListing(
                        id=dup_id,
                        source_id=source.id,
                        provider_job_id=nj.provider_job_id,
                        title=nj.title,
                        normalized_title=nj.normalized_title,
                        company_name=nj.company_name,
                        company_domain=nj.company_domain,
                        location_raw=nj.location_raw,
                        city=nj.city,
                        country=nj.country,
                        location_category=nj.location_category,
                        is_india_eligible=nj.is_india_eligible,
                        location_eligibility_reason=nj.location_eligibility_reason,
                        work_mode=nj.work_mode,
                        employment_type=nj.employment_type,
                        department=nj.department,
                        description=nj.description,
                        description_plain=nj.description_plain,
                        salary_min=nj.salary_min,
                        salary_max=nj.salary_max,
                        salary_currency=nj.salary_currency,
                        salary_pay_period=nj.salary_pay_period,
                        required_qualifications=nj.required_qualifications,
                        application_url=nj.application_url,
                        canonical_url=nj.canonical_url,
                        publication_date=nj.publication_date,
                        application_deadline=nj.application_deadline,
                        first_seen_at=now,
                        last_seen_at=now,
                        last_checked_at=now,
                        freshness_status="active",
                        is_duplicate=True,
                        canonical_job_id=existing_match.id,
                        dedup_fingerprint=Deduplicator.compute_fingerprint(nj.company_name, nj.normalized_title, nj.location_raw),
                        raw_metadata=nj.raw_metadata,
                        created_at=now,
                        updated_at=now,
                    )
                    db.add(job_record)
            else:
                # Brand new unique listing
                new_id = f"job_{uuid.uuid4().hex[:12]}"
                job_record = JobListing(
                    id=new_id,
                    source_id=source.id,
                    provider_job_id=nj.provider_job_id,
                    title=nj.title,
                    normalized_title=nj.normalized_title,
                    company_name=nj.company_name,
                    company_domain=nj.company_domain,
                    location_raw=nj.location_raw,
                    city=nj.city,
                    country=nj.country,
                    location_category=nj.location_category,
                    is_india_eligible=nj.is_india_eligible,
                    location_eligibility_reason=nj.location_eligibility_reason,
                    work_mode=nj.work_mode,
                    employment_type=nj.employment_type,
                    department=nj.department,
                    description=nj.description,
                    description_plain=nj.description_plain,
                    salary_min=nj.salary_min,
                    salary_max=nj.salary_max,
                    salary_currency=nj.salary_currency,
                    salary_pay_period=nj.salary_pay_period,
                    required_qualifications=nj.required_qualifications,
                    application_url=nj.application_url,
                    canonical_url=nj.canonical_url,
                    publication_date=nj.publication_date,
                    application_deadline=nj.application_deadline,
                    first_seen_at=now,
                    last_seen_at=now,
                    last_checked_at=now,
                    freshness_status="active",
                    is_duplicate=False,
                    canonical_job_id=None,
                    dedup_fingerprint=Deduplicator.compute_fingerprint(nj.company_name, nj.normalized_title, nj.location_raw),
                    raw_metadata=nj.raw_metadata,
                    created_at=now,
                    updated_at=now,
                )
                db.add(job_record)
                created_job_records.append(job_record)
                jobs_created += 1

        db.commit()

        # Trigger instant email alerts for new matching listings if any were created
        if created_job_records:
            try:

                def _dispatch_alerts_worker(job_ids: list[str]):
                    from app.database import SessionLocal
                    from app.models.job import JobListing
                    from services.job_ingestion.alerts import process_instant_alerts_for_new_jobs
    
                    worker_db = SessionLocal()
                    try:
                        jobs = worker_db.query(JobListing).filter(JobListing.id.in_(job_ids)).all()
                        process_instant_alerts_for_new_jobs(worker_db, jobs)
                        worker_db.commit()
                    except Exception:
                        worker_db.rollback()
                        raise
                    finally:
                        worker_db.close()

                created_ids = [j.id for j in created_job_records]
                await asyncio.to_thread(_dispatch_alerts_worker, created_ids)
            except Exception as alert_err:
                logger.error(f"Error during instant job alerts dispatch: {alert_err}")

        # Update freshness of non-seen jobs
        FreshnessEngine.update_source_listings_freshness(db, source, seen_provider_ids)

        # Update source status
        source.sync_status = "success"
        source.last_successful_sync_at = datetime.now(timezone.utc)
        source.last_error = None

        sync_log.status = "success"
        sync_log.jobs_fetched = jobs_fetched
        sync_log.jobs_created = jobs_created
        sync_log.jobs_updated = jobs_updated
        sync_log.duplicates_found = duplicates_found
        sync_log.duration_ms = int((time.time() - start_time) * 1000)
        sync_log.completed_at = datetime.now(timezone.utc)
        db.commit()

        logger.info(
            f"[{source.id}] Sync SUCCESS: Fetched={jobs_fetched}, Created={jobs_created}, "
            f"Updated={jobs_updated}, Duplicates={duplicates_found} in {sync_log.duration_ms}ms"
        )
        return {
            "source_id": source.id,
            "status": "success",
            "jobs_fetched": jobs_fetched,
            "jobs_created": jobs_created,
            "jobs_updated": jobs_updated,
            "duplicates_found": duplicates_found,
            "duration_ms": sync_log.duration_ms,
        }

    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"[{source.id}] Sync FAILED: {err_msg}")
        try:
            db.rollback()
        except Exception:
            pass
        source.sync_status = "failed"
        source.last_error = err_msg

        sync_log.status = "failed"
        sync_log.error_message = err_msg
        sync_log.duration_ms = int((time.time() - start_time) * 1000)
        sync_log.completed_at = utc_now()
        db.commit()

        return {
            "source_id": source.id,
            "status": "failed",
            "error": err_msg,
            "duration_ms": sync_log.duration_ms,
        }

async def run_all_sources(source_id: Optional[str] = None, trigger_type: str = "manual") -> List[Dict[str, Any]]:
    """Runs ingestion across approved active sources."""
    global _RUNNING_LOCK
    if _RUNNING_LOCK:
        logger.warning("Ingestion run skipped: A sync job is already currently running.")
        return [{"status": "skipped", "reason": "concurrent_run_prevented"}]

    _RUNNING_LOCK = True
    db = SessionLocal()
    results = []

    try:
        # Seed registry if empty
        seed_source_registry(db)

        query = db.query(JobSource).filter(JobSource.is_active == True)
        if source_id:
            query = query.filter(JobSource.id == source_id)
        else:
            query = query.filter(JobSource.permission_status == "approved")

        sources = query.all()
        logger.info(f"Starting ingestion run for {len(sources)} source(s)...")

        for src in sources:
            res = await sync_source(db, src, trigger_type=trigger_type)
            results.append(res)
            # Gentle rate-limit pause between different sources
            await asyncio.sleep(1.0)

    finally:
        db.close()
        _RUNNING_LOCK = False

    return results

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="HirePulse Job Ingestion Scheduler")
    parser.add_argument("--run-now", action="store_true", help="Execute sync immediately")
    parser.add_argument("--source", type=str, default=None, help="Specific source ID to sync")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    if args.run_now:
        res = asyncio.run(run_all_sources(source_id=args.source))
        print("Sync results summary:", res)
    else:
        print("Scheduler CLI ready. Use --run-now to execute manual sync.")
