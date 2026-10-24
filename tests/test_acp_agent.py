"""
Tests for Rozgar Radar ASI:One Agent & Agent Chat Protocol (ACP) Integration
Validates:
1. All 5 agent tools against real database entries.
2. Multi-step orchestrator execution ("From Intent to Action").
3. ACP protocol spec compliance and message models.
4. FastAPI agent REST endpoints.
"""

import pytest
import uuid
import time
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine, SessionLocal
from backend.agent.tools import (
    search_jobs,
    match_and_rank_jobs,
    check_candidate_eligibility,
    tailor_resume,
    prepare_application_draft,
)
from backend.agent.orchestrator import RozgarAgentOrchestrator
from backend.agent.acp_agent import create_agent
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


# ---------------------------------------------------------------------------
# 1. Agent Tools Unit Tests
# ---------------------------------------------------------------------------

def test_tool_search_jobs():
    """Verifies that search_jobs returns real job listings with direct application URLs."""
    results = search_jobs(keyword="python", limit=3)
    assert isinstance(results, list)
    if results:
        job = results[0]
        assert "job_id" in job
        assert "title" in job
        assert "company" in job
        assert "application_url" in job
        assert job["application_url"].startswith("http")


def test_tool_match_and_rank():
    """Verifies that match_and_rank_jobs calculates match percentages and skill gaps."""
    results = match_and_rank_jobs(
        skills=["Python", "FastAPI", "React", "Docker"],
        preferred_roles=["Full Stack Engineer"],
        preferred_locations=["Bengaluru", "Remote"],
        years_experience=2.0,
        limit=3
    )
    assert isinstance(results, list)
    if results:
        top = results[0]
        assert "match_score_pct" in top
        assert 0.0 <= top["match_score_pct"] <= 100.0
        assert "matched_skills" in top
        assert "missing_skills" in top
        assert "application_url" in top


def test_tool_check_eligibility():
    """Verifies qualification gap analysis and actionable advice for a candidate."""
    jobs = search_jobs(limit=1)
    if jobs:
        target_id = jobs[0]["job_id"]
        res = check_candidate_eligibility(
            job_id=target_id,
            candidate_skills=["Python", "FastAPI"],
            candidate_exp=2.0
        )
        assert "is_eligible" in res
        assert "qualification_score" in res
        assert "actionable_advice" in res
        assert isinstance(res["actionable_advice"], list)
        assert len(res["actionable_advice"]) > 0


def test_tool_tailor_resume():
    """Verifies that resume tailoring calculates ATS scores and generates tailored content."""
    jobs = search_jobs(limit=1)
    if jobs:
        target_id = jobs[0]["job_id"]
        res = tailor_resume(
            job_id=target_id,
            candidate_name="Aarav Sharma",
            current_skills=["Python", "SQL"]
        )
        assert "baseline_ats_score" in res
        assert "tailored_ats_score" in res
        assert res["tailored_ats_score"] >= res["baseline_ats_score"]
        assert "tailored_summary" in res
        assert len(res["tailored_summary"]) > 20
        assert "highlighted_bullets" in res


def test_tool_prepare_application_draft():
    """Verifies cover letter drafting and verified application URL generation."""
    jobs = search_jobs(limit=1)
    if jobs:
        target_id = jobs[0]["job_id"]
        res = prepare_application_draft(
            job_id=target_id,
            candidate_name="Aarav Sharma",
            candidate_email="aarav@example.com"
        )
        assert "cover_letter" in res
        assert "Aarav Sharma" in res["cover_letter"]
        assert "verified_application_url" in res
        assert res["verified_application_url"].startswith("http")


# ---------------------------------------------------------------------------
# 2. Multi-Step Orchestrator Tests
# ---------------------------------------------------------------------------

def test_orchestrator_entity_extraction():
    """Tests natural language entity parsing."""
    orch = RozgarAgentOrchestrator()
    entities = orch.extract_entities(
        "I have 3 years experience in Python, React, and Docker looking for backend roles in Bengaluru"
    )
    assert "Python" in entities["skills"]
    assert "React" in entities["skills"]
    assert "Docker" in entities["skills"]
    assert entities["experience_years"] == 3.0
    assert "Bengaluru" in entities["locations"]


@pytest.mark.asyncio
async def test_orchestrator_greeting_and_intent():
    """Tests orchestrator responses to help/greeting queries."""
    orch = RozgarAgentOrchestrator()
    reply = await orch.execute("Hello, what can you do?")
    assert "Rozgar Radar" in reply
    assert "Agent Chat Protocol" in reply


@pytest.mark.asyncio
async def test_orchestrator_full_pipeline():
    """Tests the complete multi-step 'From Intent to Action' pipeline."""
    orch = RozgarAgentOrchestrator()
    prompt = "I know Python and FastAPI with 2 years experience in Bengaluru. Match top jobs, tailor my resume, and help me apply."
    reply = await orch.execute(prompt)

    assert "Rozgar Radar Action Report" in reply
    assert "Top Matched Opportunity" in reply
    assert "Tailored Resume & ATS Optimization" in reply
    assert "Personalized Cover Letter Draft" in reply
    assert "Apply Directly" in reply or "http" in reply


# ---------------------------------------------------------------------------
# 3. Agent Chat Protocol (ACP) Compliance Tests
# ---------------------------------------------------------------------------

def test_acp_message_schemas():
    """Verifies compliance with uAgents ACP message models."""
    msg_id = uuid.uuid4()
    msg = ChatMessage(
        timestamp=int(time.time()),
        msg_id=msg_id,
        content=[TextContent(type="text", text="Find jobs")]
    )
    assert msg.msg_id == msg_id
    assert len(msg.content) == 1
    assert msg.content[0].text == "Find jobs"

    ack = ChatAcknowledgement(
        timestamp=int(time.time()),
        acknowledged_msg_id=msg_id
    )
    assert ack.acknowledged_msg_id == msg_id


def test_acp_agent_initialization():
    """Verifies that create_agent produces a valid uAgent with verified ACP protocol."""
    agent = create_agent(name="test_verify_agent", seed="test_seed_verify_phrase_1234567890")
    assert agent.name == "test_verify_agent"
    assert agent.address.startswith("agent1")
    assert len(agent.protocols) >= 1
    proto = list(agent.protocols.values())[0]
    assert proto.name == chat_protocol_spec.name


# ---------------------------------------------------------------------------
# 4. FastAPI REST Endpoints Tests
# ---------------------------------------------------------------------------

def test_fastapi_agent_info_endpoint():
    """Verifies GET /api/v1/agent/info metadata endpoint."""
    resp = client.get("/api/v1/agent/info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["agent_name"] == "rozgar_radar_copilot"
    assert data["agent_address"].startswith("agent1")
    assert data["protocol"] == "Agent Chat Protocol (ACP)"
    assert data["hackathon"] == "Fetch-A-Thon 3.0"
    assert len(data["capabilities"]) >= 5


def test_fastapi_agent_chat_endpoint():
    """Verifies POST /api/v1/agent/chat orchestrator endpoint."""
    resp = client.post("/api/v1/agent/chat", json={
        "message": "Find Python developer jobs in Bengaluru"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "response" in data
    assert "intent" in data
    assert len(data["response"]) > 20


def test_fastapi_agent_tool_search_endpoint():
    """Verifies POST /api/v1/agent/tools/search."""
    resp = client.post("/api/v1/agent/tools/search", json={
        "keyword": "python",
        "limit": 2
    })
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ---------------------------------------------------------------------------
# 5. Database Canonicalization & Robustness Regression Tests
# ---------------------------------------------------------------------------

def test_database_url_normalization_relative_paths():
    """Verifies that all relative SQLite URL variants resolve to the canonical database/jobs.db."""
    from app.database import normalize_database_url
    for variant in [
        "sqlite:///jobs.db",
        "sqlite:///./jobs.db",
        "sqlite:///database/jobs.db",
        "sqlite:///./database/jobs.db",
    ]:
        normalized = normalize_database_url(variant)
        assert "database/jobs.db" in normalized or "database\\jobs.db" in normalized
        assert normalized.startswith("sqlite:///")


def test_database_safe_sanitization():
    """Verifies that credentials are masked and clean paths are displayed for diagnostics."""
    from app.database import get_sanitized_database_url
    secret_url = "postgresql://postgres:mysecretpassword123@db.supabase.co:5432/postgres"
    sanitized = get_sanitized_database_url(secret_url)
    assert "mysecretpassword123" not in sanitized
    assert ":***@" in sanitized

    sqlite_url = "sqlite:///P:/JOB_HUNTING/database/jobs.db"
    assert get_sanitized_database_url(sqlite_url) == "sqlite:///database/jobs.db"


def test_ensure_database_initialized_diagnostic():
    """Verifies that ensure_database_initialized returns healthy status and verified job_listings."""
    from app.database import ensure_database_initialized, engine
    diag = ensure_database_initialized(engine)
    assert diag["status"] == "healthy"
    assert diag["job_listings_exists"] is True
    assert diag["job_count"] > 1000
    assert diag["dialect"] == "sqlite"


def test_search_jobs_with_different_working_directory():
    """Regression test: verifies that search_jobs succeeds without 'no such table: job_listings'
    even when executed from a different working directory (e.g. backend/)."""
    import os
    from backend.agent.tools import search_jobs
    original_cwd = os.getcwd()
    try:
        os.chdir(os.path.join(original_cwd, "backend"))
        jobs = search_jobs(limit=2)
        assert isinstance(jobs, list)
        assert len(jobs) >= 1
        assert "job_id" in jobs[0]
        assert "title" in jobs[0]
    finally:
        os.chdir(original_cwd)


def test_ensure_database_initialized_in_memory_auto_heals():
    """Verifies that if an empty database is encountered, ensure_database_initialized auto-heals
    and seeds tables from jobs.json."""
    from app.database import ensure_database_initialized
    from sqlalchemy import create_engine
    mem_engine = create_engine("sqlite:///:memory:")
    diag = ensure_database_initialized(mem_engine, seed_if_empty=True)
    assert diag["job_listings_exists"] is True
    assert diag["job_count"] > 0


# ---------------------------------------------------------------------------
# 6. Eligibility Assessment & Evidence Discrepancy Regression Tests
# ---------------------------------------------------------------------------

def test_eligibility_solution_architect_no_hardcoded_80():
    """Regression test: verifies that Solution Architect roles do not use hardcoded 80% fallback,
    explicitly compute the 3+ year experience gap for a 2-year candidate, and do not invent
    unsupported visa requirements."""
    from backend.agent.tools import check_candidate_eligibility
    res = check_candidate_eligibility(
        job_id="job_0baf2c70af20",
        candidate_skills=["Python", "Javascript", "Html", "Css"],
        candidate_exp=2.0
    )
    assert res["job_id"] == "job_0baf2c70af20"
    # 1. Score is not hardcoded 80.0
    assert res["qualification_score"] != 80.0
    assert res["qualification_score"] == 12.0
    # 2. Candidate experience 2.0 vs target 5.0 gives exact 3.0-year gap
    assert res["target_min_experience"] == 5.0
    assert res["experience_gap_years"] == 3.0
    assert "3.0 years" in res["experience_fit"]
    assert res["is_eligible"] is False
    # 3. Location fit fact-checked against job posting (no invented visa requirements)
    assert "Heidelberg" in res["location_fit"]
    assert "does not state visa sponsorship" in res["location_fit"]
    assert "candidate may need relocation visa" not in res["location_fit"].lower()
    # 4. Transparent breakdown explanation
    assert "Breakdown:" in res["score_breakdown_explanation"]
    assert "Skills Match: 0.0%" in res["score_breakdown_explanation"]
    assert "Experience Fit: 40.0%" in res["score_breakdown_explanation"]


def test_eligibility_unspecified_skills_does_not_claim_all_met():
    """Regression test: verifies that when technical skills are unitemized in a job posting,
    the system marks skills_status='unspecified', redistributes weights transparently,
    and never outputs 'None! You meet all listed skill requirements.'"""
    import asyncio
    from backend.agent.tools import check_candidate_eligibility
    from backend.agent.orchestrator import RozgarAgentOrchestrator

    res = check_candidate_eligibility(
        job_id="job_e28178152181",
        candidate_skills=["Python"],
        candidate_exp=2.0
    )
    assert res["skills_status"] == "unspecified"
    assert res["skill_match_score"] is None
    assert res["qualification_score"] != 80.0
    assert "Unspecified in posting" in res["score_breakdown_explanation"]

    orch = RozgarAgentOrchestrator()
    resp = asyncio.run(orch.execute("Am I eligible for job_e28178152181?"))
    assert "None! You meet all listed skill requirements." not in resp
    assert "Technical skills are not explicitly itemized in this listing" in resp


def test_orchestrator_eligibility_execution_transparent_breakdown():
    """Regression test: verifies full orchestrator response for Solution Architect
    contains transparent breakdown, explicit experience gap, and actionable advice."""
    import asyncio
    from backend.agent.orchestrator import RozgarAgentOrchestrator

    orch = RozgarAgentOrchestrator()
    resp = asyncio.run(orch.execute(
        "Am I eligible for job_0baf2c70af20? My skills are Python, Javascript, Html, Css and I have 2 years experience."
    ))
    assert "QUALIFICATION GAP DETECTED" in resp
    assert "**Overall Role Eligibility Score:** **12.0%**" in resp
    assert "Transparent Breakdown:" in resp
    assert "Experience Gap of 3.0 years" in resp
    assert "Aws" in resp
    assert "None! You meet all listed skill requirements." not in resp
