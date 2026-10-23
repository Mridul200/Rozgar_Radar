import json
import base64
import io
import re
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from PIL import Image

from app.database import get_db, utc_now
from app.models.user import User, UserProfile
from app.schemas.user import UserProfileRequest, UserProfileResponse
from app.api.auth_deps import get_current_user
from app.services.resume_parser import parse_resume_file
from app.services.matching_service import invalidate_user_cache

router = APIRouter(prefix="/profile", tags=["User Profile"])

def _serialize_json(val):
    if val is None:
        return None
    if isinstance(val, (list, dict)):
        return json.dumps(val)
    return str(val)

def _deserialize_json(val, default_type=dict):
    if not val:
        return default_type()
    try:
        parsed = json.loads(val)
        if isinstance(parsed, default_type):
            return parsed
        return default_type()
    except Exception:
        return default_type()

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

def calculate_profile_completion(profile: UserProfile, user: User) -> int:
    """
    Computes dynamic profile completeness percentage based on actual saved fields.
    - Basic Info (Full Name, Email, Mobile, City): 20%
    - Education (Qualification, Degree, College): 20%
    - Skills (At least 3 skills): 20%
    - Career Preferences (Industry, Role, Location): 15%
    - Experience: 15% (Freshers receive full 15% automatically so they are not penalized!)
    - Resume: 10%
    """
    score = 0
    # 1. Basic Info (20%)
    if user.full_name and len(user.full_name.strip()) >= 2:
        score += 5
    if user.email and "@" in user.email:
        score += 5
    if profile.mobile_number and len(profile.mobile_number.strip()) >= 10:
        score += 5
    if profile.current_city and len(profile.current_city.strip()) >= 2:
        score += 5

    # 2. Education (20%)
    edu_details = _deserialize_json(profile.education_details, default_type=dict)
    if profile.education or (edu_details and edu_details.get("highest_qualification")):
        score += 10
    if (edu_details and (edu_details.get("college") or edu_details.get("degree"))) or (profile.education and len(profile.education.strip()) > 5):
        score += 10

    # 3. Skills (20%)
    skills_list = _deserialize_list(profile.skills)
    if len(skills_list) >= 3:
        score += 20
    elif len(skills_list) >= 1:
        score += 10

    # 4. Career Preferences (15%)
    career_pref = _deserialize_json(profile.career_preferences, default_type=dict)
    pref_locs = _deserialize_list(profile.preferred_locations)
    pref_roles = _deserialize_list(profile.preferred_roles)
    if pref_locs or (career_pref and career_pref.get("preferred_locations")):
        score += 5
    if pref_roles or (career_pref and (career_pref.get("role_category") or career_pref.get("department"))):
        score += 5
    if career_pref and (career_pref.get("industry") or career_pref.get("desired_job_type")):
        score += 5

    # 5. Experience / Employment (15%)
    is_fresher = (profile.work_status == "fresher") or (profile.experience_level == "fresher")
    if is_fresher:
        score += 15
    else:
        emp_history = _deserialize_json(profile.employment_history, default_type=list)
        if emp_history and len(emp_history) > 0 and emp_history[0].get("company"):
            score += 15
        elif profile.years_experience and profile.years_experience > 0:
            score += 10

    # 6. Resume Uploaded (10%)
    if profile.resume_filename or (profile.resume_text and len(profile.resume_text.strip()) > 50):
        score += 10

    return min(100, max(20, score))


def _to_profile_response(profile: UserProfile, user: User) -> UserProfileResponse:
    score = calculate_profile_completion(profile, user)
    return UserProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        current_city=profile.current_city,
        current_state=profile.current_state,
        mobile_number=profile.mobile_number,
        work_status=profile.work_status or "fresher",
        profile_photo_url=profile.profile_photo_url,
        education_details=_deserialize_json(profile.education_details, default_type=dict),
        employment_history=_deserialize_json(profile.employment_history, default_type=list),
        career_preferences=_deserialize_json(profile.career_preferences, default_type=dict),
        optional_details=_deserialize_json(profile.optional_details, default_type=dict),
        resume_filename=profile.resume_filename,
        profile_completion_pct=score,
        preferred_locations=_deserialize_list(profile.preferred_locations),
        preferred_roles=_deserialize_list(profile.preferred_roles),
        skills=_deserialize_list(profile.skills),
        experience_level=profile.experience_level,
        years_experience=float(profile.years_experience) if profile.years_experience is not None else None,
        education=profile.education,
        preferred_industries=_deserialize_list(profile.preferred_industries),
        employment_types=_deserialize_list(profile.employment_types),
        work_modes=_deserialize_list(profile.work_modes),
        min_salary=float(profile.min_salary) if profile.min_salary is not None else None,
        resume_text=profile.resume_text,
        notification_email=profile.notification_email,
        email_alerts_enabled=profile.email_alerts_enabled,
        onboarding_completed=profile.onboarding_completed,
        updated_at=profile.updated_at
    )


@router.get("", response_model=UserProfileResponse)
def get_user_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        profile = UserProfile(user_id=user.id, profile_completion_pct=25)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return _to_profile_response(profile, user)


@router.put("", response_model=UserProfileResponse)
def update_user_profile(req: UserProfileRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    if req.current_city is not None:
        profile.current_city = req.current_city
    if req.current_state is not None:
        profile.current_state = req.current_state
    if req.mobile_number is not None:
        profile.mobile_number = req.mobile_number
    if req.work_status is not None:
        profile.work_status = req.work_status
    if req.profile_photo_url is not None:
        profile.profile_photo_url = req.profile_photo_url
    if req.education_details is not None:
        profile.education_details = _serialize_json(req.education_details)
        # Also sync legacy education string if available
        if isinstance(req.education_details, dict):
            deg = req.education_details.get("degree") or req.education_details.get("highest_qualification")
            spec = req.education_details.get("specialization")
            if deg and spec:
                profile.education = f"{deg} - {spec}"
            elif deg:
                profile.education = deg
    if req.employment_history is not None:
        profile.employment_history = _serialize_json(req.employment_history)
    if req.career_preferences is not None:
        profile.career_preferences = _serialize_json(req.career_preferences)
        if isinstance(req.career_preferences, dict):
            if req.career_preferences.get("preferred_locations") and not req.preferred_locations:
                profile.preferred_locations = _serialize_list(req.career_preferences.get("preferred_locations"))
            if req.career_preferences.get("industry") and not req.preferred_industries:
                profile.preferred_industries = _serialize_list([req.career_preferences.get("industry")])
    if req.optional_details is not None:
        profile.optional_details = _serialize_json(req.optional_details)
    if req.resume_filename is not None:
        profile.resume_filename = req.resume_filename

    if req.preferred_locations is not None:
        profile.preferred_locations = _serialize_list(req.preferred_locations)
    if req.preferred_roles is not None:
        profile.preferred_roles = _serialize_list(req.preferred_roles)
    if req.skills is not None:
        profile.skills = _serialize_list(req.skills)
    if req.experience_level is not None:
        profile.experience_level = req.experience_level
    if req.years_experience is not None:
        profile.years_experience = req.years_experience
    if req.education is not None:
        profile.education = req.education
    if req.preferred_industries is not None:
        profile.preferred_industries = _serialize_list(req.preferred_industries)
    if req.employment_types is not None:
        profile.employment_types = _serialize_list(req.employment_types)
    if req.work_modes is not None:
        profile.work_modes = _serialize_list(req.work_modes)
    if req.min_salary is not None:
        profile.min_salary = req.min_salary
    if req.resume_text is not None:
        profile.resume_text = req.resume_text
    if req.notification_email is not None:
        profile.notification_email = req.notification_email
    if req.email_alerts_enabled is not None:
        profile.email_alerts_enabled = req.email_alerts_enabled
    if req.onboarding_completed is not None:
        profile.onboarding_completed = req.onboarding_completed

    # Compute and persist updated score
    profile.profile_completion_pct = calculate_profile_completion(profile, user)
    profile.updated_at = utc_now()

    db.commit()
    db.refresh(profile)
    try:
        invalidate_user_cache(db, user.id)
    except Exception:
        pass

    return _to_profile_response(profile, user)


@router.post("/upload-photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Uploads and optimizes user profile photo (JPG, PNG, WebP ≤ 3MB).
    Stores optimized Base64 data URL directly on UserProfile for instant cross-device availability.
    """
    allowed_exts = (".jpg", ".jpeg", ".png", ".webp")
    filename = (file.filename or "").lower()
    if not any(filename.endswith(ext) for ext in allowed_exts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image format. Please upload JPG, JPEG, PNG, or WebP."
        )

    file_bytes = await file.read()
    if len(file_bytes) > 3 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile photo exceeds maximum 3MB limit."
        )

    # Validate image data with Pillow to prevent malicious payloads
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()
        # Re-open for resizing & optimization
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        img.thumbnail((400, 400), Image.Resampling.LANCZOS)
        out_buf = io.BytesIO()
        img.save(out_buf, format="JPEG", quality=85, optimize=True)
        compressed_bytes = out_buf.getvalue()
        b64_str = base64.b64encode(compressed_bytes).decode("utf-8")
        data_url = f"data:image/jpeg;base64,{b64_str}"
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image file: {str(exc)}"
        )

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    profile.profile_photo_url = data_url
    profile.profile_completion_pct = calculate_profile_completion(profile, user)
    profile.updated_at = utc_now()
    db.commit()
    db.refresh(profile)

    return {
        "success": True,
        "photo_url": profile.profile_photo_url,
        "completion_pct": profile.profile_completion_pct
    }


@router.delete("/photo")
def delete_profile_photo(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Removes user's profile photo and reverts to default avatar."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if profile:
        profile.profile_photo_url = None
        profile.profile_completion_pct = calculate_profile_completion(profile, user)
        profile.updated_at = utc_now()
        db.commit()

    return {"success": True, "photo_url": None}


@router.post("/upload-resume")
async def upload_profile_resume(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Parses an uploaded resume file (PDF, DOCX ≤ 5MB) and automatically populates
    profile fields without silently overwriting user-entered data.
    """
    allowed_exts = (".pdf", ".docx")
    filename = (file.filename or "").lower()
    if not any(filename.endswith(ext) for ext in allowed_exts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported resume format. Please upload a PDF or DOCX file."
        )

    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume file exceeds maximum 5MB limit."
        )

    # Perform real server-side parsing
    result = parse_resume_file(file_bytes, file.filename or "resume.pdf")
    parsed = result.get("parsed_data", {})
    raw_text = result.get("raw_text", "")
    warnings = result.get("warnings", [])

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    # Preserve user entered values, fill missing ones
    if not profile.resume_filename:
        profile.resume_filename = file.filename
    profile.resume_text = raw_text

    # Extract & merge skills without duplicates
    existing_skills = _deserialize_list(profile.skills)
    extracted_tech_skills = parsed.get("skills", {}).get("technical", [])
    merged_skills = list(existing_skills)
    for s in extracted_tech_skills:
        clean_s = s.strip()
        if clean_s and clean_s.lower() not in [x.lower() for x in merged_skills]:
            merged_skills.append(clean_s)
    profile.skills = _serialize_list(merged_skills)

    # Extract education if profile does not have full details
    existing_edu = _deserialize_json(profile.education_details, default_type=dict)
    parsed_edu_list = parsed.get("education", [])
    if parsed_edu_list and not existing_edu.get("highest_qualification"):
        top_edu = parsed_edu_list[0]
        deg = top_edu.get("degree", "")
        school = top_edu.get("school", "")
        grad_year = top_edu.get("gradYear", "")

        highest_qual = "Graduation/Bachelors"
        deg_lower = deg.lower()
        if "master" in deg_lower or "m.tech" in deg_lower or "msc" in deg_lower or "mba" in deg_lower:
            highest_qual = "Masters/Post-Graduation"
        elif "phd" in deg_lower or "doctor" in deg_lower:
            highest_qual = "Doctorate/PhD"
        elif "diploma" in deg_lower:
            highest_qual = "Diploma"

        new_edu_details = {
            "highest_qualification": highest_qual,
            "degree": deg,
            "specialization": "Computer Science" if ("computer" in deg_lower or "cs" in deg_lower) else "",
            "college": school,
            "passing_year": grad_year,
            "course_type": "Full-time"
        }
        profile.education_details = _serialize_json(new_edu_details)
        if not profile.education:
            profile.education = f"{deg} - {school}".strip(" -")

    # Extract employment history for experienced candidates
    existing_emp = _deserialize_json(profile.employment_history, default_type=list)
    parsed_exp_list = parsed.get("experience", [])
    if parsed_exp_list:
        if profile.work_status == "fresher" and len(parsed_exp_list) > 0:
            profile.work_status = "experienced"

        if not existing_emp:
            mapped_emp = []
            for item in parsed_exp_list[:5]:
                mapped_emp.append({
                    "company": item.get("company", ""),
                    "designation": item.get("title", ""),
                    "joining_date": item.get("startDate", ""),
                    "last_working_date": item.get("endDate", ""),
                    "current_employment_status": "Employed" if item.get("current") else "Relieved",
                    "notice_period": "30 Days",
                    "current_salary": "",
                    "hide_salary_publicly": False
                })
            profile.employment_history = _serialize_json(mapped_emp)

    # Optional details (Summary, URLs, Projects)
    existing_optional = _deserialize_json(profile.optional_details, default_type=dict)
    if not existing_optional.get("summary") and parsed.get("summary"):
        existing_optional["summary"] = parsed.get("summary")
    if not existing_optional.get("linkedin") and parsed.get("linkedin"):
        existing_optional["linkedin"] = parsed.get("linkedin")
    if not existing_optional.get("github") and parsed.get("github"):
        existing_optional["github"] = parsed.get("github")
    if not existing_optional.get("projects") and parsed.get("projects"):
        existing_optional["projects"] = parsed.get("projects")
    profile.optional_details = _serialize_json(existing_optional)

    # Recalculate completion score
    profile.profile_completion_pct = calculate_profile_completion(profile, user)
    profile.updated_at = utc_now()

    db.commit()
    db.refresh(profile)
    try:
        invalidate_user_cache(db, user.id)
    except Exception:
        pass

    return {
        "success": True,
        "message": "Resume parsed and profile pre-filled successfully.",
        "warnings": warnings,
        "profile": _to_profile_response(profile, user)
    }
