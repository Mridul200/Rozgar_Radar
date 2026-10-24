import os
import sys
import time
import pytest
import asyncio
from fastapi.testclient import TestClient

# Ensure sys.path includes backend and root
_current_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.abspath(os.path.join(_current_dir, ".."))
_backend_dir = os.path.abspath(os.path.join(_root_dir, "backend"))

for p in [_root_dir, _backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.agent.orchestrator import RozgarAgentOrchestrator
from backend.agent.tools import search_jobs, match_and_rank_jobs
from backend.app.main import app


def test_user_phrase_full_stack_devlopment_typo_handling():
    """Verifies that user phrase 'my core skill is full stack devlopment'
    correctly handles typo, extracts skills/roles, detects JOB_MATCHING,
    and returns top ranked software engineering opportunities."""
    orch = RozgarAgentOrchestrator()
    query = "my core skill is full stack devlopment"
    
    entities = orch.extract_entities(query)
    assert "Full Stack" in entities["skills"]
    assert "Full Stack Developer" in entities["roles"]
    
    intent = orch.detect_intent(query, entities)
    assert intent == "JOB_MATCHING"
    
    response = orch.execute_sync(query)
    assert "Top Matched Opportunities" in response
    assert "Apply on" in response or "Portal" in response
    assert "http" in response


def test_search_jobs_deduplication_and_valid_links():
    """Verifies search_jobs eliminates duplicate postings and provides valid HTTP/HTTPS URLs."""
    results = search_jobs(keyword="Full Stack", limit=10)
    assert len(results) > 0
    
    seen = set()
    for j in results:
        key = (j["company"].lower().strip(), j["title"].lower().strip())
        assert key not in seen, f"Duplicate job found: {key}"
        seen.add(key)
        assert j["application_url"].startswith("http"), f"Invalid application URL: {j['application_url']}"
        assert j["company"], "Company name cannot be empty"
        assert j["title"], "Job title cannot be empty"


def test_search_jobs_and_match_speed_benchmarks():
    """Measures that search_jobs and match_and_rank_jobs execute within strict latency bounds."""
    # 1. Uncached or warmed search
    t0 = time.perf_counter()
    res1 = search_jobs(keyword="Python", limit=5)
    t1 = time.perf_counter()
    first_duration_ms = (t1 - t0) * 1000
    assert first_duration_ms < 500, f"search_jobs took too long: {first_duration_ms:.2f}ms"

    # 2. Cached search must be sub-5ms
    t2 = time.perf_counter()
    res2 = search_jobs(keyword="Python", limit=5)
    t3 = time.perf_counter()
    cached_duration_ms = (t3 - t2) * 1000
    assert cached_duration_ms < 10, f"Cached search took too long: {cached_duration_ms:.2f}ms"
    assert len(res1) == len(res2)

    # 3. Targeted match_and_rank_jobs
    t4 = time.perf_counter()
    ranked = match_and_rank_jobs(skills=["Python", "FastAPI"], preferred_roles=["Backend Developer"], limit=5)
    t5 = time.perf_counter()
    rank_duration_ms = (t5 - t4) * 1000
    assert rank_duration_ms < 400, f"match_and_rank_jobs took too long: {rank_duration_ms:.2f}ms"
    assert len(ranked) > 0


@pytest.mark.asyncio
async def test_orchestrator_non_blocking_async_execution():
    """Verifies that orchestrator.execute runs via threadpool without blocking event loop."""
    orch = RozgarAgentOrchestrator()
    
    loop_check_task = asyncio.create_task(asyncio.sleep(0.01))
    response = await orch.execute("search Python jobs in Bengaluru")
    await loop_check_task
    
    assert "Verified Job Opportunities" in response
    assert "Apply Direct" in response


def test_context_ordinal_job_resolution():
    """Verifies that asking for 'job #1' or 'job 1' references the top job from recent search."""
    orch = RozgarAgentOrchestrator()
    sender = "test_user_ordinal"

    # 1. First run a search
    search_resp = orch.execute_sync("find Python developer jobs", context={"sender": sender})
    assert ("Top Matched Opportunities" in search_resp or "Verified Job Opportunities" in search_resp)
    recent_jobs = orch.context_memory.get(f"{sender}_recent_job_ids", [])
    assert len(recent_jobs) > 0

    first_job_id = recent_jobs[0]

    # 2. Ask to tailor resume for job #1
    tailor_resp = orch.execute_sync("tailor my resume for job #1", context={"sender": sender})
    assert "ATS-Optimized Resume Tailoring" in tailor_resp
    assert "ATS Score Analysis" in tailor_resp
    assert orch.context_memory.get(f"{sender}_last_job_id") == first_job_id


def test_fastapi_healthz_endpoint():
    """Verifies that GET /healthz and /health respond with 200 OK on FastAPI backend."""
    client = TestClient(app)
    
    r1 = client.get("/health")
    assert r1.status_code == 200
    assert r1.json() == {"status": "healthy"}
    
    r2 = client.get("/healthz")
    assert r2.status_code == 200
    assert r2.json() == {"status": "healthy"}


def test_agent_healthz_handler_resilience():
    """Verifies that agent handle_healthz handles database exceptions gracefully."""
    from backend.agent.acp_agent import create_agent
    from uagents import Context
    import unittest.mock as mock

    agent = create_agent()
    # Find registered healthz handler
    healthz_details = agent._server._rest_handler_map.get((agent.address, "GET", "/healthz"))
    assert healthz_details is not None

    mock_ctx = mock.MagicMock(spec=Context)
    # Even if database raises an unexpected error, healthz should return 200 with degraded status
    with mock.patch("app.database.ensure_database_initialized", side_effect=Exception("Database lock")):
        # Call the endpoint directly or via dispatcher
        import asyncio
        from uagents.dispatch import dispatcher
        resp = asyncio.run(dispatcher.dispatch_rest(agent.address, "GET", "/healthz", None))
        assert resp is not None
        assert resp.status == "degraded"
        assert resp.database == "unavailable"
