import json
from datetime import datetime, timezone
from typing import List, Any
from services.job_ingestion.base_connector import BaseJobConnector
from services.job_ingestion.normalizer import Normalizer, NormalizedJob

class ArbeitnowConnector(BaseJobConnector):
    """Connector for Arbeitnow public job board API (Aggregator Layer)."""

    def parse_response(self, raw_data: Any) -> List[NormalizedJob]:
        if not isinstance(raw_data, dict) or "data" not in raw_data:
            return []

        jobs: List[NormalizedJob] = []

        for item in raw_data.get("data", []):
            try:
                slug = item.get("slug")
                title = Normalizer.clean_text(item.get("title"))
                company = Normalizer.clean_text(item.get("company_name"))
                if not title or not company:
                    continue

                location_raw = Normalizer.clean_text(item.get("location"))
                is_remote = item.get("remote", False)
                html_desc = item.get("description")
                plain_desc = Normalizer.strip_html(html_desc)

                app_url = item.get("url") or f"https://www.arbeitnow.com/jobs/{slug}"
                canonical_url = Normalizer.canonicalize_url(app_url)

                # Published date
                pub_date = None
                created_at = item.get("created_at")
                if created_at and isinstance(created_at, (int, float)):
                    try:
                        pub_date = datetime.fromtimestamp(created_at, tz=timezone.utc)
                    except Exception:
                        pass

                # Work mode & Employment type
                work_mode = "remote" if is_remote else Normalizer.detect_work_mode(title, location_raw, plain_desc)
                emp_types = item.get("job_types", [])
                emp_type_str = emp_types[0] if emp_types else None
                emp_type = Normalizer.detect_employment_type(emp_type_str or title)

                # Salary
                sal_min, sal_max, sal_curr, sal_period = Normalizer.parse_salary(plain_desc)

                jobs.append(NormalizedJob(
                    provider_job_id=slug,
                    title=title,
                    normalized_title=Normalizer.normalize_title(title),
                    company_name=company,
                    company_domain=None,
                    location_raw=location_raw,
                    city=location_raw.split(",")[0].strip() if location_raw and "," in location_raw else location_raw,
                    country=location_raw.split(",")[-1].strip() if location_raw and "," in location_raw else None,
                    work_mode=work_mode,
                    employment_type=emp_type,
                    department=None,
                    description=html_desc,
                    description_plain=plain_desc,
                    salary_min=sal_min,
                    salary_max=sal_max,
                    salary_currency=sal_curr,
                    salary_pay_period=sal_period,
                    application_url=app_url,
                    canonical_url=canonical_url,
                    publication_date=pub_date,
                    raw_metadata=json.dumps({"arbeitnow_slug": slug, "tags": item.get("tags")})
                ))
            except Exception:
                continue

        return jobs
