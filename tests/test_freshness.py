from datetime import datetime, timedelta
from app.models.job import JobListing
from app.models.source import JobSource
from services.job_ingestion.freshness import FreshnessEngine

def test_freshness_lifecycle(db_session):
    source = JobSource(
        id="freshness_src",
        name="Freshness Co",
        source_type="ats",
        access_method="public_api",
        permission_status="approved",
    )
    db_session.add(source)
    db_session.commit()

    # Job A: Seen recently (active)
    job_a = JobListing(
        id="job_fresh_a",
        source_id="freshness_src",
        provider_job_id="p_a",
        title="Active Role",
        normalized_title="active role",
        company_name="Freshness Co",
        canonical_url="https://fresh.co/jobs/a",
        application_url="https://fresh.co/jobs/a",
        first_seen_at=datetime.utcnow() - timedelta(days=2),
        last_seen_at=datetime.utcnow() - timedelta(days=2),
        last_checked_at=datetime.utcnow() - timedelta(days=2),
        freshness_status="active",
    )
    # Job B: Not seen for 10 days (past 7-day threshold)
    job_b = JobListing(
        id="job_fresh_b",
        source_id="freshness_src",
        provider_job_id="p_b",
        title="Old Missing Role",
        normalized_title="old missing role",
        company_name="Freshness Co",
        canonical_url="https://fresh.co/jobs/b",
        application_url="https://fresh.co/jobs/b",
        first_seen_at=datetime.utcnow() - timedelta(days=15),
        last_seen_at=datetime.utcnow() - timedelta(days=10),
        last_checked_at=datetime.utcnow() - timedelta(days=10),
        freshness_status="active",
    )
    db_session.add_all([job_a, job_b])
    db_session.commit()

    # In this sync, only 'p_a' was seen; 'p_b' was missing
    updated = FreshnessEngine.update_source_listings_freshness(db_session, source, seen_job_ids=["p_a"])

    db_session.refresh(job_a)
    db_session.refresh(job_b)

    # Job A should still be active
    assert job_a.freshness_status == "active"
    # Job B should transition to 'potentially_expired'
    assert job_b.freshness_status == "potentially_expired"
    assert updated == 1
