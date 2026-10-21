import json
from datetime import datetime, timezone
from typing import List, Any
from services.job_ingestion.base_connector import BaseJobConnector
from services.job_ingestion.normalizer import Normalizer, NormalizedJob

class LeverConnector(BaseJobConnector):
    """Connector for Lever public Postings API."""

    def parse_response(self, raw_data: Any) -> List[NormalizedJob]:
        if not isinstance(raw_data, list):
            return []

        jobs: List[NormalizedJob] = []
        company = self.source.name

        for item in raw_data:
            try:
                job_id = str(item.get("id"))
                title = Normalizer.clean_text(item.get("text"))
                if not title:
                    continue

                categories = item.get("categories") or {}
                location_raw = Normalizer.clean_text(categories.get("location"))
                commitment = categories.get("commitment")
                department = categories.get("department") or categories.get("team")

                # Content
                html_content = item.get("description")
                plain_text = item.get("descriptionPlain") or Normalizer.strip_html(html_content)

                # URLs
                app_url = item.get("hostedUrl") or item.get("applyUrl") or f"https://jobs.lever.co/{self.source.board_identifier}/{job_id}"
                canonical_url = Normalizer.canonicalize_url(app_url)

                # Creation date (timestamp in ms)
                pub_date = None
                created_at_ms = item.get("createdAt")
                if created_at_ms and isinstance(created_at_ms, (int, float)):
                    try:
                        pub_date = datetime.fromtimestamp(created_at_ms / 1000.0, timezone.utc)
                    except Exception:
                        pass

                # Work mode & Employment type
                work_mode = Normalizer.detect_work_mode(title, location_raw, plain_text)
                emp_type = Normalizer.detect_employment_type(commitment or plain_text or title)

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
                    raw_metadata=json.dumps({"lever_id": job_id, "categories": categories})
                ))
            except Exception:
                continue

        return jobs
