from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.config import settings
from app.models.source import JobSource
from app.models.job import JobListing
from app.schemas.source import SourceResponse, SourceStatusSummary, SourceUpdate

router = APIRouter(prefix="/sources", tags=["Sources"])

def verify_admin(x_admin_key: Optional[str] = Header(None)):
    if not x_admin_key or x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing admin API key")
    return True

@router.get("", response_model=List[SourceStatusSummary])
def list_sources(
    status: Optional[str] = None,
    permission: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists all sources in the registry along with health metrics and active job counts."""
    query = db.query(JobSource)
    if status:
        query = query.filter(JobSource.sync_status == status)
    if permission:
        query = query.filter(JobSource.permission_status == permission)

    sources = query.order_by(JobSource.name).all()
    results = []

    for src in sources:
        job_count = db.query(func.count(JobListing.id)).filter(
            JobListing.source_id == src.id,
            JobListing.is_duplicate == False
        ).scalar() or 0

        india_count = db.query(func.count(JobListing.id)).filter(
            JobListing.source_id == src.id,
            JobListing.is_duplicate == False,
            JobListing.is_india_eligible == True
        ).scalar() or 0

        summary = SourceStatusSummary(
            id=src.id,
            name=src.name,
            source_type=src.source_type,
            ats_platform=src.ats_platform,
            permission_status=src.permission_status,
            sync_status=src.sync_status,
            last_sync_at=src.last_sync_at,
            last_successful_sync_at=src.last_successful_sync_at,
            last_error=src.last_error,
            is_active=src.is_active,
            total_jobs=job_count,
            india_jobs=india_count,
        )
        results.append(summary)

    return results

@router.get("/{source_id}", response_model=SourceResponse)
def get_source(source_id: str, db: Session = Depends(get_db)):
    """Retrieves detailed registry record for a specific source."""
    src = db.query(JobSource).filter(JobSource.id == source_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Source not found")
    return src

@router.patch("/{source_id}", response_model=SourceResponse)
def update_source(
    source_id: str,
    update_data: SourceUpdate,
    db: Session = Depends(get_db),
    authorized: bool = Depends(verify_admin)
):
    """Admin-protected update for source registry entries."""
    src = db.query(JobSource).filter(JobSource.id == source_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Source not found")

    for field, val in update_data.model_dump(exclude_unset=True).items():
        setattr(src, field, val)

    db.commit()
    db.refresh(src)
    return src
