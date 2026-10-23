from datetime import datetime
from app.database import utc_now
from app.models.job import JobListing
from app.models.source import JobSource

def test_api_jobs_pagination_and_search(client, db_session):
    # Seed a source
    source = JobSource(
        id="api_test_src",
        name="API Test Company",
        source_type="ats",
        access_method="public_api",
        permission_status="approved",
    )
    db_session.add(source)

    # Seed 3 jobs
    for i in range(1, 4):
        job = JobListing(
            id=f"job_api_{i}",
            source_id="api_test_src",
            provider_job_id=f"p_{i}",
            title=f"Role {i} Frontend Engineer" if i == 1 else f"Role {i} Backend Specialist",
            normalized_title=f"role {i} engineer",
            company_name="API Test Company",
            location_raw="Remote" if i == 1 else "Bengaluru, India",
            work_mode="remote" if i == 1 else "on_site",
            employment_type="full_time",
            canonical_url=f"https://test.com/jobs/{i}",
            application_url=f"https://test.com/jobs/{i}",
            first_seen_at=utc_now(),
            last_seen_at=utc_now(),
            last_checked_at=utc_now(),
            freshness_status="active",
            is_duplicate=False,
        )
        db_session.add(job)
    db_session.commit()

    # 1. Test Listing
    res = client.get("/api/v1/jobs?page=1&page_size=2")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["total_pages"] == 2

    # 2. Test Keyword Search
    res_search = client.get("/api/v1/jobs?keyword=Frontend")
    assert res_search.status_code == 200
    assert res_search.json()["total"] == 1
    assert "Frontend" in res_search.json()["items"][0]["title"]

    # 3. Test Filter by work mode
    res_mode = client.get("/api/v1/jobs?work_mode=remote")
    assert res_mode.status_code == 200
    assert res_mode.json()["total"] == 1

    # 4. Test Single Job Get
    res_single = client.get("/api/v1/jobs/job_api_1")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == "job_api_1"
    assert res_single.json()["source_name"] == "API Test Company"

    # 5. Test Filters endpoint
    res_filters = client.get("/api/v1/jobs/filters")
    assert res_filters.status_code == 200
    assert "API Test Company" in res_filters.json()["companies"]

from unittest.mock import patch

def test_api_sync_protection(client):
    # Without admin key -> 403 Forbidden
    res_unauthorized = client.post("/api/v1/sync")
    assert res_unauthorized.status_code == 403

    # With invalid key -> 403 Forbidden
    res_bad_key = client.post("/api/v1/sync", headers={"X-Admin-Key": "wrong-key"})
    assert res_bad_key.status_code == 403

    # With valid key -> 200 Accepted
    with patch("app.api.sync.run_all_sources") as mock_sync:
        res_authorized = client.post(
            "/api/v1/sync",
            headers={"X-Admin-Key": "change-this-secure-admin-key-in-production"}
        )
        assert res_authorized.status_code == 200
        assert res_authorized.json()["status"] == "accepted"


def test_utc_now_and_model_timestamp_defaults(db_session):
    now = utc_now()
    assert now.tzinfo is None

    source = JobSource(
        id="src_dt_test",
        name="DT Test Source",
        source_type="ats",
        access_method="public_api",
        permission_status="approved",
    )
    db_session.add(source)
    db_session.commit()

    job = JobListing(
        id="job_dt_test",
        source_id="src_dt_test",
        title="Datetime Compatibility Engineer",
        normalized_title="datetime compatibility engineer",
        company_name="DT Test Company",
        canonical_url="https://test.com/jobs/dt-1",
        application_url="https://test.com/jobs/dt-1",
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)

    # Verify defaults are populated as naive UTC
    assert job.created_at is not None
    assert job.created_at.tzinfo is None
    assert job.first_seen_at.tzinfo is None
    assert job.last_seen_at.tzinfo is None
    assert job.last_checked_at.tzinfo is None
    assert job.created_at <= utc_now()
    # Verify comparisons and arithmetic do not raise TypeError
    diff = (utc_now() - job.created_at).total_seconds()
    assert diff >= 0
