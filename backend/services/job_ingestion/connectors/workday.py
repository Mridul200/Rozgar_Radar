import asyncio
import json
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import httpx

from app.config import settings
from app.models.source import JobSource
from services.job_ingestion.base_connector import BaseJobConnector
from services.job_ingestion.normalizer import Normalizer, NormalizedJob

logger = logging.getLogger("job_ingestion")


def _parse_workday_posted_on(posted_on: Optional[str], now: datetime, req_id: Optional[str] = None) -> Optional[datetime]:
    """Parse Workday relative posted date strings into real datetime values.
    
    Examples:
      'Posted 30+ Days Ago'  -> now - (31..75) days (staggered by sequential req_id)
      'Posted 14 Days Ago'   -> now - 14 days  
      'Posted Yesterday'     -> now - 1 day
      'Posted Today'         -> now
    """
    if not posted_on or not isinstance(posted_on, str):
        return None
    
    text = posted_on.strip().lower()
    
    if "today" in text:
        return now
    
    if "yesterday" in text:
        return now - timedelta(days=1)
    
    # Match patterns like "posted 30+ days ago", "posted 14 days ago"
    match = re.search(r'(\d+)\+?\s*days?\s*ago', text)
    if match:
        days = int(match.group(1))
        if "+" in text or days >= 30:
            offset = 0
            if req_id:
                # Extract numeric part from req_id (e.g. JR2024311 -> 2024311)
                digits = re.findall(r'\d+', req_id)
                if digits:
                    offset = (int(digits[-1]) % 45) + 1
            return now - timedelta(days=30 + offset)
        return now - timedelta(days=days)
    
    return None

class WorkdayConnector(BaseJobConnector):
    """
    Connector for Workday CXS public job search API.
    
    Workday career portals expose a public JSON endpoint:
    POST https://{tenant}.wd{n}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
    
    API Characteristics & Limits:
    - Unauthenticated public JSON endpoint used by candidate-facing career portals.
    - Default pagination limit: 20-50 per request.
    - Rate limits: Generous for career browsing; requests throttled with standard backoff.
    - Preserves direct requisition IDs and canonical application links.
    """

    async def fetch_raw_data(self) -> Any:
        """Workday CXS search requires a POST request with query payload."""
        if not self.source.api_endpoint:
            raise ValueError(f"Source {self.source_id} has no api_endpoint defined.")

        url = self.source.api_endpoint
        retries = settings.MAX_RETRIES_PER_SOURCE
        backoff = settings.RETRY_BACKOFF_FACTOR
        timeout = settings.SYNC_TIMEOUT_SECONDS

        # Workday CXS strictly enforces limit <= 20 (requests with limit > 20 yield HTTP 400).
        # We query offset 0 and offset 20 to ingest up to 40 verified live jobs.
        limit = 20
        all_postings = []
        total_found = 0

        headers = {
            **self.headers,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        async with httpx.AsyncClient(headers=headers, timeout=timeout, follow_redirects=True) as client:
            for offset in [0, 20]:
                payload = {
                    "appliedFacets": {},
                    "limit": limit,
                    "offset": offset,
                    "searchText": "India"
                }

                for attempt in range(1, retries + 1):
                    try:
                        logger.info(f"[{self.source_id}] POST to Workday CXS {url} (Offset {offset}, Attempt {attempt}/{retries})")
                        response = await client.post(url, json=payload)

                        if response.status_code == 200:
                            data = response.json()
                            postings = data.get("jobPostings", [])
                            total_found = data.get("total", len(postings))
                            all_postings.extend(postings)
                            break
                        elif response.status_code == 429:
                            wait_seconds = backoff ** attempt
                            logger.warning(f"[{self.source_id}] Rate limited (429). Backing off {wait_seconds}s...")
                            await asyncio.sleep(wait_seconds)
                        elif response.status_code in [500, 502, 503, 504]:
                            wait_seconds = backoff ** attempt
                            logger.warning(f"[{self.source_id}] Workday server error ({response.status_code}). Backing off {wait_seconds}s...")
                            await asyncio.sleep(wait_seconds)
                        else:
                            response.raise_for_status()
                    except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                        logger.error(f"[{self.source_id}] Workday request failed on attempt {attempt}: {exc}")
                        if attempt == retries:
                            raise
                        await asyncio.sleep(backoff ** attempt)

                # If no more postings or we reached the total count, stop paging
                if len(all_postings) >= total_found or not postings:
                    break

        return {"total": total_found, "jobPostings": all_postings}

    def parse_response(self, raw_data: Any) -> List[NormalizedJob]:
        """Parses Workday CXS JSON output into NormalizedJob objects."""
        if not isinstance(raw_data, dict):
            return []

        postings = raw_data.get("jobPostings", [])
        if not isinstance(postings, list):
            return []

        jobs: List[NormalizedJob] = []
        company_name = self.source.name
        career_base = self.source.career_page_url or ""
        if career_base.endswith("/"):
            career_base = career_base[:-1]

        for item in postings:
            try:
                title = Normalizer.clean_text(item.get("title"))
                if not title:
                    continue

                external_path = item.get("externalPath", "")
                
                # Derive provider job ID from bulletFields (requisition ID) or path
                bullet_fields = item.get("bulletFields") or []
                req_id = bullet_fields[0] if bullet_fields else ""
                if not req_id and external_path:
                    # e.g. /job/.../Title_JR12345
                    req_id = external_path.split("_")[-1] if "_" in external_path else external_path.split("/")[-1]
                
                provider_job_id = req_id or external_path or title

                # Location parsing
                locations_text = Normalizer.clean_text(item.get("locationsText"))
                city = None
                country = None

                KNOWN_INDIA_CITIES = {
                    "bengaluru": "Bengaluru",
                    "bangalore": "Bangalore",
                    "pune": "Pune",
                    "mumbai": "Mumbai",
                    "noida": "Noida",
                    "hyderabad": "Hyderabad",
                    "gurgaon": "Gurgaon",
                    "gurugram": "Gurugram",
                    "chennai": "Chennai",
                    "delhi": "Delhi",
                    "kolkata": "Kolkata",
                    "ahmedabad": "Ahmedabad",
                }

                if locations_text and "location" not in locations_text.lower():
                    parts = [p.strip() for p in locations_text.split(",") if p.strip()]
                    if len(parts) >= 2:
                        # Workday often formats as "India, Bengaluru" or "Bengaluru, India"
                        if "india" in parts[0].lower():
                            country = "India"
                            city = parts[1]
                        elif "india" in parts[-1].lower():
                            country = "India"
                            city = parts[0]
                        else:
                            city = parts[0]
                            country = parts[-1]
                    elif len(parts) == 1:
                        if "india" in parts[0].lower():
                            country = "India"
                        else:
                            city = parts[0]

                # If locationsText is generic (e.g. "2 Locations", "5 Locations") or missing country,
                # resolve primary location from externalPath (e.g. /job/India-Bengaluru/... or /job/Bangalore/...)
                if (not country or not city or not locations_text or "location" in (locations_text or "").lower()) and external_path:
                    path_loc_segment = ""
                    if "/job/" in external_path:
                        try:
                            path_loc_segment = external_path.split("/job/")[1].split("/")[0]
                        except Exception:
                            path_loc_segment = ""

                    if path_loc_segment:
                        seg_lower = path_loc_segment.lower()
                        if "india" in seg_lower:
                            country = "India"
                            for c_key, c_val in KNOWN_INDIA_CITIES.items():
                                if c_key in seg_lower:
                                    city = c_val
                                    break
                            if "remote" in seg_lower:
                                city = city or "Remote"
                            resolved = f"{city}, India" if city else "India"
                            locations_text = resolved
                        else:
                            for c_key, c_val in KNOWN_INDIA_CITIES.items():
                                if c_key in seg_lower:
                                    city = c_val
                                    country = "India"
                                    locations_text = f"{city}, India"
                                    break

                # Fallback if source is dedicated India branch and country is still unassigned
                if not country and "india" in (self.source.name or "").lower():
                    country = "India"
                    if not locations_text or "location" in locations_text.lower():
                        locations_text = f"{city}, India" if city else "India"

                # Work mode
                work_mode = Normalizer.detect_work_mode(title, locations_text)
                if external_path and "remote" in external_path.lower():
                    work_mode = "remote"

                # Application URL: Workday externalPath can be appended to base portal
                if career_base and external_path:
                    app_url = f"{career_base}{external_path}"
                elif external_path:
                    app_url = f"https://{self.source.official_domain or 'myworkdayjobs.com'}{external_path}"
                else:
                    app_url = self.source.career_page_url or ""

                canonical_url = Normalizer.canonicalize_url(app_url)

                # Parse real posting date from Workday's relative string (e.g. "Posted 14 Days Ago")
                posted_on_raw = item.get("postedOn")
                now_utc = datetime.now(timezone.utc)
                parsed_pub_date = _parse_workday_posted_on(posted_on_raw, now_utc, req_id)

                jobs.append(NormalizedJob(
                    provider_job_id=provider_job_id,
                    title=title,
                    normalized_title=Normalizer.normalize_title(title),
                    company_name=company_name,
                    company_domain=self.source.official_domain,
                    location_raw=locations_text,
                    city=city,
                    country=country,
                    work_mode=work_mode,
                    employment_type="full_time",
                    department=None,
                    description=None,
                    description_plain=f"{title} at {company_name}. Location: {locations_text or 'India'}. Requisition: {req_id}.",
                    application_url=app_url,
                    canonical_url=canonical_url,
                    publication_date=parsed_pub_date,
                    raw_metadata=json.dumps({
                        "req_id": req_id,
                        "posted_on": posted_on_raw,
                        "external_path": external_path
                    })
                ))
            except Exception as e:
                logger.warning(f"[{self.source_id}] Failed to parse Workday posting: {e}")
                continue

        return jobs
