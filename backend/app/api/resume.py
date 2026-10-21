import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User, Resume, UserProfile, ATSAnalysis
from app.models.job import JobListing
from app.schemas.user import (
    ResumeCreateRequest,
    ResumeUpdateRequest,
    ResumeResponse,
    ATSAnalysisRequest,
    ATSAnalysisResponse,
    ATSAnalysisHistoryItem,
    ResumeSuggestRequest,
    ResumeSuggestResponse,
    ResumeImportResponse,
)
from app.api.auth_deps import get_current_user, get_optional_user
from app.ai.ats_scorer import analyze_resume_ats
from app.services.resume_parser import parse_resume_file
from app.services.resume_exporter import generate_pdf_resume, generate_docx_resume
from app.services.ai_assistant import (
    generate_summary_ai,
    improve_bullets_ai,
    improve_project_ai,
    enhance_text_ai,
    tailor_resume_ai,
)

from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter(prefix="/resumes", tags=["Resume Builder & ATS Checker"])

_AI_RATE_LIMITS: Dict[str, List[datetime]] = defaultdict(list)
AI_MAX_REQUESTS_PER_HOUR = 40

def check_ai_rate_limit(identifier: str):
    now = datetime.utcnow()
    window_start = now - timedelta(hours=1)
    _AI_RATE_LIMITS[identifier] = [t for t in _AI_RATE_LIMITS[identifier] if t > window_start]
    if len(_AI_RATE_LIMITS[identifier]) >= AI_MAX_REQUESTS_PER_HOUR:
        raise HTTPException(
            status_code=429,
            detail=f"Hourly AI generation limit ({AI_MAX_REQUESTS_PER_HOUR} requests/hr) reached. Please wait a few minutes before generating more AI drafts."
        )
    _AI_RATE_LIMITS[identifier].append(now)

def _format_resume(r: Resume) -> ResumeResponse:
    content = {}
    if r.content_json:
        try:
            content = json.loads(r.content_json)
        except Exception:
            content = {"raw_text": r.content_json}
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
        title=req.title or "My Resume",
        template=req.template or "classic",
        content_json=json.dumps(req.content_json)
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return _format_resume(resume)

@router.post("/import", response_model=ResumeImportResponse)
async def import_resume(
    file: UploadFile = File(...),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Parse an uploaded resume file (PDF, DOCX, TXT) and return structured fields
    and potential extraction warnings for user review.
    """
    allowed_exts = (".pdf", ".docx", ".txt")
    filename = file.filename or "uploaded_resume.pdf"
    if not any(filename.lower().endswith(ext) for ext in allowed_exts):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{filename}'. Please upload a PDF, DOCX, or TXT file."
        )

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 10MB limit.")

    result = parse_resume_file(file_bytes, filename)
    return ResumeImportResponse(
        success=True,
        raw_text=result.get("raw_text", ""),
        parsed_data=result.get("parsed_data", {}),
        warnings=result.get("warnings", [])
    )

@router.post("/ai/suggest", response_model=ResumeSuggestResponse)
def suggest_resume_ai(
    req: ResumeSuggestRequest,
    user: Optional[User] = Depends(get_optional_user)
):
    """
    AI assistant endpoint providing suggestions with strict adherence to facts:
    - Summary generation / refinement
    - Bullet point quantification & active verbs
    - Project description polish
    - General text enhancement
    - Role-based tailoring
    """
    user_id = user.id if user else "anonymous"
    check_ai_rate_limit(user_id)

    task = req.task
    ctx = req.context or {}

    if task == "summary":
        target_role = ctx.get("target_role", "Software Engineer")
        resume_data = {
            "title": target_role,
            "skills": ctx.get("skills", []),
            "summary": ctx.get("current_summary", "")
        }
        variations = generate_summary_ai(resume_data, target_role=target_role)
        primary = variations[0] if variations else ctx.get("current_summary", "")
        return ResumeSuggestResponse(
            original=ctx.get("current_summary", ""),
            suggested=primary,
            variations=variations,
            bullets=[],
            explanation="Generated concise, ATS-optimized summary matching your target role and skills without fabricated experience."
        )

    elif task == "bullets":
        bullet_list = ctx.get("bullets", [])
        bullet_text = "\n".join(bullet_list) if isinstance(bullet_list, list) else str(bullet_list)
        role = ctx.get("role", "Software Engineer")
        company = ctx.get("company", "")
        context_str = f"{role} at {company}".strip()
        
        improved_bullets = improve_bullets_ai(bullet_text, context=context_str)
        primary = "\n".join(improved_bullets)
        return ResumeSuggestResponse(
            original=bullet_text,
            suggested=primary,
            variations=[],
            bullets=improved_bullets,
            explanation="Rephrased achievements using active power verbs and quantifiable impact structures."
        )

    elif task == "project":
        name = ctx.get("project_name", "Software Project")
        tech = ctx.get("tech_stack", "")
        if isinstance(tech, list):
            tech = ", ".join(tech)
        desc = ctx.get("description", "")
        variations = improve_project_ai(name=name, tech=tech, desc=desc)
        primary = variations[0] if variations else desc
        return ResumeSuggestResponse(
            original=desc,
            suggested=primary,
            variations=variations,
            bullets=[],
            explanation="Emphasized architectural complexity, tech stack integration, and system outcomes."
        )

    elif task == "tailor":
        target_role = ctx.get("target_role", "")
        jd = ctx.get("job_description", "")
        resume_data = ctx.get("resume_data", {})
        tailored = tailor_resume_ai(resume_data, jd)
        return ResumeSuggestResponse(
            original=json.dumps(resume_data),
            suggested=json.dumps(tailored),
            variations=[],
            bullets=[],
            explanation=f"Tailored keywords and highlights against {target_role} requirements."
        )

    else:
        text = ctx.get("text", "")
        variations = enhance_text_ai(text)
        primary = variations[0] if variations else text
        return ResumeSuggestResponse(
            original=text,
            suggested=primary,
            variations=variations,
            bullets=[],
            explanation="Enhanced clarity, professional tone, and grammatical flow."
        )

@router.get("/ats/history", response_model=List[ATSAnalysisHistoryItem])
def get_ats_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all past ATS analyses performed by the user."""
    analyses = db.query(ATSAnalysis).filter(ATSAnalysis.user_id == user.id).order_by(desc(ATSAnalysis.created_at)).all()
    results = []
    for a in analyses:
        cat_scores = {}
        rep = {}
        if a.category_scores_json:
            try:
                cat_scores = json.loads(a.category_scores_json)
            except Exception:
                pass
        if a.report_json:
            try:
                rep = json.loads(a.report_json)
            except Exception:
                pass
        results.append(ATSAnalysisHistoryItem(
            id=a.id,
            user_id=a.user_id,
            resume_id=a.resume_id,
            resume_title=a.resume_title,
            target_role=a.target_role,
            company_name=a.company_name,
            overall_score=a.overall_score,
            category_scores=cat_scores,
            report=rep,
            created_at=a.created_at
        ))
    return results

@router.get("/ats/history/{analysis_id}", response_model=ATSAnalysisHistoryItem)
def get_ats_history_item(
    analysis_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analysis = db.query(ATSAnalysis).filter(ATSAnalysis.id == analysis_id, ATSAnalysis.user_id == user.id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis report not found.")

    cat_scores = {}
    rep = {}
    if analysis.category_scores_json:
        try:
            cat_scores = json.loads(analysis.category_scores_json)
        except Exception:
            pass
    if analysis.report_json:
        try:
            rep = json.loads(analysis.report_json)
        except Exception:
            pass

    return ATSAnalysisHistoryItem(
        id=analysis.id,
        user_id=analysis.user_id,
        resume_id=analysis.resume_id,
        resume_title=analysis.resume_title,
        target_role=analysis.target_role,
        company_name=analysis.company_name,
        overall_score=analysis.overall_score,
        category_scores=cat_scores,
        report=rep,
        created_at=analysis.created_at
    )

@router.delete("/ats/history/{analysis_id}")
def delete_ats_history_item(
    analysis_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analysis = db.query(ATSAnalysis).filter(ATSAnalysis.id == analysis_id, ATSAnalysis.user_id == user.id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis report not found.")
    db.delete(analysis)
    db.commit()
    return {"status": "success", "message": "Analysis report deleted."}

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

@router.post("/{resume_id}/duplicate", response_model=ResumeResponse)
def duplicate_resume(
    resume_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    original = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Original resume not found")

    copy_resume = Resume(
        user_id=user.id,
        title=f"{original.title} (Copy)",
        template=original.template,
        content_json=original.content_json
    )
    db.add(copy_resume)
    db.commit()
    db.refresh(copy_resume)
    return _format_resume(copy_resume)

@router.delete("/{resume_id}")
def delete_resume(resume_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    db.delete(resume)
    db.commit()
    return {"status": "success", "message": "Resume deleted"}

@router.get("/{resume_id}/export/pdf")
def export_resume_pdf(
    resume_id: str,
    template: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        content = json.loads(resume.content_json)
    except Exception:
        content = {}

    tpl = template or resume.template or "classic"
    pdf_bytes = generate_pdf_resume(content, template=tpl)
    safe_title = "".join(c for c in resume.title if c.isalnum() or c in (" ", "-", "_")).strip() or "Resume"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_title}.pdf"'
        }
    )

@router.get("/{resume_id}/export/docx")
def export_resume_docx(
    resume_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        content = json.loads(resume.content_json)
    except Exception:
        content = {}

    docx_bytes = generate_docx_resume(content)
    safe_title = "".join(c for c in resume.title if c.isalnum() or c in (" ", "-", "_")).strip() or "Resume"

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_title}.docx"'
        }
    )

@router.post("/analyze-ats", response_model=ATSAnalysisResponse)
def analyze_ats(
    req: ATSAnalysisRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    resume_text = req.resume_text or ""
    resume_title = "Uploaded Resume"

    # If resume_id is provided, fetch resume content
    if req.resume_id:
        resume_q = db.query(Resume).filter(Resume.id == req.resume_id)
        if user:
            resume_q = resume_q.filter(Resume.user_id == user.id)
        resume = resume_q.first()
        if not resume and user:
            raise HTTPException(status_code=404, detail="Selected resume not found or access denied")
        if resume:
            resume_title = resume.title
            try:
                data = json.loads(resume.content_json)
                parts = []
                if "fullName" in data: parts.append(data["fullName"])
                if "title" in data: parts.append(data["title"])
                if "summary" in data: parts.append(data["summary"])
                if "skills" in data:
                    s_list = data.get("skills", [])
                    if isinstance(s_list, list):
                        parts.append("Skills: " + ", ".join(s_list))
                if "experience" in data:
                    for exp in data.get("experience", []):
                        parts.append(f"{exp.get('title', '')} at {exp.get('company', '')}: {exp.get('description', '')}")
                        if exp.get("bullets"):
                            parts.append("\n".join(exp.get("bullets", [])))
                if "education" in data:
                    for edu in data.get("education", []):
                        parts.append(f"{edu.get('degree', '')} from {edu.get('school', '')} {edu.get('year', '')}")
                if "projects" in data:
                    for proj in data.get("projects", []):
                        parts.append(f"{proj.get('name', '')} ({', '.join(proj.get('technologies', []))}): {proj.get('description', '')}")
                if "certifications" in data:
                    for cert in data.get("certifications", []):
                        parts.append(f"Certification: {cert.get('name', '')} by {cert.get('issuer', '')}")
                resume_text = "\n\n".join(parts)
            except Exception:
                resume_text = resume.content_json

    # Fallback to user profile resume_text if still empty
    if not resume_text.strip() and user:
        profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
        if profile and profile.resume_text:
            resume_text = profile.resume_text

    # Resolve job description & target role
    target_role = req.target_role or "Software Engineer"
    company_name = req.company_name or ""
    jd_text = req.job_description or ""

    if req.job_id:
        job = db.query(JobListing).filter(JobListing.id == req.job_id).first()
        if job:
            target_role = job.title
            company_name = job.company_name or ""
            jd_text = f"{job.title}\n{job.company_name}\n{job.description_plain or job.description or ''}"

    if not jd_text.strip():
        jd_text = f"Seeking an experienced {target_role} skilled in modern software engineering, web application development, APIs, databases, CI/CD, and collaborative teamwork."

    analysis_result = analyze_resume_ats(
        resume_text=resume_text,
        job_description=jd_text,
        target_role=target_role,
        company_name=company_name
    )

    analysis_id = None
    if user:
        # Save analysis to database for user history
        ats_record = ATSAnalysis(
            user_id=user.id,
            resume_id=req.resume_id,
            resume_title=resume_title,
            target_role=target_role,
            company_name=company_name,
            overall_score=analysis_result["overall_score"],
            category_scores_json=json.dumps(analysis_result.get("subscores", {})),
            report_json=json.dumps(analysis_result)
        )
        db.add(ats_record)
        db.commit()
        db.refresh(ats_record)
        analysis_id = ats_record.id

    analysis_result["analysis_id"] = analysis_id
    analysis_result["resume_id"] = req.resume_id
    analysis_result["resume_title"] = resume_title
    analysis_result["target_role"] = target_role
    analysis_result["company_name"] = company_name

    return ATSAnalysisResponse(**analysis_result)
