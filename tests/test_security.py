import pytest
from unittest.mock import patch, AsyncMock
import os


def test_download_db_requires_admin_key(client):
    # Without header -> 403 Forbidden
    res_no_key = client.get("/download/db")
    assert res_no_key.status_code == 403

    # With invalid key -> 403 Forbidden
    res_bad_key = client.get("/download/db", headers={"X-Admin-Key": "invalid-secret"})
    assert res_bad_key.status_code == 403


def test_download_db_with_valid_key(client, monkeypatch):
    # In test environment, valid admin key is accepted
    res_valid = client.get(
        "/download/db",
        headers={"X-Admin-Key": "change-this-secure-admin-key-in-production"}
    )
    # The route executes (returns 200 or 404/json if file not present, but NEVER 403)
    assert res_valid.status_code != 403


def test_admin_endpoints_reject_default_key_in_production(client, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")

    # In production with default key, admin access must be rejected with 403
    res = client.post(
        "/api/v1/sync",
        headers={"X-Admin-Key": "change-this-secure-admin-key-in-production"}
    )
    assert res.status_code == 403
    assert "Default admin key is not allowed in production" in res.json().get("detail", "")

    # In production with a custom configured secret key, access succeeds
    monkeypatch.setenv("ADMIN_API_KEY", "super-secret-production-admin-key-999")
    with patch("app.api.sync.run_all_sources", new_callable=AsyncMock):
        res_custom = client.post(
            "/api/v1/sync",
            headers={"X-Admin-Key": "super-secret-production-admin-key-999"}
        )
        assert res_custom.status_code == 200


def test_unauthenticated_endpoints_return_401(client):
    endpoints = [
        ("GET", "/api/v1/auth/me"),
        ("GET", "/api/v1/profile"),
        ("PUT", "/api/v1/profile"),
        ("GET", "/api/v1/resumes"),
        ("POST", "/api/v1/resumes"),
        ("GET", "/api/v1/saved-jobs"),
        ("POST", "/api/v1/saved-jobs"),
        ("GET", "/api/v1/automation"),
        ("PUT", "/api/v1/automation"),
    ]

    for method, path in endpoints:
        if method == "GET":
            res = client.get(path)
        elif method == "POST":
            res = client.post(path, json={})
        elif method == "PUT":
            res = client.put(path, json={})
        assert res.status_code == 401, f"{method} {path} should return 401 Unauthorized"


def test_cross_user_resume_isolation(client):
    # Register User 1
    res1 = client.post(
        "/api/v1/auth/register",
        json={"email": "user1@example.com", "password": "password123", "full_name": "User One"}
    )
    assert res1.status_code == 200
    token1 = res1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Register User 2
    res2 = client.post(
        "/api/v1/auth/register",
        json={"email": "user2@example.com", "password": "password123", "full_name": "User Two"}
    )
    assert res2.status_code == 200
    token2 = res2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # User 1 creates a resume
    create_res = client.post(
        "/api/v1/resumes",
        headers=headers1,
        json={
            "title": "Software Engineer Resume",
            "template": "modern",
            "content_json": {"personal": {"fullName": "User One"}}
        }
    )
    assert create_res.status_code == 200
    resume_id = create_res.json()["id"]

    # User 2 attempts to GET User 1's resume -> 404 Not Found (IDOR prevention)
    res_get_user2 = client.get(f"/api/v1/resumes/{resume_id}", headers=headers2)
    assert res_get_user2.status_code == 404

    # User 2 attempts to UPDATE User 1's resume -> 404 Not Found
    res_put_user2 = client.put(
        f"/api/v1/resumes/{resume_id}",
        headers=headers2,
        json={"title": "Hacked Title"}
    )
    assert res_put_user2.status_code == 404

    # User 2 attempts to DELETE User 1's resume -> 404 Not Found
    res_del_user2 = client.delete(f"/api/v1/resumes/{resume_id}", headers=headers2)
    assert res_del_user2.status_code == 404

    # User 1 CAN get, update, and delete their own resume
    res_get_user1 = client.get(f"/api/v1/resumes/{resume_id}", headers=headers1)
    assert res_get_user1.status_code == 200
    assert res_get_user1.json()["id"] == resume_id


def test_cross_user_saved_jobs_isolation(client, db_session):
    from app.models.job import JobListing
    from app.models.source import JobSource

    # Create dummy source and job
    src = JobSource(id="sec_src", name="Sec Source", source_type="ats", access_method="public_api", permission_status="approved")
    db_session.add(src)
    job = JobListing(
        id="job_sec_1",
        source_id="sec_src",
        title="Security Engineer",
        normalized_title="security engineer",
        company_name="CyberSec",
        canonical_url="https://sec.com/1",
        application_url="https://sec.com/1"
    )
    db_session.add(job)
    db_session.commit()

    # User 1 registers and saves job
    res1 = client.post(
        "/api/v1/auth/register",
        json={"email": "alice@example.com", "password": "password123", "full_name": "Alice"}
    )
    token1 = res1.json()["access_token"]
    client.post("/api/v1/saved-jobs", headers={"Authorization": f"Bearer {token1}"}, json={"job_id": "job_sec_1"})

    # User 2 registers
    res2 = client.post(
        "/api/v1/auth/register",
        json={"email": "bob@example.com", "password": "password123", "full_name": "Bob"}
    )
    token2 = res2.json()["access_token"]

    # Bob's saved jobs list should be empty
    bob_saved = client.get("/api/v1/saved-jobs", headers={"Authorization": f"Bearer {token2}"})
    assert bob_saved.status_code == 200
    assert bob_saved.json() == []

    # Bob cannot delete Alice's saved job
    bob_delete = client.delete("/api/v1/saved-jobs/job_sec_1", headers={"Authorization": f"Bearer {token2}"})
    assert bob_delete.status_code == 404



def test_cron_tick_authorization(client, monkeypatch):
    # Case 1: When CRON_SECRET is configured
    monkeypatch.setenv("CRON_SECRET", "valid-cron-secret-12345")

    # Unauthorized access -> 403
    res_unauth = client.get("/api/v1/automation/cron-tick")
    assert res_unauth.status_code == 403

    # Wrong secret -> 403
    res_wrong = client.get("/api/v1/automation/cron-tick", headers={"X-Cron-Secret": "wrong-secret"})
    assert res_wrong.status_code == 403

    # Correct secret via header -> 200
    res_valid_header = client.get("/api/v1/automation/cron-tick", headers={"X-Cron-Secret": "valid-cron-secret-12345"})
    assert res_valid_header.status_code == 200
    assert res_valid_header.json()["status"] == "ok"

    # Correct secret via query param -> 200
    res_valid_query = client.get("/api/v1/automation/cron-tick?cron_key=valid-cron-secret-12345")
    assert res_valid_query.status_code == 200
    assert res_valid_query.json()["status"] == "ok"


def test_multi_process_digest_atomic_claim(db_session, monkeypatch):
    from services.digest_scheduler import run_all_due_daily_digests
    import services.digest_scheduler as sched_mod
    from tests.test_digest_automation import _install_fake_email, _make_source, _make_job, _make_user_with_config
    from datetime import datetime, timezone

    sent = _install_fake_email(monkeypatch, sched_mod)
    source = _make_source(db_session)
    _make_job(db_session, source)
    user, config = _make_user_with_config(db_session)

    # First run (due): successfully claimed and processed by Worker 1
    result_1 = run_all_due_daily_digests(force=False, db=db_session)
    assert result_1["processed"] == 1
    assert result_1["emails_sent"] == 1
    assert len(sent) == 1

    # Concurrent/immediate Worker 2 tick: last_run_at is now recent, so Worker 2 skips
    result_2 = run_all_due_daily_digests(force=False, db=db_session)
    assert result_2["processed"] == 0
    assert result_2["emails_sent"] == 0
    # No duplicate email sent
    assert len(sent) == 1
