import json
from datetime import datetime, timezone
from typing import List, Any, Dict
from services.job_ingestion.base_connector import BaseJobConnector
from services.job_ingestion.normalizer import Normalizer, NormalizedJob

class GreenhouseConnector(BaseJobConnector):
    """Connector for Greenhouse public Job Board API."""

    def parse_response(self, raw_data: Any) -> List[NormalizedJob]:
        if not isinstance(raw_data, dict) or "jobs" not in raw_data:
            return []

        jobs: List[NormalizedJob] = []
        company = self.source.name

        for item in raw_data.get("jobs", []):
            try:
                job_id = str(item.get("id"))
                title = Normalizer.clean_text(item.get("title"))
                if not title:
                    continue

                # Location handling
                location_raw = None
                loc_obj = item.get("location")
                if isinstance(loc_obj, dict):
                    location_raw = loc_obj.get("name")
                elif isinstance(loc_obj, str):
                    location_raw = loc_obj
                location_raw = Normalizer.clean_text(location_raw)

                # Department
                department = None
                departments = item.get("departments", [])
                if departments and isinstance(departments, list) and isinstance(departments[0], dict):
                    department = departments[0].get("name")

                # Content/Description
                html_content = item.get("content")
                plain_text = Normalizer.strip_html(html_content) if html_content else None

                # URLs
                app_url = item.get("absolute_url") or f"https://boards.greenhouse.io/{self.source.board_identifier}/jobs/{job_id}"
                canonical_url = Normalizer.canonicalize_url(app_url)

                # Published date: prefer first_published (real unique posting date) over updated_at (batch timestamp)
                pub_date = None
                for date_field in ["first_published", "updated_at"]:
                    raw_date = item.get(date_field)
                    if raw_date:
                        try:
                            pub_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                            break
                        except Exception:
                            continue

                # Application deadline from API
                app_deadline = None
                raw_deadline = item.get("application_deadline")
                if raw_deadline:
                    try:
                        app_deadline = datetime.fromisoformat(raw_deadline.replace("Z", "+00:00"))
                    except Exception:
                        pass

                # Work mode & Employment type detection
                work_mode = Normalizer.detect_work_mode(title, location_raw, plain_text)
                emp_type = Normalizer.detect_employment_type(plain_text or title)

                # Salary parsing from description
                sal_min, sal_max, sal_curr, sal_period = Normalizer.parse_salary(plain_text)

                jobs.append(NormalizedJob(
                    provider_job_id=job_id,
                    title=title,
                    normalized_title=Normalizer.normalize_title(title),
                    company_name=company,
                    company_domain=self.source.official_domain,
                    location_raw=location_raw,
                    city=location_raw.split(",")[0].strip() if location_raw and "," in location_raw else location_raw,
                    country="India" if location_raw and "india" in location_raw.lower() else None,
                    work_mode=work_mode,
                    employment_type=emp_type,
                    department=department,
                    description=html_content,
                    description_plain=plain_text,
                    salary_min=sal_min,
                    salary_max=sal_max,
                    salary_currency=sal_curr,
                    salary_pay_period=sal_period,
                    application_url=app_url,
                    canonical_url=canonical_url,
                    publication_date=pub_date,
                    application_deadline=app_deadline,
                    raw_metadata=json.dumps({"greenhouse_id": job_id, "internal_job_id": item.get("internal_job_id"), "requisition_id": item.get("requisition_id")})
                ))
            except Exception as e:
                continue

        return jobs
