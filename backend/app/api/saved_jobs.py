from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db, utc_now
from app.models.user import User, SavedJob
from app.models.job import JobListing
from app.schemas.user import SavedJobCreateRequest, SavedJobUpdateRequest, SavedJobResponse
from app.api.auth_deps import get_current_user

router = APIRouter(prefix="/saved-jobs", tags=["Saved Jobs & Tracker"])

def _format_saved_job(sj: SavedJob) -> SavedJobResponse:
    job = sj.job
    return SavedJobResponse(
        id=sj.id,
        user_id=sj.user_id,
        job_id=sj.job_id,
        status=sj.status,
        notes=sj.notes,
        applied_at=sj.applied_at,
        created_at=sj.created_at,
        updated_at=sj.updated_at,
        job_title=job.title if job else "Unknown Job",
        company_name=job.company_name if job else "Unknown Company",
        location_raw=job.location_raw if job else None,
        work_mode=job.work_mode if job else None,
        employment_type=job.employment_type if job else None,
        salary_min=float(job.salary_min) if job and job.salary_min else None,
        salary_max=float(job.salary_max) if job and job.salary_max else None,
        salary_currency=job.salary_currency if job else None,
        application_url=job.application_url if job else "",
        source_name=job.source.name if job and job.source else (job.source_id if job else None),
        is_india_eligible=job.is_india_eligible if job else False,
    )

@router.get("", response_model=List[SavedJobResponse])
def get_user_saved_jobs(
    status_filter: Optional[str] = None,
    job_id: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(SavedJob).filter(SavedJob.user_id == user.id)
    if job_id:
        query = query.filter(SavedJob.job_id == job_id)
    if status_filter:
        query = query.filter(SavedJob.status == status_filter)
    saved_list = query.order_by(desc(SavedJob.updated_at)).all()
    return [_format_saved_job(sj) for sj in saved_list]

@router.post("", response_model=SavedJobResponse)
def save_job(req: SavedJobCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(JobListing).filter(JobListing.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = db.query(SavedJob).filter(
        SavedJob.user_id == user.id,
        SavedJob.job_id == req.job_id
    ).first()

    if existing:
        if req.status == "saved" and existing.status in ("applied", "interviewing", "offered"):
            raise HTTPException(
                status_code=409,
                detail=f"This job is already tracked in your applications with status '{existing.status}'. Cannot overwrite with 'saved'."
            )
        if req.status:
            existing.status = req.status
            if req.status == "applied" and not existing.applied_at:
                existing.applied_at = utc_now()
        if req.notes is not None:
            existing.notes = req.notes
        db.commit()
        db.refresh(existing)
        return _format_saved_job(existing)

    applied_date = utc_now() if req.status == "applied" else None
    sj = SavedJob(
        user_id=user.id,
        job_id=req.job_id,
        status=req.status or "saved",
        notes=req.notes,
        applied_at=applied_date
    )
    db.add(sj)
    db.commit()
    db.refresh(sj)
    return _format_saved_job(sj)

@router.patch("/{saved_job_id}", response_model=SavedJobResponse)
def update_saved_job_status(
    saved_job_id: str,
    req: SavedJobUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Support lookup either by SavedJob ID or by raw job_id
    sj = db.query(SavedJob).filter(
        (SavedJob.id == saved_job_id) | (SavedJob.job_id == saved_job_id),
        SavedJob.user_id == user.id
    ).first()
    if not sj:
        raise HTTPException(status_code=404, detail="Saved job not found")

    if req.status is not None:
        sj.status = req.status
        if req.status == "applied" and not sj.applied_at:
            sj.applied_at = utc_now()
    if req.notes is not None:
        sj.notes = req.notes
    if req.applied_at is not None:
        sj.applied_at = req.applied_at

    db.commit()
    db.refresh(sj)
    return _format_saved_job(sj)

@router.delete("/{saved_job_id}")
def delete_saved_job(
    saved_job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sj = db.query(SavedJob).filter(
        (SavedJob.id == saved_job_id) | (SavedJob.job_id == saved_job_id),
        SavedJob.user_id == user.id
    ).first()
    if not sj:
        raise HTTPException(status_code=404, detail="Saved job not found")

    db.delete(sj)
    db.commit()
    return {"status": "success", "message": "Job removed from saved list"}
