import json
import logging
from datetime import datetime, timezone
from typing import List, Any, Optional
from services.job_ingestion.base_connector import BaseJobConnector
from services.job_ingestion.normalizer import Normalizer, NormalizedJob

logger = logging.getLogger("job_ingestion")

class WorkableConnector(BaseJobConnector):
    """
    Connector for Workable public widget API.
    
    Workable provides a public, unauthenticated widget endpoint:
    GET https://apply.workable.com/api/v1/widget/accounts/{account_slug}?details=true
    
    API Characteristics & Limits:
    - Unauthenticated public JSON endpoint used by embedded career widgets.
    - `details=true` parameter returns complete job descriptions and location structures.
    - Rate limits: Generous public CDN-backed endpoint; polite backoff applied.
    - Preserves canonical job application URLs on apply.workable.com.
    """

    def parse_response(self, raw_data: Any) -> List[NormalizedJob]:
        if not isinstance(raw_data, dict):
            return []

        job_items = raw_data.get("jobs", [])
        if not isinstance(job_items, list):
            return []

        jobs: List[NormalizedJob] = []
        company_name = self.source.name

        for item in job_items:
            try:
                title = Normalizer.clean_text(item.get("title"))
                if not title:
                    continue

                shortcode = item.get("shortcode") or item.get("code") or ""
                provider_job_id = str(shortcode) if shortcode else title

                city = Normalizer.clean_text(item.get("city"))
                country = Normalizer.clean_text(item.get("country"))
                state = Normalizer.clean_text(item.get("state"))
                
                # Build location string
                loc_parts = [p for p in [city, state, country] if p]
                location_raw = ", ".join(loc_parts) if loc_parts else None

                # Work mode
                is_telecommuting = item.get("telecommuting", False)
                if is_telecommuting:
                    work_mode = "remote"
                else:
                    work_mode = Normalizer.detect_work_mode(title, location_raw)

                # Employment type
                emp_type_raw = item.get("employment_type")
                emp_type = Normalizer.detect_employment_type(emp_type_raw)

                # Department / Function
                department = item.get("department") or item.get("function")

                # Description
                description = item.get("description")
                desc_plain = Normalizer.strip_html_tags(description) if description else None

                # URLs
                app_url = item.get("application_url") or item.get("url") or item.get("shortlink")
                if not app_url and shortcode:
                    app_url = f"https://apply.workable.com/j/{shortcode}"
                canonical_url = Normalizer.canonicalize_url(app_url) if app_url else None

                # Publication date
                pub_date = None
                date_str = item.get("published_on") or item.get("created_at")
                if date_str:
                    try:
                        pub_date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    except Exception:
                        try:
                            pub_date = datetime.strptime(date_str[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                        except Exception:
                            pass

                jobs.append(NormalizedJob(
                    provider_job_id=provider_job_id,
                    title=title,
                    normalized_title=Normalizer.normalize_title(title),
                    company_name=company_name,
                    company_domain=self.source.official_domain,
                    location_raw=location_raw,
                    city=city,
                    country=country,
                    work_mode=work_mode,
                    employment_type=emp_type,
                    department=department,
                    description=description,
                    description_plain=desc_plain,
                    application_url=app_url or "",
                    canonical_url=canonical_url or "",
                    publication_date=pub_date,
                    raw_metadata=json.dumps({
                        "shortcode": shortcode,
                        "code": item.get("code"),
                        "experience": item.get("experience"),
                        "industry": item.get("industry")
                    })
                ))
            except Exception as e:
                logger.warning(f"[{self.source_id}] Failed to parse Workable job: {e}")
                continue

        return jobs
