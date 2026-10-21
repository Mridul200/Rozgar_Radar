import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func

from app.database import get_db
from app.models.job import JobListing
from app.models.source import JobSource
from app.schemas.job import (
    JobSummaryResponse,
    JobDetailResponse,
    JobListResponse,
    JobFilterOptionsResponse,
)

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("", response_model=JobListResponse)
def list_jobs(
    keyword: Optional[str] = Query(None, description="Search in title, company, or plain description"),
    company: Optional[str] = Query(None, description="Filter by company name"),
    location: Optional[str] = Query(None, description="Filter by location or city"),
    work_mode: Optional[str] = Query(None, description="remote, hybrid, on_site"),
    employment_type: Optional[str] = Query(None, description="full_time, part_time, contract, internship"),
    department: Optional[str] = Query(None, description="Filter by department or sector"),
    experience_level: Optional[str] = Query(None, description="Filter by experience level: fresher, junior, mid, senior, lead"),
    min_salary: Optional[float] = Query(None, description="Minimum salary threshold"),
    posted_within_days: Optional[int] = Query(None, description="Filter jobs posted within N days"),
    source_id: Optional[str] = Query(None, description="Filter by source ID"),
    platform: Optional[str] = Query(None, description="Filter by platform (greenhouse, lever, ashby, smartrecruiters, etc.)"),
    freshness: Optional[str] = Query("active", description="active, potentially_expired, or all"),
    include_duplicates: bool = Query(False, description="Whether to include duplicate listings"),
    sort_by: Optional[str] = Query("verified", description="Sorting: verified, newest, salary_desc, company, title"),
    india_feed: Optional[bool] = Query(None, description="India-focused feed: India office, India remote, and verified APAC/Worldwide. Excludes international_only."),
    location_category: Optional[str] = Query(None, description="Filter by category: india_office, remote_india, apac_worldwide, international_only"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Search and filter normalized job listings across all verified sources.
    Returns paginated job items with source attribution and direct original application links.
    """
    query = db.query(JobListing).join(JobSource, JobListing.source_id == JobSource.id)

    # Filter duplicates unless explicitly requested
    if not include_duplicates:
        query = query.filter(JobListing.is_duplicate == False)

    # Freshness status filter
    if freshness and freshness != "all":
        query = query.filter(JobListing.freshness_status == freshness)

    # Exclude expired listings whose application deadline has passed
    from datetime import datetime, timezone
    now_utc = datetime.now(timezone.utc)
    query = query.filter(
        or_(
            JobListing.application_deadline.is_(None),
            JobListing.application_deadline >= now_utc
        )
    )

    # Keyword search across title, company, description
    if keyword and keyword.strip():
        term = f"%{keyword.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(JobListing.title).like(term),
                func.lower(JobListing.company_name).like(term),
                func.lower(JobListing.description_plain).like(term),
                func.lower(JobListing.location_raw).like(term)
            )
        )

    # Company filter
    if company and company.strip():
        query = query.filter(func.lower(JobListing.company_name) == company.strip().lower())

    # Location filter
    if location and location.strip():
        loc_term = f"%{location.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(JobListing.location_raw).like(loc_term),
                func.lower(JobListing.city).like(loc_term),
                func.lower(JobListing.country).like(loc_term)
            )
        )

    # Work mode filter
    if work_mode and work_mode.strip():
        query = query.filter(JobListing.work_mode == work_mode.strip().lower())

    # Employment type filter
    if employment_type and employment_type.strip():
        query = query.filter(JobListing.employment_type == employment_type.strip().lower())

    # Department / Sector filter
    if department and department.strip():
        dept_term = f"%{department.strip().lower()}%"
        query = query.filter(func.lower(JobListing.department).like(dept_term))

    # Experience level heuristic filter
    if experience_level and experience_level.strip():
        exp = experience_level.strip().lower()
        if exp in ("fresher", "entry", "0-1_years"):
            query = query.filter(
                or_(
                    func.lower(JobListing.title).like("%intern%"),
                    func.lower(JobListing.title).like("%junior%"),
                    func.lower(JobListing.title).like("%associate%"),
                    func.lower(JobListing.title).like("%graduate%"),
                    func.lower(JobListing.title).like("%entry%"),
                    JobListing.employment_type == "internship"
                )
            )
        elif exp in ("1-3_years", "junior"):
            query = query.filter(
                ~func.lower(JobListing.title).like("%principal%"),
                ~func.lower(JobListing.title).like("%director%"),
                ~func.lower(JobListing.title).like("%vp%"),
                ~func.lower(JobListing.title).like("%staff%")
            )
        elif exp in ("3-5_years", "mid"):
            query = query.filter(
                ~func.lower(JobListing.title).like("%intern%"),
                ~func.lower(JobListing.title).like("%director%")
            )
        elif exp in ("5+_years", "senior", "lead"):
            query = query.filter(
                or_(
                    func.lower(JobListing.title).like("%senior%"),
                    func.lower(JobListing.title).like("%sr%"),
                    func.lower(JobListing.title).like("%lead%"),
                    func.lower(JobListing.title).like("%staff%"),
                    func.lower(JobListing.title).like("%principal%"),
                    func.lower(JobListing.title).like("%manager%"),
                    func.lower(JobListing.title).like("%architect%")
                )
            )

    # Salary filter
    if min_salary is not None and min_salary > 0:
        query = query.filter(
            or_(
                JobListing.salary_max >= min_salary,
                JobListing.salary_min >= min_salary
            )
        )

    # Date posted filter
    if posted_within_days is not None and posted_within_days > 0:
        from datetime import timedelta
        cutoff = now_utc - timedelta(days=posted_within_days)
        query = query.filter(
            func.coalesce(JobListing.publication_date, JobListing.first_seen_at) >= cutoff
        )

    # Source filter
    if source_id and source_id.strip():
        query = query.filter(JobListing.source_id == source_id.strip())

    # Platform filter (ATS platform or source type)
    if platform and platform.strip():
        p_term = platform.strip().lower()
        query = query.filter(
            or_(
                func.lower(JobSource.ats_platform) == p_term,
                func.lower(JobSource.source_type) == p_term
            )
        )

    # Location classification filters
    if india_feed is True:
        # India-focused feed: India office, India remote, and verified APAC/Worldwide.
        # Explicitly excludes international_only.
        query = query.filter(JobListing.is_india_eligible == True)
    elif india_feed is False:
        query = query.filter(JobListing.is_india_eligible == False)

    if location_category and location_category.strip():
        query = query.filter(JobListing.location_category == location_category.strip().lower())

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    offset = (page - 1) * page_size

    # Sort handler
    from sqlalchemy import case, asc, nullslast
    if sort_by == "newest":
        order_clauses = [desc(func.coalesce(JobListing.publication_date, JobListing.created_at))]
    elif sort_by == "salary_desc":
        order_clauses = [
            nullslast(desc(JobListing.salary_max)),
            nullslast(desc(JobListing.salary_min)),
            desc(func.coalesce(JobListing.publication_date, JobListing.created_at))
        ]
    elif sort_by == "company":
        order_clauses = [
            asc(JobListing.company_name),
            desc(func.coalesce(JobListing.publication_date, JobListing.created_at))
        ]
    elif sort_by == "title":
        order_clauses = [
            asc(JobListing.title),
            desc(func.coalesce(JobListing.publication_date, JobListing.created_at))
        ]
    else:  # "verified" / default: ATS verified first, then newest
        source_priority = case(
            (JobSource.source_type == "ats", 1),
            (JobSource.source_type == "direct_career_page", 2),
            else_=3
        )
        order_clauses = [
            source_priority,
            desc(func.coalesce(JobListing.publication_date, JobListing.created_at))
        ]

    results = query.order_by(*order_clauses).offset(offset).limit(page_size).all()

    # Enrich with source_name and platform
    items = []
    for job in results:
        job_data = JobSummaryResponse.model_validate(job)
        job_data.source_name = job.source.name if job.source else job.source_id
        job_data.platform = (job.source.ats_platform or job.source.source_type or "").lower() if job.source else None
        items.append(job_data)


    return JobListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )

@router.get("/filters", response_model=JobFilterOptionsResponse)
def get_filter_options(db: Session = Depends(get_db)):
    """Returns available distinct filter values for the search UI."""
    companies = [
        c[0] for c in db.query(JobListing.company_name).distinct().order_by(JobListing.company_name).all() if c[0]
    ]
    
    locations = [
        loc[0] for loc in db.query(JobListing.location_raw).filter(
            JobListing.location_raw.isnot(None),
            JobListing.location_raw != ""
        ).distinct().limit(30).all()
    ]
    
    work_modes = ["remote", "hybrid", "on_site"]
    employment_types = ["full_time", "part_time", "contract", "internship"]

    platforms = [
        p[0] for p in db.query(JobSource.ats_platform).filter(
            JobSource.ats_platform.isnot(None),
            JobSource.permission_status == "approved"
        ).distinct().all() if p[0]
    ]

    sources = [
        {"id": s.id, "name": s.name}
        for s in db.query(JobSource).filter(JobSource.permission_status == "approved").all()
    ]

    india_count = db.query(JobListing).filter(
        JobListing.is_duplicate == False,
        JobListing.freshness_status == "active",
        JobListing.is_india_eligible == True
    ).count()

    total_active = db.query(JobListing).filter(
        JobListing.is_duplicate == False,
        JobListing.freshness_status == "active"
    ).count()

    departments = [
        d[0] for d in db.query(JobListing.department).filter(
            JobListing.department.isnot(None),
            JobListing.department != ""
        ).distinct().order_by(JobListing.department).limit(40).all() if d[0]
    ]

    return JobFilterOptionsResponse(
        companies=companies,
        locations=locations,
        work_modes=work_modes,
        employment_types=employment_types,
        departments=departments,
        platforms=platforms,
        sources=sources,
        location_categories=["india_office", "remote_india", "apac_worldwide", "international_only"],
        india_eligible_count=india_count,
        total_active_jobs=total_active
    )

@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Retrieves full details for a single job listing by ID."""
    job = db.query(JobListing).filter(JobListing.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job listing not found")

    resp = JobDetailResponse.model_validate(job)
    resp.source_name = job.source.name if job.source else job.source_id
    resp.platform = (job.source.ats_platform or job.source.source_type or "").lower() if job.source else None
    return resp
