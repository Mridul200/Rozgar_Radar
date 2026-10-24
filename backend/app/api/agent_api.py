"""
Rozgar Radar Agent API Endpoints
Provides HTTP REST access to the Agent Orchestrator and Agent Metadata.
"""

from __future__ import annotations

import os
import sys
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

# Ensure sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.abspath(os.path.join(_current_dir, "..", ".."))
_root_dir = os.path.abspath(os.path.join(_backend_dir, ".."))

for p in [_root_dir, _backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.agent.orchestrator import RozgarAgentOrchestrator
from backend.agent.tools import (
    search_jobs,
    match_and_rank_jobs,
    check_candidate_eligibility,
    tailor_resume,
    prepare_application_draft,
)

router = APIRouter(prefix="/agent", tags=["ASI:One Agent"])
orchestrator = RozgarAgentOrchestrator()


# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------

class AgentChatRequest(BaseModel):
    message: str = Field(..., description="User's natural language request or prompt")
    sender: Optional[str] = Field("user", description="Identifier for context memory")


class AgentChatResponse(BaseModel):
    response: str
    intent: str
    entities: Dict[str, Any]


class AgentInfoResponse(BaseModel):
    agent_name: str
    agent_address: str
    protocol: str
    version: str
    ecosystem: str
    hackathon: str
    challenge: str
    capabilities: List[str]


class JobSearchToolRequest(BaseModel):
    keyword: Optional[str] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None
    limit: int = 5


class JobMatchToolRequest(BaseModel):
    skills: List[str]
    preferred_roles: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    years_experience: float = 0.0
    limit: int = 5


class EligibilityToolRequest(BaseModel):
    job_id: str
    candidate_skills: List[str]
    candidate_exp: float = 0.0
    candidate_location: Optional[str] = None


class TailorResumeToolRequest(BaseModel):
    job_id: str
    candidate_name: str = "Candidate"
    current_skills: Optional[List[str]] = None
    years_experience: float = 2.0


class PrepareApplicationToolRequest(BaseModel):
    job_id: str
    candidate_name: str = "Candidate"
    candidate_email: str = "candidate@example.com"
    candidate_phone: Optional[str] = None
    candidate_skills: Optional[List[str]] = None
    candidate_exp: float = 2.0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/info", response_model=AgentInfoResponse)
def get_agent_info():
    """Returns the agent's identity, Fetch.ai address, protocol, and capabilities."""
    seed = os.getenv("ROZGAR_RADAR_AGENT_SEED") or "rozgar_radar_fetchathon_asi_one_seed_2026_india_first_agent_secure"
    # Compute deterministic address
    try:
        from uagents import Agent
        temp = Agent(name="rozgar_radar_copilot", seed=seed)
        address = temp.address
    except Exception:
        address = "agent1qgq8slegxr8rvl7hdxlsrhkfaraumhx43sw5v0yau9ufs9e2f0gfqx9hwm3"

    return AgentInfoResponse(
        agent_name="rozgar_radar_copilot",
        agent_address=address,
        protocol="Agent Chat Protocol (ACP)",
        version="0.3.0",
        ecosystem="Fetch.ai / Agentverse / ASI:One",
        hackathon="Fetch-A-Thon 3.0",
        challenge="ASI:One Agent Challenge – From Intent to Action",
        capabilities=[
            "1. Real-time Job Search across 1,500+ verified listings",
            "2. Profile-to-Job Matching & 6-Factor Compatibility Ranking",
            "3. Candidate Eligibility Verification & Qualification Gap Analysis",
            "4. ATS-Optimized Resume Tailoring & Score Enhancement",
            "5. Automated Application Drafting with Direct Verified Application URLs"
        ]
    )


@router.post("/chat", response_model=AgentChatResponse)
async def chat_with_agent(req: AgentChatRequest):
    """
    Executes natural-language prompt through the Rozgar Radar multi-step orchestrator.
    Returns structured markdown response along with detected intent and extracted entities.
    """
    entities = orchestrator.extract_entities(req.message)
    intent = orchestrator.detect_intent(req.message, entities)
    response_text = await orchestrator.execute(req.message, context={"sender": req.sender})

    return AgentChatResponse(
        response=response_text,
        intent=intent,
        entities=entities
    )


@router.post("/tools/search")
def tool_search(req: JobSearchToolRequest):
    """Direct execution of Job Search Tool."""
    return search_jobs(
        keyword=req.keyword,
        location=req.location,
        work_mode=req.work_mode,
        limit=req.limit
    )


@router.post("/tools/match")
def tool_match(req: JobMatchToolRequest):
    """Direct execution of Profile Matching & Ranking Tool."""
    return match_and_rank_jobs(
        skills=req.skills,
        preferred_roles=req.preferred_roles,
        preferred_locations=req.preferred_locations,
        years_experience=req.years_experience,
        limit=req.limit
    )


@router.post("/tools/eligibility")
def tool_eligibility(req: EligibilityToolRequest):
    """Direct execution of Candidate Eligibility Check Tool."""
    return check_candidate_eligibility(
        job_id=req.job_id,
        candidate_skills=req.candidate_skills,
        candidate_exp=req.candidate_exp,
        candidate_location=req.candidate_location
    )


@router.post("/tools/tailor")
def tool_tailor(req: TailorResumeToolRequest):
    """Direct execution of Resume Tailoring Tool."""
    return tailor_resume(
        job_id=req.job_id,
        candidate_name=req.candidate_name,
        current_skills=req.current_skills,
        years_experience=req.years_experience
    )


@router.post("/tools/apply")
def tool_apply(req: PrepareApplicationToolRequest):
    """Direct execution of Application Drafting Tool."""
    return prepare_application_draft(
        job_id=req.job_id,
        candidate_name=req.candidate_name,
        candidate_email=req.candidate_email,
        candidate_phone=req.candidate_phone,
        candidate_skills=req.candidate_skills,
        candidate_exp=req.candidate_exp
    )
