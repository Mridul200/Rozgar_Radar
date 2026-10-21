import json
import logging
from datetime import datetime, timezone
from typing import List, Any, Optional
from services.job_ingestion.base_connector import BaseJobConnector
from services.job_ingestion.normalizer import Normalizer, NormalizedJob

logger = logging.getLogger("job_ingestion")

class RecruiteeConnector(BaseJobConnector):
    """
    Connector for Recruitee public offers API.
    
    Recruitee provides a public, unauthenticated offers endpoint:
    GET https://{company_slug}.recruitee.com/api/offers/
    
    API Characteristics & Limits:
    - Public JSON endpoint returning active vacancies for the tenant company.
    - Includes rich job HTML description, location (city, state, country), and work style (remote/hybrid).
    - Rate limits: Polite backoff applied; no API key required for public career offers.
    - Preserves canonical application page URLs on the employer's Recruitee portal.
    """

    def parse_response(self, raw_data: Any) -> List[NormalizedJob]:
        if not isinstance(raw_data, dict):
            return []

        offers = raw_data.get("offers", [])
        if not isinstance(offers, list):
            return []

        jobs: List[NormalizedJob] = []
        company_name = self.source.name

        for offer in offers:
            try:
                title = Normalizer.clean_text(offer.get("title"))
                if not title:
                    continue

                provider_job_id = str(offer.get("id"))
                employer = offer.get("company_name") or company_name

                city = Normalizer.clean_text(offer.get("city"))
                country = Normalizer.clean_text(offer.get("country"))
                state = Normalizer.clean_text(offer.get("state_code"))

                # Location string
                loc_parts = [p for p in [city, state, country] if p]
                location_raw = ", ".join(loc_parts) if loc_parts else None

                # Work mode
                is_remote = offer.get("remote", False)
                is_hybrid = offer.get("hybrid", False)
                if is_remote:
                    work_mode = "remote"
                elif is_hybrid:
                    work_mode = "hybrid"
                else:
                    work_mode = Normalizer.detect_work_mode(title, location_raw)

                # Employment type
                emp_type_raw = offer.get("employment_type_code")
                emp_type = Normalizer.detect_employment_type(emp_type_raw)

                # Department / Category
                department = offer.get("department") or offer.get("category_code")

                # Description
                description = offer.get("description")
                desc_plain = Normalizer.strip_html_tags(description) if description else None

                # URLs
                app_url = offer.get("careers_url") or f"https://{self.source.board_identifier or 'career'}.recruitee.com/o/{provider_job_id}"
                canonical_url = Normalizer.canonicalize_url(app_url)

                # Published date
                pub_date = None
                date_str = offer.get("published_at") or offer.get("created_at") or offer.get("updated_at")
                if date_str:
                    try:
                        pub_date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    except Exception:
                        try:
                            # Recruitee format e.g. "2026-10-19 14:34:35 UTC"
                            cleaned = date_str.replace(" UTC", "")
                            pub_date = datetime.strptime(cleaned, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
                        except Exception:
                            pass

                jobs.append(NormalizedJob(
                    provider_job_id=provider_job_id,
                    title=title,
                    normalized_title=Normalizer.normalize_title(title),
                    company_name=employer,
                    company_domain=self.source.official_domain,
                    location_raw=location_raw,
                    city=city,
                    country=country,
                    work_mode=work_mode,
                    employment_type=emp_type,
                    department=department,
                    description=description,
                    description_plain=desc_plain,
                    application_url=app_url,
                    canonical_url=canonical_url,
                    publication_date=pub_date,
                    raw_metadata=json.dumps({
                        "recruitee_id": provider_job_id,
                        "status": offer.get("status"),
                        "experience_code": offer.get("experience_code")
                    })
                ))
            except Exception as e:
                logger.warning(f"[{self.source_id}] Failed to parse Recruitee offer: {e}")
                continue

        return jobs
