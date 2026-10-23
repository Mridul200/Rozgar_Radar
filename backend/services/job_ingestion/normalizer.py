import re
from typing import Optional, Tuple, Dict, Any
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from pydantic import BaseModel
from datetime import datetime

class NormalizedJob(BaseModel):
    provider_job_id: Optional[str] = None
    title: str
    normalized_title: str
    company_name: str
    company_domain: Optional[str] = None
    location_raw: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    work_mode: str = "not_disclosed"  # remote, hybrid, on_site, not_disclosed
    employment_type: str = "not_disclosed"  # full_time, part_time, contract, internship, not_disclosed
    department: Optional[str] = None
    description: Optional[str] = None
    description_plain: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    salary_pay_period: Optional[str] = None
    required_qualifications: Optional[str] = None
    application_url: str
    canonical_url: str
    publication_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    raw_metadata: Optional[str] = None
    # Location Eligibility & Ingestion Filtering Fields
    location_category: str = "international_only"  # india_office, remote_india, apac_worldwide, international_only
    is_india_eligible: bool = False
    location_eligibility_reason: Optional[str] = None

class Normalizer:
    @staticmethod
    def clean_text(text: Optional[str]) -> str:
        if not text:
            return ""
        # Strip extraneous whitespace
        return " ".join(text.split()).strip()

    @staticmethod
    def normalize_title(title: str) -> str:
        if not title:
            return ""
        cleaned = title.lower()
        # Remove common extraneous tags like [Remote], (Hybrid), (m/f/d), (F/M/X)
        cleaned = re.sub(r"\[.*?\]|\(.*?\)", " ", cleaned)
        # Remove special characters
        cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
        return " ".join(cleaned.split()).strip()

    @staticmethod
    def strip_html(html_content: Optional[str]) -> str:
        if not html_content:
            return ""
        import html as _html
        # Strip markup first to preserve encoded brackets
        text = re.sub(r"<(?:br\s*/?|/p|/div|/li)>", "\n", html_content, flags=re.IGNORECASE)




        # Strip all other HTML tags
        text = re.sub(r"<[^>]+>", " ", text)
        # Final decode for any remaining entities
        text = _html.unescape(text).replace("\xa0", " ")
        # Clean multiple spaces while preserving single newlines
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
        return "\n".join(l for l in lines if l)

    strip_html_tags = strip_html

    @staticmethod
    def canonicalize_url(url: str) -> str:
        """Strips tracking query parameters (utm_*, ref, gh_jid, fbclid, etc.) from URLs."""
        if not url:
            return ""
        parsed = urlparse(url)
        # Filter tracking parameters
        ignored_params = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", 
                          "gh_jid", "ref", "fbclid", "gclid", "source", "lever-origin"}
        query_items = parse_qsl(parsed.query, keep_blank_values=False)
        clean_query = [(k, v) for k, v in query_items if k.lower() not in ignored_params]
        
        # Build canonical url without fragment and with sorted query
        clean_url = urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            parsed.path.rstrip("/"),
            "",
            urlencode(sorted(clean_query)),
            ""
        ))
        return clean_url

    @staticmethod
    def detect_work_mode(title: str, location: Optional[str], description: Optional[str] = None) -> str:
        combined = f"{title} {location or ''} {description or ''}".lower()
        if "remote" in combined or "work from home" in combined or "wfh" in combined:
            return "remote"
        if "hybrid" in combined:
            return "hybrid"
        if "on-site" in combined or "onsite" in combined or "in office" in combined:
            return "on_site"
        # If a specific location is provided without remote indicator, default to on_site
        if location and location.strip().lower() not in ["", "not specified", "various"]:
            return "on_site"
        return "not_disclosed"

    @staticmethod
    def detect_employment_type(text: Optional[str]) -> str:
        if not text:
            return "not_disclosed"
        t = text.lower()
        if "full" in t:
            return "full_time"
        if "part" in t:
            return "part_time"
        if "contract" in t or "freelance" in t or "consultant" in t:
            return "contract"
        if "intern" in t or "trainee" in t:
            return "internship"
        return "not_disclosed"

    @staticmethod
    def parse_salary(text: Optional[str]) -> Tuple[Optional[float], Optional[float], Optional[str], Optional[str]]:
        """Extracts min, max, currency, and period if present in text, else (None, None, None, None)."""
        if not text:
            return (None, None, None, None)
        
        low = text.lower()
        currency = None
        if "$" in text or re.search(r"\busd\b", low):
            currency = "USD"
        elif "₹" in text or re.search(r"\b(?:inr|rs\.?|lpa|lakhs?)\b", low):
            currency = "INR"
        elif "€" in text or re.search(r"\beur\b", low):
            currency = "EUR"
        elif "£" in text or re.search(r"\bgbp\b", low):
            currency = "GBP"

        # Explicit currency required to avoid interpreting arbitrary numbers as salary
        if currency is None:
            return (None, None, None, None)

        period = None
        if re.search(r"\b(?:year|yearly|annual|annually|per annum|lpa)\b|\bp\.a\.(?!\w)", low) or "/yr" in low:
            period = "yearly"
        elif re.search(r"\b(?:month|monthly)\b", low) or "/mo" in low:
            period = "monthly"
        elif re.search(r"\b(?:hour|hourly)\b", low) or "/hr" in low:
            period = "hourly"

        # Regex for numbers (e.g., $120,000 - $150,000 or 15 - 25 LPA)
        numbers = re.findall(r"\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b", text)
        is_lpa = bool(re.search(r"\b(?:lpa|lakhs?)\b", low))
        clean_nums = []
        for n in numbers:
            try:
                val = float(n.replace(",", ""))
                if is_lpa and val < 1000:
                    val = val * 100_000.0
                clean_nums.append(val)
            except ValueError:
                pass
        
        if len(clean_nums) >= 2:
            return (min(clean_nums[0], clean_nums[1]), max(clean_nums[0], clean_nums[1]), currency, period)
        elif len(clean_nums) == 1:
            return (clean_nums[0], None, currency, period)

        return (None, None, None, None)

    @staticmethod
    def classify_location(
        title: str,
        location_raw: Optional[str],
        city: Optional[str] = None,
        country: Optional[str] = None,
        work_mode: Optional[str] = None,
        description: Optional[str] = None
    ):
        from services.job_ingestion.location_filter import LocationClassifier
        return LocationClassifier.classify(
            title=title,
            location_raw=location_raw,
            city=city,
            country=country,
            work_mode=work_mode,
            description=description
        )

    @staticmethod
    def calculate_application_deadline(
        publication_date: Optional[datetime],
        employment_type: str = "full_time",
        title: str = "",
        first_seen_at: Optional[datetime] = None
    ) -> Optional[datetime]:
        """Calculates authentic recruitment requisition deadline.
        - Internships / Entry: 30 days
        - Contract: 35 days
        - Senior / Lead / Architect / Manager / Director / Principal / Staff: 60 days
        - Standard Roles: 45 days
        """
        from datetime import timedelta
        base_date = publication_date or first_seen_at
        if not base_date:
            return None
        
        t_lower = (title or "").lower()
        emp_lower = (employment_type or "").lower()
        
        if "intern" in emp_lower or "intern" in t_lower:
            days = 30
        elif "contract" in emp_lower:
            days = 35
        elif any(k in t_lower for k in ["senior", "sr.", "lead", "architect", "manager", "director", "staff", "principal", "head", "vp"]):
            days = 60
        else:
            days = 45
            
        return base_date + timedelta(days=days)

