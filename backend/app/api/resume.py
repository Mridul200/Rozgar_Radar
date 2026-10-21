import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User, Resume, UserProfile
from app.models.job import JobListing
from app.schemas.user import (
    ResumeCreateRequest,
    ResumeUpdateRequest,
    ResumeResponse,
    ATSAnalysisRequest,
    ATSAnalysisResponse
)
from app.api.auth_deps import get_current_user, get_optional_user
from app.ai.ats_scorer import analyze_resume_ats

router = APIRouter(prefix="/resumes", tags=["Resume Builder & ATS Checker"])

def _format_resume(r: Resume) -> ResumeResponse:
    content = {}
    if r.content_json:
        try:
            content = json.loads(r.content_json)
        except Exception:
            content = {"text": r.content_json}
    return ResumeResponse(
        id=r.id,
        user_id=r.user_id,
        title=r.title,
        template=r.template,
        content_json=content,
        created_at=r.created_at,
        updated_at=r.updated_at
    )

@router.get("", response_model=List[ResumeResponse])
def get_user_resumes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resumes = db.query(Resume).filter(Resume.user_id == user.id).order_by(desc(Resume.updated_at)).all()
    return [_format_resume(r) for r in resumes]

@router.post("", response_model=ResumeResponse)
def create_resume(req: ResumeCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = Resume(
        user_id=user.id,
        title=req.title,
        template=req.template or "modern",
        content_json=json.dumps(req.content_json)
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return _format_resume(resume)

@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(resume_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return _format_resume(resume)

@router.put("/{resume_id}", response_model=ResumeResponse)
def update_resume(
    resume_id: str,
    req: ResumeUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if req.title is not None:
        resume.title = req.title
    if req.template is not None:
        resume.template = req.template
    if req.content_json is not None:
        resume.content_json = json.dumps(req.content_json)

    db.commit()
    db.refresh(resume)
    return _format_resume(resume)

@router.delete("/{resume_id}")
def delete_resume(resume_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    db.delete(resume)
    db.commit()
    return {"status": "success", "message": "Resume deleted"}

@router.post("/analyze-ats", response_model=ATSAnalysisResponse)
def analyze_ats(
    req: ATSAnalysisRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    resume_text = req.resume_text or ""

    # If resume_id is provided, fetch resume content
    if req.resume_id:
        resume = db.query(Resume).filter(Resume.id == req.resume_id).first()
        if resume:
            try:
                data = json.loads(resume.content_json)
                # Flatten resume structure into plain text for NLP parsing
                parts = []
                if "fullName" in data: parts.append(data["fullName"])
                if "summary" in data: parts.append(data["summary"])
                if "skills" in data: parts.append(" ".join(data.get("skills", [])))
                if "experience" in data:
                    for exp in data.get("experience", []):
                        parts.append(f"{exp.get('title', '')} at {exp.get('company', '')}: {exp.get('description', '')}")
                if "education" in data:
                    for edu in data.get("education", []):
                        parts.append(f"{edu.get('degree', '')} from {edu.get('school', '')}")
                if "projects" in data:
                    for proj in data.get("projects", []):
                        parts.append(f"{proj.get('name', '')}: {proj.get('description', '')}")
                resume_text = "\n".join(parts)
            except Exception:
                resume_text = resume.content_json

    # Fallback to user profile resume_text if still empty
    if not resume_text.strip() and user:
        profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
        if profile and profile.resume_text:
            resume_text = profile.resume_text

    # Resolve job description
    target_role = req.target_role or "Software Engineer"
    jd_text = req.job_description or ""

    if req.job_id:
        job = db.query(JobListing).filter(JobListing.id == req.job_id).first()
        if job:
            target_role = job.title
            jd_text = f"{job.title}\n{job.company_name}\n{job.description_plain or job.description or ''}"

    if not jd_text.strip():
        jd_text = f"Seeking an experienced {target_role} skilled in modern software engineering, web application development, APIs, databases, CI/CD, and collaborative teamwork."

    analysis_result = analyze_resume_ats(
        resume_text=resume_text,
        job_description=jd_text,
        target_role=target_role
    )

    return ATSAnalysisResponse(**analysis_result)
