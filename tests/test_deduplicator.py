from datetime import datetime
from app.database import utc_now
from app.models.job import JobListing
from app.models.source import JobSource
from services.job_ingestion.deduplicator import Deduplicator
from services.job_ingestion.normalizer import NormalizedJob

def test_deduplicator_layered_checks(db_session):
    # Setup test source
    source = JobSource(
        id="src_test",
        name="Source Test",
        source_type="ats",
        access_method="public_api",
        permission_status="approved",
    )
    db_session.add(source)
    db_session.commit()

    # Add existing baseline job
    baseline = JobListing(
        id="job_base_1",
        source_id="src_test",
        provider_job_id="orig_100",
        title="Software Engineer",
        normalized_title="software engineer",
        company_name="Acme Corp",
        location_raw="Remote",
        canonical_url="https://acme.com/jobs/100",
        application_url="https://acme.com/jobs/100",
        dedup_fingerprint=Deduplicator.compute_fingerprint("Acme Corp", "software engineer", "Remote"),
        first_seen_at=utc_now(),
        last_seen_at=utc_now(),
        last_checked_at=utc_now(),
        freshness_status="active",
        is_duplicate=False,
    )
    db_session.add(baseline)
    db_session.commit()

    # Layer 1 test: Same provider_job_id
    candidate1 = NormalizedJob(
        provider_job_id="orig_100",
        title="Software Engineer",
        normalized_title="software engineer",
        company_name="Acme Corp",
        location_raw="Remote",
        application_url="https://acme.com/jobs/100?utm_source=foo",
        canonical_url="https://acme.com/jobs/100",
    )
    is_dup1, reason1, match1 = Deduplicator.find_duplicate(db_session, "src_test", candidate1)
    assert is_dup1 is True
    assert reason1 == "same_source_provider_id"
    assert match1.id == "job_base_1"

    # Layer 2 test: Different provider ID but exact same canonical URL
    candidate2 = NormalizedJob(
        provider_job_id="different_id",
        title="Software Engineer",
        normalized_title="software engineer",
        company_name="Acme Corp",
        location_raw="Remote",
        application_url="https://acme.com/jobs/100",
        canonical_url="https://acme.com/jobs/100",
    )
    is_dup2, reason2, match2 = Deduplicator.find_duplicate(db_session, "other_source", candidate2)
    assert is_dup2 is True
    assert reason2 == "canonical_url_match"

    # Layer 3 test: Different URL and provider ID, but identical company + title + location fingerprint
    candidate3 = NormalizedJob(
        provider_job_id="aggregator_999",
        title="Software Engineer",
        normalized_title="software engineer",
        company_name="Acme Corp",
        location_raw="Remote",
        application_url="https://aggregator.com/post/999",
        canonical_url="https://aggregator.com/post/999",
    )
    is_dup3, reason3, match3 = Deduplicator.find_duplicate(db_session, "other_source", candidate3)
    assert is_dup3 is True
    assert reason3 == "fingerprint_match"

    # Negative test: Different job should NOT be marked duplicate
    candidate4 = NormalizedJob(
        provider_job_id="unique_200",
        title="VP of Sales",
        normalized_title="vp of sales",
        company_name="Acme Corp",
        location_raw="New York",
        application_url="https://acme.com/jobs/sales",
        canonical_url="https://acme.com/jobs/sales",
    )
    is_dup4, reason4, match4 = Deduplicator.find_duplicate(db_session, "src_test", candidate4)
    assert is_dup4 is False
    assert match4 is None
