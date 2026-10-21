from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class SourceBase(BaseModel):
    name: str
    source_type: str
    ats_platform: Optional[str] = None
    official_domain: Optional[str] = None
    career_page_url: Optional[str] = None
    api_endpoint: Optional[str] = None
    board_identifier: Optional[str] = None
    access_method: str
    permission_status: str
    auth_requirement: str = "none"
    rate_limit_notes: Optional[str] = None
    coverage_notes: Optional[str] = None
    is_active: bool = True

class SourceCreate(SourceBase):
    id: str

class SourceUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    permission_status: Optional[str] = None
    api_endpoint: Optional[str] = None
    board_identifier: Optional[str] = None

class SourceResponse(SourceBase):
    id: str
    last_sync_at: Optional[datetime] = None
    last_successful_sync_at: Optional[datetime] = None
    sync_status: str
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SourceStatusSummary(BaseModel):
    id: str
    name: str
    source_type: str
    ats_platform: Optional[str] = None
    permission_status: str
    sync_status: str
    last_sync_at: Optional[datetime] = None
    last_successful_sync_at: Optional[datetime] = None
    last_error: Optional[str] = None
    is_active: bool
    total_jobs: int = 0
    india_jobs: int = 0

    model_config = ConfigDict(from_attributes=True)
