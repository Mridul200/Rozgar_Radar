import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserProfile
from app.schemas.user import UserProfileRequest, UserProfileResponse
from app.api.auth_deps import get_current_user

router = APIRouter(prefix="/profile", tags=["User Profile"])

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

@router.get("", response_model=UserProfileResponse)
def get_user_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return UserProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        current_city=profile.current_city,
        current_state=profile.current_state,
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
        email_alerts_enabled=profile.email_alerts_enabled,
        onboarding_completed=profile.onboarding_completed,
        updated_at=profile.updated_at
    )

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
    if req.email_alerts_enabled is not None:
        profile.email_alerts_enabled = req.email_alerts_enabled
    if req.onboarding_completed is not None:
        profile.onboarding_completed = req.onboarding_completed

    db.commit()
    db.refresh(profile)

    return UserProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        current_city=profile.current_city,
        current_state=profile.current_state,
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
        email_alerts_enabled=profile.email_alerts_enabled,
        onboarding_completed=profile.onboarding_completed,
        updated_at=profile.updated_at
    )
