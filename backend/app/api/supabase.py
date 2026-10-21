from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from app.config import settings
from app.supabase import supabase_client

router = APIRouter(prefix="/supabase", tags=["Supabase"])


@router.get("/status")
async def get_supabase_status() -> Dict[str, Any]:
    """Check connectivity to the configured Supabase instance using service_role key."""
    configured = supabase_client.is_configured()
    ping_result = await supabase_client.ping() if configured else {"status": "unconfigured"}
    tables = await supabase_client.list_tables() if configured else []

    db_type = "postgresql" if "postgres" in settings.DATABASE_URL else "sqlite"

    return {
        "supabase_configured": configured,
        "supabase_project_ref": "sscjavqdyydxmrjltvgs",
        "supabase_url": settings.SUPABASE_URL,
        "auth_mode": "service_role" if settings.SUPABASE_SERVICE_ROLE_KEY else "anon",
        "database_engine": db_type,
        "database_url_active": (
            settings.DATABASE_URL.split("@")[-1]
            if "@" in settings.DATABASE_URL
            else settings.DATABASE_URL
        ),
        "ping": ping_result,
        "tables_found": tables,
        "schema_script": "database/supabase_schema.sql",
    }


@router.get("/tables")
async def list_supabase_tables() -> Dict[str, Any]:
    """List tables visible in the Supabase public schema."""
    tables = await supabase_client.list_tables()
    return {"tables": tables, "count": len(tables)}


@router.get("/tables/{table_name}/count")
async def get_table_count(table_name: str) -> Dict[str, Any]:
    """Get the row count for a specific table."""
    count = await supabase_client.get_record_count(table_name)
    return {"table": table_name, "count": count}


@router.get("/tables/{table_name}/rows")
async def get_table_rows(
    table_name: str, limit: int = 20, offset: int = 0
) -> Dict[str, Any]:
    """Fetch rows from a Supabase table."""
    rows = await supabase_client.get_records(table_name, limit=limit, offset=offset)
    return {"table": table_name, "rows": rows, "count": len(rows), "limit": limit, "offset": offset}


@router.get("/info")
def get_supabase_info():
    """Provides configuration instructions for Supabase integration."""
    return {
        "project_ref": "sscjavqdyydxmrjltvgs",
        "url": settings.SUPABASE_URL,
        "schema_file": "database/supabase_schema.sql",
        "keys": {
            "anon_key": "configured" if settings.SUPABASE_ANON_KEY else "missing",
            "service_role_key": "configured" if settings.SUPABASE_SERVICE_ROLE_KEY else "missing",
        },
        "instructions": {
            "step_1": "Open Supabase Dashboard: https://supabase.com/dashboard/project/sscjavqdyydxmrjltvgs",
            "step_2": "Go to SQL Editor and run the script located at database/supabase_schema.sql",
            "step_3": (
                "To use Supabase PostgreSQL as primary backend DB, update DATABASE_URL in .env to: "
                "postgresql+psycopg://postgres.sscjavqdyydxmrjltvgs:[YOUR_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
            ),
        },
    }
