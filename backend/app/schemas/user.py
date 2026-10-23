from typing import Optional, List, Dict, Any
from datetime import datetime
import re
from pydantic import BaseModel, Field, ConfigDict, field_validator

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$")

def validate_email_format(email: str) -> str:
    if not email or not isinstance(email, str):
        raise ValueError("Please enter a valid email address.")
    trimmed = email.strip()
    if len(trimmed) == 0 or len(trimmed) > 254:
        raise ValueError("Please enter a valid email address.")
    if "@" not in trimmed:
        raise ValueError("Please enter a valid email address.")
    parts = trimmed.split("@")
    if len(parts) != 2:
        raise ValueError("Please enter a valid email address.")
    local_part, domain_part = parts
    if not local_part or not domain_part:
        raise ValueError("Please enter a valid email address.")
    if "." not in domain_part:
        raise ValueError("Please enter a valid email address.")
    domain_parts = domain_part.split(".")
    tld = domain_parts[-1]
    if len(tld) < 2:
        raise ValueError("Please enter a valid email address.")
    if not EMAIL_REGEX.match(trimmed):
        raise ValueError("Please enter a valid email address.")
    return trimmed.lower()

class UserRegisterRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    otp: Optional[str] = None

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_format(v)

class UserLoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_format(v)

class SendOTPRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_format(v)

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str = Field(..., min_length=6, max_length=6)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_format(v)

    @field_validator("otp")
    @classmethod
    def check_otp(cls, v: str) -> str:
        trimmed = v.strip()
        if not re.match(r"^\d{6}$", trimmed):
            raise ValueError("OTP must be exactly 6 digits.")
        return trimmed

class ResendOTPRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_format(v)

class OTPStatusResponse(BaseModel):
    status: str
    message: str
    email: str
    cooldown_seconds: int = 60

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_verified: bool = True
    email_verified_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserProfileRequest(BaseModel):
    current_city: Optional[str] = None
    current_state: Optional[str] = None
    preferred_locations: Optional[List[str]] = None
    preferred_roles: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    experience_level: Optional[str] = None
    years_experience: Optional[float] = None
    education: Optional[str] = None
    preferred_industries: Optional[List[str]] = None
    employment_types: Optional[List[str]] = None
    work_modes: Optional[List[str]] = None
    min_salary: Optional[float] = None
    resume_text: Optional[str] = None
    notification_email: Optional[str] = None
    email_alerts_enabled: Optional[bool] = True
    onboarding_completed: Optional[bool] = None

class UserProfileResponse(BaseModel):
    id: str
    user_id: str
    current_city: Optional[str] = None
    current_state: Optional[str] = None
    preferred_locations: List[str] = []
    preferred_roles: List[str] = []
    skills: List[str] = []
    experience_level: Optional[str] = None
    years_experience: Optional[float] = None
    education: Optional[str] = None
    preferred_industries: List[str] = []
    employment_types: List[str] = []
    work_modes: List[str] = []
    min_salary: Optional[float] = None
    resume_text: Optional[str] = None
    notification_email: Optional[str] = None
    email_alerts_enabled: bool = True
    onboarding_completed: bool = False
    updated_at: datetime

class SavedJobCreateRequest(BaseModel):
    job_id: str
    status: Optional[str] = "saved"
    notes: Optional[str] = None

class SavedJobUpdateRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    applied_at: Optional[datetime] = None

class SavedJobResponse(BaseModel):
    id: str
    user_id: str
    job_id: str
    status: str
    notes: Optional[str] = None
    applied_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    # Attached job summary data
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    location_raw: Optional[str] = None
    work_mode: Optional[str] = None
    employment_type: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    application_url: Optional[str] = None
    source_name: Optional[str] = None
    is_india_eligible: Optional[bool] = None

class AutomationConfigRequest(BaseModel):
    is_active: bool = True
    notification_email: Optional[str] = None
    preferred_titles: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    work_modes: Optional[List[str]] = None
    experience_level: Optional[str] = None
    min_salary: Optional[float] = None
    delivery_frequency: Optional[str] = "daily"
    delivery_time: Optional[str] = "09:00"
    timezone: Optional[str] = "Asia/Kolkata"
    min_match_score: Optional[int] = 60

class AutomationConfigResponse(BaseModel):
    id: str
    user_id: str
    is_active: bool
    notification_email: Optional[str] = None
    preferred_titles: List[str] = []
    preferred_locations: List[str] = []
    preferred_skills: List[str] = []
    work_modes: List[str] = []
    experience_level: Optional[str] = None
    min_salary: Optional[float] = None
    delivery_frequency: str = "daily"
    delivery_time: str = "09:00"
    timezone: str = "Asia/Kolkata"
    min_match_score: int = 60
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    updated_at: datetime
    email_provider_configured: bool = False
    scheduler_active: bool = True

class AutomationLogResponse(BaseModel):
    id: str
    user_id: str
    jobs_found: int
    jobs_sent: int
    status: str
    sent_job_ids: List[str] = []
    error_message: Optional[str] = None
    created_at: datetime

class ResumeCreateRequest(BaseModel):
    title: str = "My Resume"
    template: str = "classic"
    content_json: Dict[str, Any]

class ResumeUpdateRequest(BaseModel):
    title: Optional[str] = None
    template: Optional[str] = None
    content_json: Optional[Dict[str, Any]] = None

class ResumeResponse(BaseModel):
    id: str
    user_id: str
    title: str
    template: str
    content_json: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

class ATSAnalysisRequest(BaseModel):
    resume_text: Optional[str] = None
    resume_id: Optional[str] = None
    job_id: Optional[str] = None
    job_description: Optional[str] = None
    target_role: Optional[str] = None
    company_name: Optional[str] = None

class SkillMatchItem(BaseModel):
    skill: str
    found: bool
    category: str  # technical, soft, domain, tool

class ATSAnalysisResponse(BaseModel):
    overall_score: int
    match_level: str  # "High", "Moderate", "Needs Improvement"
    matched_skills: List[str]
    missing_skills: List[str]
    skill_breakdown: List[SkillMatchItem] = []
    experience_score: int = 0
    readability_score: int = 0
    keyword_coverage_percent: int = 0
    formatting_observations: List[str] = []
    actionable_suggestions: List[str] = []
    evidence_snippets: List[str] = []
    role_alignment_notes: str = ""
    disclaimer: str = ""
    subscores: Optional[Dict[str, int]] = None
    keyword_analysis: Optional[Dict[str, Any]] = None
    formatting_warnings: Optional[List[Dict[str, Any]]] = None
    prioritized_improvements: Optional[List[Dict[str, Any]]] = None
    analysis_id: Optional[str] = None
    resume_id: Optional[str] = None
    resume_title: Optional[str] = None
    target_role: Optional[str] = None
    company_name: Optional[str] = None

class ATSAnalysisHistoryItem(BaseModel):
    id: str
    user_id: str
    resume_id: Optional[str] = None
    resume_title: Optional[str] = None
    target_role: Optional[str] = None
    company_name: Optional[str] = None
    overall_score: int
    category_scores: Dict[str, Any]
    report: Dict[str, Any]
    created_at: datetime

class ResumeSuggestRequest(BaseModel):
    task: str  # "summary" | "bullets" | "project" | "enhance" | "tailor"
    context: Dict[str, Any]

class ResumeSuggestResponse(BaseModel):
    original: str = ""
    suggested: str = ""
    variations: List[str] = []
    bullets: List[str] = []
    explanation: str = ""

class ResumeImportResponse(BaseModel):
    success: bool
    raw_text: str
    parsed_data: Dict[str, Any]
    warnings: List[str] = []
