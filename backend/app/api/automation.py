import os
import json
from services.email_service import (
    send_email,
    is_smtp_configured,
    get_smtp_config,
    render_digest_template
)
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func

from app.database import get_db
from app.models.user import User, UserProfile, AutomationConfig, AutomationLog
from app.models.job import JobListing
from app.schemas.user import AutomationConfigRequest, AutomationConfigResponse, AutomationLogResponse
from app.api.auth_deps import get_current_user
from app.api.sync import verify_admin
from services.delivery_schedule import next_delivery_moment, normalize_frequency

router = APIRouter(prefix="/automation", tags=["Daily Job Automation"])

def _is_smtp_configured() -> bool:
    return is_smtp_configured()

def _scheduler_active() -> bool:
    """True only when this process's background digest worker is actually running."""
    from services.digest_scheduler import get_scheduler_status
    return get_scheduler_status()["digest_worker_alive"]

def _cfg(config: Optional[AutomationConfig], attr: str):
    return getattr(config, attr, None) if config is not None else None

_SENIOR_TITLE_KEYWORDS = ("senior", "sr.", "sr ", "lead", "principal", "staff", "head of", "director", "manager", "architect")
_ENTRY_TITLE_KEYWORDS = ("intern", "internship", "trainee", "graduate", "fresher", "junior", "jr", "entry level", "assistant")

# Which inferred job seniorities fit each configured experience bucket
_EXPERIENCE_COMPATIBILITY = {
    "fresher": {"entry"},
    "0-1_years": {"entry"},
    "1-3_years": {"entry", "mid"},
    "3-5_years": {"mid", "senior"},
    "5+_years": {"mid", "senior"},
}

def _infer_job_seniority(job: JobListing) -> Optional[str]:
    title = (job.normalized_title or job.title or "").lower()
    if any(k in title for k in _ENTRY_TITLE_KEYWORDS):
        return "entry"
    if any(k in title for k in _SENIOR_TITLE_KEYWORDS):
        return "senior"
    return "mid"

def _experience_compatible(level: str, seniority: str) -> bool:
    allowed = _EXPERIENCE_COMPATIBILITY.get(level.strip().lower())
    if not allowed:
        return True  # unknown bucket: do not penalize
    return seniority in allowed

def _annual_salary_inr(job: JobListing) -> Optional[float]:
    """Job salary normalized to INR per year; None when unknown/foreign currency."""
    if job.salary_min is None:
        return None
    if (job.salary_currency or "INR").upper() != "INR":
        return None  # no FX table: skip cross-currency comparisons
    value = float(job.salary_min)
    if value < 100:  # sub-100 INR figures are stored as lakhs per annum
        value *= 100000
    return value

def _serialize_list(val):
    if val is None:
        return None
    if isinstance(val, list):
        return json.dumps(val)
    return str(val)

def _deserialize_list(val):
    if not val:
        return []
    try:
        parsed = json.loads(val)
        if isinstance(parsed, list):
            return parsed
        return [str(parsed)]
    except Exception:
        return [item.strip() for item in val.split(",") if item.strip()]

def calculate_match_score(job: JobListing, config: Optional[AutomationConfig], profile: Optional[UserProfile]) -> tuple[int, List[str]]:
    score = 40  # Base score for an active job
    reasons = []

    # 1. Location & India eligibility
    if job.is_india_eligible:
        score += 20
        reasons.append("Eligible for India candidates")

    preferred_locations = _deserialize_list(_cfg(config, "preferred_locations"))
    if not preferred_locations and profile:
        preferred_locations = _deserialize_list(profile.preferred_locations)

    if preferred_locations:
        loc_str = f"{job.location_raw or ''} {job.city or ''} {job.country or ''}".lower()
        matched_loc = any(loc.lower() in loc_str for loc in preferred_locations)
        if matched_loc:
            score += 15
            reasons.append("Matches preferred location")

    # 2. Title & Role matching
    preferred_titles = _deserialize_list(_cfg(config, "preferred_titles"))
    if not preferred_titles and profile:
        preferred_titles = _deserialize_list(profile.preferred_roles)

    job_title_norm = (job.normalized_title or job.title or "").lower()
    if preferred_titles:
        matched_title = any(t.lower() in job_title_norm for t in preferred_titles)
        if matched_title:
            score += 20
            reasons.append("Matches target role")
        else:
            # Check partial keyword match
            words = [w for t in preferred_titles for w in t.lower().split() if len(w) > 3]
            if any(w in job_title_norm for w in words):
                score += 10
                reasons.append("Relevant role keywords")

    # 3. Work mode
    preferred_modes = _deserialize_list(_cfg(config, "work_modes"))
    if not preferred_modes and profile:
        preferred_modes = _deserialize_list(profile.work_modes)

    if preferred_modes and job.work_mode in preferred_modes:
        score += 10
        reasons.append(f"Matches preferred work mode ({job.work_mode})")

    # 4. Skills matching
    preferred_skills = _deserialize_list(_cfg(config, "preferred_skills"))
    if not preferred_skills and profile:
        preferred_skills = _deserialize_list(profile.skills)

    if preferred_skills:
        job_desc = f"{job.title} {job.description_plain or ''}".lower()
        matched_skills = [s for s in preferred_skills if s.lower() in job_desc]
        if matched_skills:
            score += min(15, len(matched_skills) * 5)
            reasons.append(f"Matches skills: {', '.join(matched_skills[:3])}")

    # 5. Minimum salary expectation (INR per year; LPA values are auto-scaled)
    min_salary = _cfg(config, "min_salary")
    if min_salary is None and profile is not None:
        min_salary = profile.min_salary
    if min_salary:
        threshold = float(min_salary)
        if threshold < 1000:  # stored as LPA
            threshold *= 100000
        job_annual = _annual_salary_inr(job)
        if job_annual is not None:
            if job_annual >= threshold:
                score += 8
                reasons.append("Meets minimum salary expectation")
            else:
                score -= 6
                reasons.append("Below minimum salary expectation")

    # 6. Experience-level fit (inferred from the job title)
    experience_level = _cfg(config, "experience_level")
    if not experience_level and profile is not None:
        experience_level = profile.experience_level
    if experience_level:
        seniority = _infer_job_seniority(job)
        if seniority:
            if _experience_compatible(str(experience_level), seniority):
                score += 8
                reasons.append("Matches experience level")
            else:
                score -= 8
                reasons.append("Experience level may not align")

    final_score = min(98, max(25, score))
    return final_score, reasons

@router.get("", response_model=AutomationConfigResponse)
def get_automation_config(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = db.query(AutomationConfig).filter(AutomationConfig.user_id == user.id).first()
    if not config:
        config = AutomationConfig(
            user_id=user.id,
            is_active=True,
            delivery_frequency="daily",
            delivery_time="09:00",
            timezone="Asia/Kolkata",
            min_match_score=60,
            next_run_at=next_delivery_moment(datetime.now(timezone.utc), "09:00", "Asia/Kolkata", "daily")
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()

    return AutomationConfigResponse(
        id=config.id,
        user_id=config.user_id,
        is_active=config.is_active,
        notification_email=profile.notification_email if profile else None,
        preferred_titles=_deserialize_list(config.preferred_titles),
        preferred_locations=_deserialize_list(config.preferred_locations),
        preferred_skills=_deserialize_list(config.preferred_skills),
        work_modes=_deserialize_list(config.work_modes),
        experience_level=config.experience_level,
        min_salary=float(config.min_salary) if config.min_salary is not None else None,
        delivery_frequency=config.delivery_frequency,
        delivery_time=config.delivery_time,
        timezone=config.timezone,
        min_match_score=config.min_match_score,
        last_run_at=config.last_run_at,
        next_run_at=config.next_run_at,
        updated_at=config.updated_at,
        email_provider_configured=_is_smtp_configured(),
        scheduler_active=_scheduler_active()
    )

@router.put("", response_model=AutomationConfigResponse)
def update_automation_config(
    req: AutomationConfigRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    config = db.query(AutomationConfig).filter(AutomationConfig.user_id == user.id).first()
    if not config:
        config = AutomationConfig(user_id=user.id)
        db.add(config)

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if profile and req.notification_email is not None:
        profile.notification_email = req.notification_email.strip().lower() if req.notification_email.strip() else None

    config.is_active = req.is_active
    if req.preferred_titles is not None:
        config.preferred_titles = _serialize_list(req.preferred_titles)
    if req.preferred_locations is not None:
        config.preferred_locations = _serialize_list(req.preferred_locations)
    if req.preferred_skills is not None:
        config.preferred_skills = _serialize_list(req.preferred_skills)
    if req.work_modes is not None:
        config.work_modes = _serialize_list(req.work_modes)
    if req.experience_level is not None:
        config.experience_level = req.experience_level
    if req.min_salary is not None:
        config.min_salary = req.min_salary
    if req.delivery_frequency is not None:
        config.delivery_frequency = req.delivery_frequency
    if req.delivery_time is not None:
        config.delivery_time = req.delivery_time
    if req.timezone is not None:
        config.timezone = req.timezone
    if req.min_match_score is not None:
        config.min_match_score = req.min_match_score

    # Normalize schedule fields and compute the next scheduled delivery moment
    now = datetime.now(timezone.utc)
    config.delivery_frequency = normalize_frequency(config.delivery_frequency)
    config.next_run_at = next_delivery_moment(
        now, config.delivery_time, config.timezone, config.delivery_frequency
    )

    db.commit()
    db.refresh(config)

    return AutomationConfigResponse(
        id=config.id,
        user_id=config.user_id,
        is_active=config.is_active,
        notification_email=profile.notification_email if profile else None,
        preferred_titles=_deserialize_list(config.preferred_titles),
        preferred_locations=_deserialize_list(config.preferred_locations),
        preferred_skills=_deserialize_list(config.preferred_skills),
        work_modes=_deserialize_list(config.work_modes),
        experience_level=config.experience_level,
        min_salary=float(config.min_salary) if config.min_salary is not None else None,
        delivery_frequency=config.delivery_frequency,
        delivery_time=config.delivery_time,
        timezone=config.timezone,
        min_match_score=config.min_match_score,
        last_run_at=config.last_run_at,
        next_run_at=config.next_run_at,
        updated_at=config.updated_at,
        email_provider_configured=_is_smtp_configured(),
        scheduler_active=_scheduler_active()
    )

@router.get("/preview")
def preview_matching_jobs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = db.query(AutomationConfig).filter(AutomationConfig.user_id == user.id).first()
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()

    if not config:
        config = AutomationConfig(user_id=user.id)

    # Base query: active, non-duplicate jobs
    query = db.query(JobListing).filter(
        JobListing.is_duplicate == False,
        JobListing.freshness_status == "active"
    )

    # Prefer India eligible
    # Prefer India-eligible jobs, then recency; wide window so the digest
    # is not starved by large batches of international postings
    candidates = query.order_by(
        desc(JobListing.is_india_eligible), desc(JobListing.publication_date)
    ).limit(300).all()

    matches = []
    min_threshold = config.min_match_score or 60

    for job in candidates:
        score, reasons = calculate_match_score(job, config, profile)
        if score >= min_threshold:
            has_full_desc = bool(job.description_plain and len(job.description_plain.strip()) > 120)
            confidence = "Likely match" if (job.is_india_eligible and has_full_desc and score >= 70) else "Eligibility not fully verified"
            matches.append({
                "job_id": job.id,
                "title": job.title,
                "company_name": job.company_name,
                "location_raw": job.location_raw,
                "work_mode": job.work_mode,
                "employment_type": job.employment_type,
                "salary_display": f"₹{job.salary_min:.1f} LPA+" if (job.salary_min and (job.salary_currency or 'INR') == 'INR' and job.salary_min < 100) else ("Not specified" if not job.salary_min else f"{job.salary_currency or ''} {job.salary_min:,.0f}+"),
                "is_india_eligible": job.is_india_eligible,
                "location_category": job.location_category,
                "application_url": job.application_url,
                "match_score": score,
                "eligibility_confidence": confidence,
                "match_reasons": reasons,
                "source_name": job.source.name if job.source else job.source_id,
                "publication_date": job.publication_date
            })

    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return {
        "total_matches": len(matches),
        "threshold": min_threshold,
        "email_provider_configured": _is_smtp_configured(),
        "scheduler_active": _scheduler_active(),
        "sample_jobs": matches[:10]
    }

@router.post("/trigger")
def trigger_automation_digest(
    is_test: bool = Query(False, description="Whether this is a test simulation"),
    target_email: Optional[str] = Query(None, description="Target recipient email address. Defaults to configured notification email or account email."),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    config = db.query(AutomationConfig).filter(AutomationConfig.user_id == user.id).first()
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not config:
        raise HTTPException(status_code=400, detail="Automation configuration not found")

    # Determine recipient
    recipient = (target_email or (profile.notification_email if profile and profile.notification_email else user.email)).strip().lower()
    if target_email and profile:
        profile.notification_email = recipient
        db.commit()

    # Collect previous sent job IDs to exclude duplicate sends
    prev_logs = db.query(AutomationLog).filter(AutomationLog.user_id == user.id).all()
    already_sent_ids = set()
    for l in prev_logs:
        if l.sent_job_ids:
            try:
                for j_id in json.loads(l.sent_job_ids):
                    already_sent_ids.add(j_id)
            except Exception:
                pass

    query = db.query(JobListing).filter(
        JobListing.is_duplicate == False,
        JobListing.freshness_status == "active"
    )
    # Prefer India-eligible jobs, then recency; wide window so the digest
    # is not starved by large batches of international postings
    candidates = query.order_by(
        desc(JobListing.is_india_eligible), desc(JobListing.publication_date)
    ).limit(300).all()

    matched_jobs = []
    min_threshold = config.min_match_score or 60

    for job in candidates:
        if job.id in already_sent_ids and not is_test:
            continue
        score, reasons = calculate_match_score(job, config, profile)
        if score >= min_threshold:
            matched_jobs.append((job, score, reasons))

    matched_jobs.sort(key=lambda x: x[1], reverse=True)
    top_jobs = matched_jobs[:10]

    # --- Email dispatch (if not a test run) ---
    email_sent = False
    email_error = None
    if not is_test and is_smtp_configured():
        try:
            today_str = datetime.now(timezone.utc).strftime("%B %d, %Y")
            subject = f"🎯 Rozgar Radar: {len(top_jobs)} Recommended Job Matches – {today_str}"
            
            jobs_for_template = [
                {
                    "title": j[0].title,
                    "company_name": j[0].company_name,
                    "location_raw": j[0].location_raw,
                    "city": j[0].city,
                    "work_mode": j[0].work_mode,
                    "application_url": j[0].application_url,
                    "match_score": j[1],
                    "match_reasons": j[2]
                }
                for j in top_jobs
            ]
            
            body_html = render_digest_template(
                user_name=user.full_name or "Job Seeker",
                jobs=jobs_for_template,
                date_str=today_str
            )
            
            send_email(
                to_address=recipient,
                subject=subject,
                html_body=body_html,
                plain_body=f"Rozgar Radar found {len(top_jobs)} job matches for you today."
            )
            email_sent = True
        except Exception as exc:
            email_error = str(exc)
            email_sent = False

    sent_ids = [j[0].id for j in top_jobs]
    now = datetime.now(timezone.utc)

    status_str = "success" if top_jobs else "no_matches"
    if not is_test and not email_sent and is_smtp_configured() and top_jobs:
        status_str = "email_error"
        error_message = email_error
    else:
        error_message = None

    log = AutomationLog(
        user_id=user.id,
        jobs_found=len(matched_jobs),
        jobs_sent=len(top_jobs),
        status=status_str,
        sent_job_ids=json.dumps(sent_ids),
        error_message=error_message
    )
    db.add(log)

    config.last_run_at = now
    config.next_run_at = now + timedelta(days=1)
    db.commit()
    db.refresh(log)

    return {
        "status": status_str,
        "is_test": is_test,
        "email_sent": email_sent,
        "recipient_email": recipient,
        "jobs_found": len(matched_jobs),
        "jobs_delivered": len(top_jobs),
        "delivered_jobs": [
            {
                "id": j[0].id,
                "title": j[0].title,
                "company_name": j[0].company_name,
                "location_raw": j[0].location_raw,
                "application_url": j[0].application_url,
                "match_score": j[1],
                "match_reasons": j[2]
            }
            for j in top_jobs
        ],
        "message": f"Successfully processed digest with {len(top_jobs)} matching jobs for {recipient}."
    }

@router.post("/test-email")
def send_test_email(
    target_email: Optional[str] = Query(None, description="Optional recipient email. Defaults to logged-in user."),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sends a verification test email to verify SMTP delivery."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    recipient = (target_email or (profile.notification_email if profile and profile.notification_email else user.email)).strip().lower()
    if target_email and profile:
        profile.notification_email = recipient
        db.commit()
    if not is_smtp_configured():
        raise HTTPException(
            status_code=500,
            detail="SMTP server is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env"
        )
    
    cfg = get_smtp_config()
    test_html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; padding: 24px; text-align: left;">
                <h2 style="margin: 0; font-size: 20px;">🎯 Rozgar Radar &bull; Email Delivery Test</h2>
                <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Automated Notification Pipeline Verification</p>
            </div>
            <div style="padding: 24px;">
                <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Hello <strong>{user.full_name}</strong>,</p>
                <p style="font-size: 14px; color: #475569; line-height: 1.5;">
                    This is an automated test message from <strong>Rozgar Radar</strong>. Your SMTP configuration is fully active, authenticated, and ready to deliver real-time job alerts and daily digests!
                </p>
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 14px; margin: 18px 0; border-radius: 6px;">
                    <p style="margin: 0; font-weight: bold; color: #15803d; font-size: 14px;">✔ SMTP Connection Status: Operational</p>
                    <p style="margin: 4px 0 0 0; color: #166534; font-size: 12px;">Server: {cfg['host']}:{cfg['port']} &bull; Sender: {cfg['sender']}</p>
                    <p style="margin: 2px 0 0 0; color: #166534; font-size: 12px;">Recipient: {recipient}</p>
                </div>
                <p style="font-size: 13px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 14px;">
                    Rozgar Radar &bull; Automated AI Job Discovery
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    try:
        send_email(
            to_address=recipient,
            subject="Rozgar Radar – Verification Test Email",
            html_body=test_html,
            plain_body=f"Rozgar Radar test email successfully delivered to {recipient}."
        )
        return {
            "success": True,
            "recipient": recipient,
            "sender": cfg["sender"],
            "message": f"Verification email successfully sent to {recipient}!"
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(exc)}")

@router.get("/logs", response_model=List[AutomationLogResponse])
def get_automation_logs(
    limit: int = Query(10, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = db.query(AutomationLog).filter(
        AutomationLog.user_id == user.id
    ).order_by(desc(AutomationLog.created_at)).limit(limit).all()

    return [
        AutomationLogResponse(
            id=l.id,
            user_id=l.user_id,
            jobs_found=l.jobs_found,
            jobs_sent=l.jobs_sent,
            status=l.status,
            sent_job_ids=_deserialize_list(l.sent_job_ids),
            error_message=l.error_message,
            created_at=l.created_at
        )
        for l in logs
    ]

@router.get("/scheduler-status")
def scheduler_status(user: User = Depends(get_current_user)):
    """Reports real liveness of the background digest worker and email provider state."""
    from services.digest_scheduler import get_scheduler_status
    status = get_scheduler_status()
    return {
        "digest_worker_alive": status["digest_worker_alive"],
        "last_tick_at": status["last_tick_at"],
        "email_provider_configured": _is_smtp_configured(),
    }

@router.post("/trigger-all")
def trigger_all_digests(
    force: bool = Query(False, description="Force run even if the scheduled moment has not elapsed"),
    authorized: bool = Depends(verify_admin)
):
    """
    Admin-protected: triggers automated digests for all eligible users with active configurations.
    """
    from services.digest_scheduler import run_all_due_daily_digests
    result = run_all_due_daily_digests(force=force)
    return {
        "status": "success",
        "result": result
    }
