import asyncio
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.config import settings
from app.models.sync_log import SyncLog
from services.job_ingestion.scheduler import run_all_sources, _RUNNING_LOCK

router = APIRouter(prefix="/sync", tags=["Synchronization"])

def verify_admin(x_admin_key: Optional[str] = Header(None)):
    if not x_admin_key or x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Admin authentication required to trigger data synchronization"
        )
    return True

@router.post("")
async def trigger_sync(
    source_id: Optional[str] = Query(None, description="Optional specific source ID to sync"),
    background_tasks: BackgroundTasks = None,
    authorized: bool = Depends(verify_admin)
):
    """
    Protected endpoint to trigger job data ingestion.
    Runs asynchronously in the background and logs all operations.
    """
    if _RUNNING_LOCK:
        raise HTTPException(
            status_code=409,
            detail="A synchronization process is already active. Please wait for it to complete."
        )

    # Launch in background so web request returns immediately
    async def _bg_run():
        await run_all_sources(source_id=source_id, trigger_type="manual")

    background_tasks.add_task(_bg_run)

    return {
        "status": "accepted",
        "message": f"Synchronization scheduled in background for {'all approved sources' if not source_id else source_id}."
    }

@router.get("/logs")
def get_sync_logs(
    limit: int = Query(30, ge=1, le=100),
    source_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieves recent audit logs of data synchronization runs."""
    query = db.query(SyncLog)
    if source_id:
        query = query.filter(SyncLog.source_id == source_id)

    logs = query.order_by(desc(SyncLog.started_at)).limit(limit).all()

    return [
        {
            "id": log.id,
            "source_id": log.source_id,
            "trigger_type": log.trigger_type,
            "status": log.status,
            "jobs_fetched": log.jobs_fetched,
            "jobs_created": log.jobs_created,
            "jobs_updated": log.jobs_updated,
            "duplicates_found": log.duplicates_found,
            "duration_ms": log.duration_ms,
            "error_message": log.error_message,
            "started_at": log.started_at,
            "completed_at": log.completed_at,
        }
        for log in logs
    ]

@router.get("/status")
def get_sync_status(db: Session = Depends(get_db)):
    """Returns whether a synchronization run is active, the 12-hour cadence, and countdown info."""
    from datetime import datetime, timezone, timedelta
    from app.models.source import JobSource

    # Find the most recent successful sync
    latest_source = (
        db.query(JobSource)
        .filter(JobSource.last_successful_sync_at != None)
        .order_by(desc(JobSource.last_successful_sync_at))
        .first()
    )
    last_sync = latest_source.last_successful_sync_at if latest_source else None

    cadence_seconds = 12 * 3600  # 12 hours
    now = datetime.now(timezone.utc)

    if last_sync:
        if last_sync.tzinfo is None:
            last_sync = last_sync.replace(tzinfo=timezone.utc)
        elapsed = (now - last_sync).total_seconds()
        if elapsed < 0:
            elapsed = 0
        remaining = max(0, int(cadence_seconds - (elapsed % cadence_seconds)))
        cycle_count = int(elapsed // cadence_seconds)
        next_sync = last_sync + timedelta(seconds=(cycle_count + 1) * cadence_seconds)
    else:
        remaining = cadence_seconds
        next_sync = now + timedelta(seconds=cadence_seconds)

    return {
        "is_sync_running": _RUNNING_LOCK,
        "cadence_hours": 12,
        "cadence_seconds": cadence_seconds,
        "last_sync_at": last_sync.isoformat() if last_sync else None,
        "next_sync_at": next_sync.isoformat(),
        "seconds_remaining": remaining
    }
