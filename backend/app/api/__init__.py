from fastapi import APIRouter
from app.api.jobs import router as jobs_router
from app.api.sources import router as sources_router
from app.api.sync import router as sync_router
from app.api.auth import router as auth_router
from app.api.profile import router as profile_router
from app.api.saved_jobs import router as saved_jobs_router
from app.api.automation import router as automation_router
from app.api.resume import router as resume_router
from app.api.supabase import router as supabase_router
from app.api.agent_api import router as agent_router

api_router = APIRouter()
api_router.include_router(jobs_router)
api_router.include_router(sources_router)
api_router.include_router(sync_router)
api_router.include_router(auth_router)
api_router.include_router(profile_router)
api_router.include_router(saved_jobs_router)
api_router.include_router(automation_router)
api_router.include_router(resume_router)
api_router.include_router(supabase_router)
api_router.include_router(agent_router)

__all__ = ["api_router"]
