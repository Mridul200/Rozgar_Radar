from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, computed_field

class JobBase(BaseModel):
    title: str
    company_name: str
    company_domain: Optional[str] = None
    location_raw: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    work_mode: str = "not_disclosed"
    employment_type: str = "not_disclosed"
    department: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    salary_pay_period: Optional[str] = None
    application_url: str
    publication_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    freshness_status: str = "active"
    location_category: str = "international_only"
    is_india_eligible: bool = False
    location_eligibility_reason: Optional[str] = None

class JobSummaryResponse(JobBase):
    id: str
    source_id: str
    provider_job_id: Optional[str] = None
    first_seen_at: datetime
    last_seen_at: datetime
    last_checked_at: datetime
    is_duplicate: bool = False
    source_name: Optional[str] = None
    platform: Optional[str] = None

    @computed_field
    @property
    def salary_display(self) -> str:
        """Build human-readable salary display, handling LPA, international currencies, and hourly rates."""
        if self.salary_min is None:
            return "Competitive / Industry Standard"
        
        curr_symbols = {"USD": "$", "INR": "₹", "EUR": "€", "GBP": "£"}
        curr_code = (self.salary_currency or "INR").upper()
        curr = curr_symbols.get(curr_code, curr_code + " ")

        # If INR and numbers are under 100, they represent Lakhs (e.g. 6.00 to 25.00 LPA)
        if curr_code == "INR" and self.salary_min < 100:
            if self.salary_max and self.salary_max <= 200:
                return f"₹{self.salary_min:.1f} – ₹{self.salary_max:.1f} LPA"
            elif self.salary_max and self.salary_max > 200:
                return f"₹{self.salary_min:.1f} LPA+"
            return f"₹{self.salary_min:.1f} LPA"

        # Sanity check for small numbers in USD/EUR
        if curr_code in ["USD", "EUR", "GBP"] and self.salary_min < 10 and self.salary_pay_period == "yearly":
            return "Competitive / Industry Standard"

        period = f"/{self.salary_pay_period}" if self.salary_pay_period else "/yr"
        
        if self.salary_max is not None and self.salary_max > self.salary_min:
            return f"{curr}{self.salary_min:,.0f} – {curr}{self.salary_max:,.0f} {period}".strip()
        return f"{curr}{self.salary_min:,.0f}+ {period}".strip()

    @computed_field
    @property
    def location_display(self) -> str:
        if self.location_raw and self.location_raw.strip():
            return self.location_raw.strip()
        parts = [p for p in [self.city, self.country] if p]
        if parts:
            return ", ".join(parts)
        return "Not specified"

    @computed_field
    @property
    def location_badge(self) -> str:
        badge_map = {
            "india_office": "India Office",
            "remote_india": "Remote — India",
            "apac_worldwide": "APAC / Worldwide",
            "international_only": "International Only"
        }
        return badge_map.get(self.location_category, "International Only")

    model_config = ConfigDict(from_attributes=True)

class JobDetailResponse(JobSummaryResponse):
    description: Optional[str] = None
    description_plain: Optional[str] = None
    required_qualifications: Optional[str] = None
    canonical_url: str
    canonical_job_id: Optional[str] = None
    raw_metadata: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class JobListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[JobSummaryResponse]

class JobFilterOptionsResponse(BaseModel):
    companies: List[str]
    locations: List[str]
    work_modes: List[str]
    employment_types: List[str]
    departments: List[str] = []
    platforms: List[str] = []
    sources: List[dict]
    location_categories: List[str] = ["india_office", "remote_india", "apac_worldwide", "international_only"]
    india_eligible_count: int = 0
    total_active_jobs: int = 0
