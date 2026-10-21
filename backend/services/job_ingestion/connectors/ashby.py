import json
from datetime import datetime
from typing import List, Any
from services.job_ingestion.base_connector import BaseJobConnector
from services.job_ingestion.normalizer import Normalizer, NormalizedJob

class AshbyConnector(BaseJobConnector):
    """Connector for Ashby public Posting API."""

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

                location_raw = Normalizer.clean_text(item.get("location"))
                department = item.get("department") or item.get("team")
                is_remote = item.get("isRemote", False)
                emp_type_raw = item.get("employmentType")

                # Content/Description
                html_content = item.get("descriptionHtml")
                plain_text = item.get("descriptionPlain") or Normalizer.strip_html(html_content)

                # URLs
                app_url = item.get("jobUrl") or item.get("applyUrl") or f"https://jobs.ashbyhq.com/{self.source.board_identifier}/{job_id}"
                canonical_url = Normalizer.canonicalize_url(app_url)

                # Published date
                pub_date = None
                published_at = item.get("publishedAt")
                if published_at:
                    try:
                        pub_date = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
                    except Exception:
                        pass

                # Work mode & Employment type
                work_mode = "remote" if is_remote else Normalizer.detect_work_mode(title, location_raw, plain_text)
                emp_type = Normalizer.detect_employment_type(emp_type_raw or plain_text or title)

                # Salary parsing
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
                    raw_metadata=json.dumps({"ashby_id": job_id, "is_remote": is_remote})
                ))
            except Exception:
                continue

        return jobs
