import json
from datetime import datetime
from typing import List, Any
from services.job_ingestion.base_connector import BaseJobConnector
from services.job_ingestion.normalizer import Normalizer, NormalizedJob

class SmartRecruitersConnector(BaseJobConnector):
    """Connector for SmartRecruiters public posting API."""

    def parse_response(self, raw_data: Any) -> List[NormalizedJob]:
        if not isinstance(raw_data, dict) or "content" not in raw_data:
            return []

        jobs: List[NormalizedJob] = []
        for item in raw_data.get("content", []):
            try:
                job_id = str(item.get("id"))
                title = Normalizer.clean_text(item.get("name"))
                if not title:
                    continue

                item_company = item.get("company") or {}
                company = item_company.get("name") or self.source.name
                slug = item_company.get("identifier") or self.source.board_identifier or "company"

                # Location handling
                loc_obj = item.get("location") or {}
                location_raw = loc_obj.get("fullLocation") or loc_obj.get("city")
                location_raw = Normalizer.clean_text(location_raw)
                city = loc_obj.get("city")
                country = loc_obj.get("country")
                is_remote = loc_obj.get("remote", False)
                is_hybrid = loc_obj.get("hybrid", False)

                # Department
                dept_obj = item.get("department") or {}
                department = dept_obj.get("label")

                # Employment type
                emp_obj = item.get("typeOfEmployment") or {}
                emp_type_label = emp_obj.get("label")
                emp_type = Normalizer.detect_employment_type(emp_type_label)

                # Work mode
                if is_remote:
                    work_mode = "remote"
                elif is_hybrid:
                    work_mode = "hybrid"
                else:
                    work_mode = Normalizer.detect_work_mode(title, location_raw)

                # Published date
                pub_date = None
                released_date = item.get("releasedDate")
                if released_date:
                    try:
                        pub_date = datetime.fromisoformat(released_date.replace("Z", "+00:00"))
                    except Exception:
                        pass

                # Application URL
                app_url = f"https://jobs.smartrecruiters.com/{slug}/{job_id}"
                canonical_url = Normalizer.canonicalize_url(app_url)

                jobs.append(NormalizedJob(
                    provider_job_id=job_id,
                    title=title,
                    normalized_title=Normalizer.normalize_title(title),
                    company_name=company,
                    company_domain=self.source.official_domain,
                    location_raw=location_raw,
                    city=city,
                    country=country,
                    work_mode=work_mode,
                    employment_type=emp_type,
                    department=department,
                    description=None,
                    description_plain=f"{title} at {company}. Department: {department or 'General'}. Location: {location_raw}.",
                    application_url=app_url,
                    canonical_url=canonical_url,
                    publication_date=pub_date,
                    raw_metadata=json.dumps({"smartrecruiters_id": job_id, "refNumber": item.get("refNumber")})
                ))
            except Exception:
                continue

        return jobs
