import json
import os
import pytest
from app.models.source import JobSource
from services.job_ingestion.connectors.greenhouse import GreenhouseConnector
from services.job_ingestion.connectors.lever import LeverConnector
from services.job_ingestion.connectors.ashby import AshbyConnector
from services.job_ingestion.connectors.placeholder_connector import PlaceholderConnector

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")

def test_greenhouse_parsing():
    with open(os.path.join(FIXTURES_DIR, "greenhouse_sample.json"), "r", encoding="utf-8") as f:
        data = json.load(f)

    source = JobSource(
        id="greenhouse_test",
        name="TestCo",
        source_type="ats",
        ats_platform="greenhouse",
        official_domain="testco.com",
        api_endpoint="https://boards-api.greenhouse.io/v1/boards/testco/jobs",
        access_method="public_api",
        permission_status="approved",
    )
    connector = GreenhouseConnector(source)
    jobs = connector.parse_response(data)

    assert len(jobs) == 2
    job1 = jobs[0]
    assert job1.provider_job_id == "9901"
    assert "Senior Backend Architect" in job1.title
    assert job1.work_mode == "remote"
    assert job1.salary_currency == "INR"
    assert job1.city == "Bengaluru"
    assert job1.canonical_url == "https://boards.greenhouse.io/testcompany/jobs/9901"

def test_lever_parsing():
    with open(os.path.join(FIXTURES_DIR, "lever_sample.json"), "r", encoding="utf-8") as f:
        data = json.load(f)

    source = JobSource(
        id="lever_test",
        name="TestCo",
        source_type="ats",
        ats_platform="lever",
        official_domain="testco.com",
        api_endpoint="https://api.lever.co/v0/postings/testco?mode=json",
        access_method="public_api",
        permission_status="approved",
    )
    connector = LeverConnector(source)
    jobs = connector.parse_response(data)

    assert len(jobs) == 1
    job = jobs[0]
    assert job.provider_job_id == "lever-test-101"
    assert job.title == "Data Platform Engineer"
    assert job.employment_type == "full_time"
    assert job.salary_currency == "USD"
    assert job.canonical_url == "https://jobs.lever.co/testcompany/lever-test-101"

def test_ashby_parsing():
    with open(os.path.join(FIXTURES_DIR, "ashby_sample.json"), "r", encoding="utf-8") as f:
        data = json.load(f)

    source = JobSource(
        id="ashby_test",
        name="TestCo",
        source_type="ats",
        ats_platform="ashby",
        official_domain="testco.com",
        api_endpoint="https://api.ashbyhq.com/posting-api/job-board/testco",
        access_method="public_api",
        permission_status="approved",
    )
    connector = AshbyConnector(source)
    jobs = connector.parse_response(data)

    assert len(jobs) == 1
    job = jobs[0]
    assert job.provider_job_id == "ashby-test-201"
    assert job.work_mode == "remote"
    assert job.canonical_url == "https://jobs.ashbyhq.com/testcompany/ashby-test-201"

@pytest.mark.asyncio
async def test_placeholder_connector():
    source = JobSource(
        id="portal_naukri",
        name="Naukri",
        source_type="aggregator",
        access_method="partner_feed",
        permission_status="restricted",
        rate_limit_notes="Requires commercial agreement",
    )
    connector = PlaceholderConnector(source)
    with pytest.raises(NotImplementedError):
        await connector.fetch_raw_data()

def test_workday_parsing():
    from services.job_ingestion.connectors.workday import WorkdayConnector
    source = JobSource(
        id="workday_nvidia",
        name="NVIDIA India",
        source_type="ats",
        ats_platform="workday",
        official_domain="nvidia.com",
        career_page_url="https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite",
        api_endpoint="https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs",
        access_method="public_api",
        permission_status="approved",
    )
    sample_data = {
        "total": 1,
        "jobPostings": [
            {
                "title": "Head of Startups - India and South Asia",
                "externalPath": "/job/India-Bengaluru/Senior-Manager--Inception---South-Asia-Region_JR2024311",
                "locationsText": "India, Bengaluru",
                "postedOn": "Posted 30+ Days Ago",
                "bulletFields": ["JR2024311"]
            }
        ]
    }
    connector = WorkdayConnector(source)
    jobs = connector.parse_response(sample_data)
    assert len(jobs) == 1
    job = jobs[0]
    assert job.provider_job_id == "JR2024311"
    assert "Head of Startups" in job.title
    assert job.city == "Bengaluru"
    assert job.country == "India"
    assert "nvidia.wd5.myworkdayjobs.com" in job.application_url

def test_workable_parsing():
    from services.job_ingestion.connectors.workable import WorkableConnector
    source = JobSource(
        id="workable_mercari_india",
        name="Mercari India",
        source_type="ats",
        ats_platform="workable",
        official_domain="careers.mercari.com",
        career_page_url="https://apply.workable.com/mercari-india/",
        api_endpoint="https://apply.workable.com/api/v1/widget/accounts/mercari-india?details=true",
        access_method="public_api",
        permission_status="approved",
    )
    sample_data = {
        "jobs": [
            {
                "title": "Engineering Manager - Backend",
                "shortcode": "7E1007642A",
                "employment_type": "Full-time",
                "telecommuting": False,
                "url": "https://apply.workable.com/j/7E1007642A",
                "application_url": "https://apply.workable.com/j/7E1007642A/apply",
                "published_on": "2025-07-28",
                "country": "India",
                "city": "Bengaluru",
                "description": "<p>About Mercari India CoE</p>"
            }
        ]
    }
    connector = WorkableConnector(source)
    jobs = connector.parse_response(sample_data)
    assert len(jobs) == 1
    job = jobs[0]
    assert job.provider_job_id == "7E1007642A"
    assert "Engineering Manager" in job.title
    assert job.city == "Bengaluru"
    assert job.country == "India"
    assert job.employment_type == "full_time"
    assert job.canonical_url == "https://apply.workable.com/j/7E1007642A/apply"

def test_recruitee_parsing():
    from services.job_ingestion.connectors.recruitee import RecruiteeConnector
    source = JobSource(
        id="recruitee_deltacapita",
        name="Delta Capita",
        source_type="ats",
        ats_platform="recruitee",
        official_domain="deltacapita.com",
        career_page_url="https://careersdeltacapita.recruitee.com",
        api_endpoint="https://deltacapita.recruitee.com/api/offers/",
        access_method="public_api",
        permission_status="approved",
    )
    sample_data = {
        "offers": [
            {
                "id": 2789110,
                "title": "Principal Consultant - Banking",
                "company_name": "Delta Capita",
                "city": "Bangalore",
                "country": "India",
                "remote": False,
                "hybrid": True,
                "employment_type_code": "fulltime_fixed_term",
                "careers_url": "https://careersdeltacapita.recruitee.com/o/principal-consultant-banking",
                "description": "<p>Exciting banking transformation role</p>"
            }
        ]
    }
    connector = RecruiteeConnector(source)
    jobs = connector.parse_response(sample_data)
    assert len(jobs) == 1
    job = jobs[0]
    assert job.provider_job_id == "2789110"
    assert job.work_mode == "hybrid"
    assert job.city == "Bangalore"
    assert job.country == "India"
    assert job.application_url == "https://careersdeltacapita.recruitee.com/o/principal-consultant-banking"

def test_smartrecruiters_india_parsing():
    from services.job_ingestion.connectors.smartrecruiters import SmartRecruitersConnector
    source = JobSource(
        id="smartrecruiters_averydennison",
        name="Avery Dennison India",
        source_type="ats",
        ats_platform="smartrecruiters",
        official_domain="averydennison.com",
        career_page_url="https://jobs.smartrecruiters.com/AveryDennison",
        api_endpoint="https://api.smartrecruiters.com/v1/companies/averydennison/postings?country=in",
        board_identifier="AveryDennison",
        access_method="public_api",
        permission_status="approved",
    )
    sample_data = {
        "content": [
            {
                "id": "744000156264969",
                "name": "Assistant Manager - Sales",
                "company": {"identifier": "AveryDennison", "name": "Avery Dennison"},
                "location": {
                    "city": "Delhi",
                    "country": "in",
                    "fullLocation": "Delhi, DELHI, India",
                    "remote": False,
                    "hybrid": False
                },
                "typeOfEmployment": {"label": "Full-time"}
            }
        ]
    }
    connector = SmartRecruitersConnector(source)
    jobs = connector.parse_response(sample_data)
    assert len(jobs) == 1
    job = jobs[0]
    assert job.provider_job_id == "744000156264969"
    assert job.city == "Delhi"
    assert job.country == "in"
    assert job.application_url == "https://jobs.smartrecruiters.com/AveryDennison/744000156264969"

@pytest.mark.asyncio
async def test_ncs_connector_gated():
    from services.job_ingestion.connectors.ncs import NCSConnector
    source = JobSource(
        id="ncs_india",
        name="National Career Service (NCS - MoLE)",
        source_type="government_portal",
        ats_platform="ncs",
        official_domain="ncs.gov.in",
        career_page_url="https://www.ncs.gov.in",
        api_endpoint="https://www.ncs.gov.in/service/api",
        access_method="partner_feed",
        permission_status="permission_required",
        is_active=False
    )
    connector = NCSConnector(source)
    with pytest.raises(PermissionError) as exc_info:
        await connector.fetch_raw_data()
    assert "permission_required" in str(exc_info.value)
    assert "support.ncs@gov.in" in str(exc_info.value)
