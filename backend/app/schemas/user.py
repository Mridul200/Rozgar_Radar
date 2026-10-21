from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
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
    template: str = "modern"
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

class SkillMatchItem(BaseModel):
    skill: str
    found: bool
    category: str  # technical, soft, domain, tool

class ATSAnalysisResponse(BaseModel):
    overall_score: int
    match_level: str  # "High", "Moderate", "Needs Improvement"
    matched_skills: List[str]
    missing_skills: List[str]
    skill_breakdown: List[SkillMatchItem]
    experience_score: int
    readability_score: int
    keyword_coverage_percent: int
    formatting_observations: List[str]
    actionable_suggestions: List[str]
    evidence_snippets: List[str]
    role_alignment_notes: str
    disclaimer: str
