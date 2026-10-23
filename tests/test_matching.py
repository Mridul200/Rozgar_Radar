"""
Tests for Profile-to-Job Matching System.

Covers:
  1. Full perfect match (100% / 1.0)
  2. Hard filter: India-ineligible job excluded
  3. Hard filter: Zero matching skills (with >=5 candidate skills) excluded
  4. Hard filter: Candidate education below job requirement excluded
  5. Missing job salary awards neutral score (0.5) and passes
  6. Missing candidate salary awards neutral score (0.5) and passes
  7. Missing job experience bounds treats as unbounded (score 1.0)
  8. Missing candidate experience gives score 0.0 and flags incomplete profile
  9. Missing job education requirements gives education score 1.0
  10. Preferred skills bonus capped at 0.10 and capped at 1.0
  11. Job with 0 required skills does not award full skills score
  12. Empty candidate preferred locations treated as open to all
  13. Remote job awards location score 1.0
  14. Experience within slack penalized proportionally
  15. Match cache read/write and invalidation on profile update
  16. GET /api/jobs/recommended endpoint (auth required, pagination, scored response)
"""

import json
import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from app.models.matching import CanonicalSkill, SkillAlias, JobSkill, MatchCache, MatchingConfig
from app.models.job import JobListing
from app.models.source import JobSource
from app.models.user import User, UserProfile
from app.services.matching_service import (
    score_job_for_candidate,
    get_recommendations,
    invalidate_user_cache,
    DEFAULT_WEIGHTS,
    DEFAULT_TOLERANCES,
    DEFAULT_BONUS,
)
from app.services.skill_taxonomy import seed_skill_taxonomy


@pytest.fixture(autouse=True)
def setup_taxonomy(db_session):
    seed_skill_taxonomy(db_session)


def create_mock_source(db_session, source_id="src_test"):
    source = db_session.query(JobSource).filter_by(id=source_id).first()
    if not source:
        source = JobSource(
            id=source_id,
            name="Test Source",
            source_type="ats",
            permission_status="approved",
            access_method="api",
        )
        db_session.add(source)
        db_session.flush()
    return source


def create_mock_job(
    db_session,
    job_id=None,
    title="Senior Python Backend Developer",
    normalized_title="senior python backend developer",
    company_name="Tech Corp",
    city="Bengaluru",
    work_mode="remote",
    employment_type="full_time",
    department="Engineering",
    salary_min=1500000.0,
    salary_max=2500000.0,
    salary_currency="INR",
    salary_pay_period="yearly",
    is_india_eligible=True,
    description_plain="We are looking for a Senior Python Developer with 3 to 6 years experience. Must have Python, FastAPI, and PostgreSQL. Nice to have Docker. Requires Graduate degree.",
    required_skills=None,
    preferred_skills=None,
):
    source = create_mock_source(db_session)
    jid = job_id or str(uuid.uuid4())
    job = JobListing(
        id=jid,
        source_id=source.id,
        title=title,
        normalized_title=normalized_title,
        company_name=company_name,
        city=city,
        work_mode=work_mode,
        employment_type=employment_type,
        department=department,
        salary_min=salary_min,
        salary_max=salary_max,
        salary_currency=salary_currency,
        salary_pay_period=salary_pay_period,
        is_india_eligible=is_india_eligible,
        application_url="https://example.com/apply",
        canonical_url="https://example.com/apply",
        freshness_status="active",
        description_plain=description_plain,
    )
    db_session.add(job)
    db_session.flush()

    # Add required & preferred skills
    if required_skills:
        for s_slug in required_skills:
            can_skill = db_session.query(CanonicalSkill).filter_by(slug=s_slug).first()
            if can_skill:
                db_session.add(JobSkill(
                    id=str(uuid.uuid4()),
                    job_id=jid,
                    canonical_skill_id=can_skill.id,
                    is_required=True,
                ))
    if preferred_skills:
        for s_slug in preferred_skills:
            can_skill = db_session.query(CanonicalSkill).filter_by(slug=s_slug).first()
            if can_skill:
                db_session.add(JobSkill(
                    id=str(uuid.uuid4()),
                    job_id=jid,
                    canonical_skill_id=can_skill.id,
                    is_required=False,
                ))
    db_session.flush()
    return job


def create_mock_user_and_profile(
    db_session,
    email="candidate@example.com",
    skills=None,
    preferred_roles=None,
    years_experience=4.0,
    preferred_locations=None,
    current_city="Bengaluru",
    min_salary=1800000.0,
    education="Graduate",
    highest_qualification="Graduate",
):
    uid = str(uuid.uuid4())
    user = User(
        id=uid,
        email=email,
        hashed_password="fakehashedpassword",
        full_name="Candidate Sharma",
        is_verified=True,
    )
    db_session.add(user)
    db_session.flush()

    edu_details = {"highest_qualification": highest_qualification, "degree": "B.Tech"}

    profile = UserProfile(
        id=str(uuid.uuid4()),
        user_id=uid,
        skills=json.dumps(skills or ["Python", "FastAPI", "PostgreSQL", "Docker"]),
        preferred_roles=json.dumps(preferred_roles or ["Senior Python Backend Developer", "Backend Engineer"]),
        years_experience=years_experience,
        preferred_locations=json.dumps(preferred_locations or ["Bengaluru", "Remote India"]),
        current_city=current_city,
        min_salary=min_salary,
        education=education,
        education_details=json.dumps(edu_details),
        profile_completion_pct=85,
    )
    db_session.add(profile)
    db_session.flush()
    return user, profile


# ── Scenario 1: Exact / High Match ──────────────────────────────────────────
def test_exact_skills_and_role_match(db_session):
    job = create_mock_job(
        db_session,
        required_skills=["python", "fastapi", "postgresql"],
        preferred_skills=["docker"],
    )
    user, profile = create_mock_user_and_profile(
        db_session,
        skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
        preferred_roles=["Senior Python Backend Developer"],
        years_experience=4.0,
        preferred_locations=["Bengaluru"],
        min_salary=1800000.0,
    )

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )

    assert res is not None
    assert res["pass_hard_filter"] is True
    # Perfect score across all dimensions
    assert res["score"] >= 0.95
    assert "python" in res["matched_skills"]
    assert "fastapi" in res["matched_skills"]
    assert "postgresql" in res["matched_skills"]
    assert res["sub_scores"]["skills"] == 1.0


# ── Scenario 2: India-ineligible job excluded by hard filter ───────────────
def test_india_ineligible_job_excluded(db_session):
    job = create_mock_job(
        db_session,
        is_india_eligible=False,
        required_skills=["python"],
    )
    user, profile = create_mock_user_and_profile(db_session, skills=["Python"])

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )
    assert res is None  # Excluded


# ── Scenario 3: Hard filter - 0 matching skills when candidate has 5+ skills ──
def test_zero_matching_skills_hard_filter(db_session):
    job = create_mock_job(
        db_session,
        required_skills=["java", "spring_boot"],
    )
    # Candidate with >=5 skills in Python ecosystem, none in Java
    user, profile = create_mock_user_and_profile(
        db_session,
        skills=["Python", "FastAPI", "Django", "PostgreSQL", "Docker", "Redis"],
    )

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )
    assert res is None  # Excluded by skills hard filter


# ── Scenario 4: Hard filter - Education below requirement ─────────────────
def test_education_below_requirement_hard_filter(db_session):
    job = create_mock_job(
        db_session,
        description_plain="This role requires a PhD or Doctorate in Computer Science.",
        required_skills=["python"],
    )
    user, profile = create_mock_user_and_profile(
        db_session,
        skills=["Python"],
        education="Graduate",
        highest_qualification="Graduate",
    )

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )
    assert res is None  # Candidate education (Graduate=4) < Job requirement (PhD=6)


# ── Scenario 5: Missing job salary awards neutral 0.5 ─────────────────────
def test_missing_job_salary_neutral(db_session):
    job = create_mock_job(
        db_session,
        salary_min=None,
        salary_max=None,
        required_skills=["python"],
    )
    user, profile = create_mock_user_and_profile(
        db_session,
        skills=["Python"],
        min_salary=2000000.0,
    )

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )
    assert res is not None
    assert res["sub_scores"]["salary"] == 0.5


# ── Scenario 6: Missing candidate salary awards neutral 0.5 ──────────────
def test_missing_candidate_salary_neutral(db_session):
    job = create_mock_job(
        db_session,
        salary_min=1000000.0,
        salary_max=1500000.0,
        required_skills=["python"],
    )
    user, profile = create_mock_user_and_profile(
        db_session,
        skills=["Python"],
        min_salary=None,
    )

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )
    assert res is not None
    assert res["sub_scores"]["salary"] == 0.5


# ── Scenario 7: Missing job experience treated as unbounded (1.0) ─────────
def test_missing_job_experience_unbounded(db_session):
    job = create_mock_job(
        db_session,
        description_plain="Exciting Python startup opportunity! Freshers and experienced welcome.",
        required_skills=["python"],
    )
    user, profile = create_mock_user_and_profile(
        db_session,
        skills=["Python"],
        years_experience=1.5,
    )

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )
    assert res is not None
    assert res["sub_scores"]["experience"] == 1.0


# ── Scenario 8: Missing candidate experience flags incomplete profile ─────
def test_missing_candidate_experience_incomplete_profile(db_session):
    job = create_mock_job(
        db_session,
        description_plain="Requires 3 to 5 years experience.",
        required_skills=["python"],
    )
    user, profile = create_mock_user_and_profile(
        db_session,
        skills=["Python"],
        years_experience=None,
    )

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )
    assert res is not None
    assert res["sub_scores"]["experience"] == 0.0
    assert res["incomplete_profile"] is True


# ── Scenario 9: Missing job education gives education score 1.0 ───────────
def test_missing_job_education_full_score(db_session):
    job = create_mock_job(
        db_session,
        description_plain="Work with our team on Python microservices.",
        required_skills=["python"],
    )
    user, profile = create_mock_user_and_profile(
        db_session,
        skills=["Python"],
        education="12th",
        highest_qualification="12th",
    )

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )
    assert res is not None
    assert res["sub_scores"]["education"] == 1.0


# ── Scenario 10: Preferred skills bonus capped at 0.10 and factor at 1.0 ──
def test_preferred_skills_bonus_capped(db_session):
    job = create_mock_job(
        db_session,
        required_skills=["python"],
        preferred_skills=["docker", "kubernetes", "aws", "redis"],
    )
    user, profile = create_mock_user_and_profile(
        db_session,
        skills=["Python", "Docker", "Kubernetes", "AWS", "Redis"],
    )

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )
    assert res is not None
    # Base is 1.0 (Python matched), bonus is +0.10, capped at 1.0
    assert res["sub_scores"]["skills"] == 1.0


# ── Scenario 11: Job with 0 required skills does not award full skills score ─
def test_zero_required_skills_no_full_score(db_session):
    job = create_mock_job(
        db_session,
        required_skills=[],
        preferred_skills=["python", "docker"],
    )
    user, profile = create_mock_user_and_profile(
        db_session,
        skills=["Python", "Docker"],
    )

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )
    assert res is not None
    # Without required skills, base score is 0; bonus is at most 0.10
    assert res["sub_scores"]["skills"] <= 0.10


# ── Scenario 12: Empty candidate preferred locations treated as open to all ─
def test_empty_preferred_locations_open_to_all(db_session):
    job = create_mock_job(
        db_session,
        city="Pune",
        work_mode="hybrid",
        required_skills=["python"],
    )
    user, profile = create_mock_user_and_profile(
        db_session,
        skills=["Python"],
        preferred_locations=[],
    )

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )
    assert res is not None
    assert res["sub_scores"]["location"] >= 0.6


# ── Scenario 13: Remote job awards location score 1.0 ──────────────────────
def test_remote_job_full_location_score(db_session):
    job = create_mock_job(
        db_session,
        city="Hyderabad",
        work_mode="remote",
        required_skills=["python"],
    )
    user, profile = create_mock_user_and_profile(
        db_session,
        skills=["Python"],
        preferred_locations=["Bengaluru"],
        current_city="Bengaluru",
    )

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )
    assert res is not None
    assert res["sub_scores"]["location"] == 1.0


# ── Scenario 14: Under-experienced candidate within slack ──────────────────
def test_experience_within_slack_partial_score(db_session):
    job = create_mock_job(
        db_session,
        description_plain="Looking for 5 to 8 years of experience.",
        required_skills=["python"],
    )
    # Candidate with 3.5 years (slack is 1.0, effective min is 4.0, gap is 0.5)
    user, profile = create_mock_user_and_profile(
        db_session,
        skills=["Python"],
        years_experience=3.5,
    )

    res = score_job_for_candidate(
        db=db_session,
        profile=profile,
        user=user,
        job=job,
        weights=DEFAULT_WEIGHTS,
        tolerances=DEFAULT_TOLERANCES,
        bonus=DEFAULT_BONUS,
    )
    assert res is not None
    assert 0.0 < res["sub_scores"]["experience"] < 1.0


# ── Scenario 15: Cache read/write and invalidation ─────────────────────────
def test_match_cache_and_invalidation(db_session):
    job = create_mock_job(db_session, required_skills=["python"])
    user, profile = create_mock_user_and_profile(db_session, skills=["Python"])

    recs1 = get_recommendations(db_session, user, profile, page=1, page_size=10)
    assert recs1["total"] >= 1

    # Check cache table has an entry
    cached = db_session.query(MatchCache).filter_by(user_id=user.id, job_id=job.id).first()
    assert cached is not None

    # Invalidate cache
    invalidate_user_cache(db_session, user.id)
    cached_after = db_session.query(MatchCache).filter_by(user_id=user.id, job_id=job.id).first()
    assert cached_after is None


# ── Scenario 16: Recommendations endpoint (auth, structure, pagination) ───
def test_recommendations_api_endpoint(client, db_session):
    # Unauthenticated request should return 401
    resp_unauth = client.get("/api/v1/jobs/recommended")
    assert resp_unauth.status_code == 401

    # Create user and log in to get token
    job = create_mock_job(db_session, required_skills=["python"])
    user, profile = create_mock_user_and_profile(db_session, email="api_user@test.com", skills=["Python"])

    from app.api.auth import create_access_token
    token = create_access_token({"sub": user.id, "email": user.email})

    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/v1/jobs/recommended?page=1&page_size=10", headers=headers)
    assert resp.status_code == 200

    data = resp.json()
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert "total_pages" in data
    assert "results" in data
    assert "profile_complete" in data
    assert "profile_completion_pct" in data

    if data["results"]:
        first = data["results"][0]
        assert "job_id" in first
        assert "title" in first
        assert "match_score" in first
        assert "match_score_pct" in first
        assert "matched_skills" in first
        assert "missing_skills" in first
        assert "reasons" in first
        assert "sub_scores" in first
