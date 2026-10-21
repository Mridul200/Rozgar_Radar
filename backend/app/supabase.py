import httpx
from typing import Optional, Dict, Any, List
from app.config import settings
import logging

logger = logging.getLogger("hirepulse_supabase")

class SupabaseClient:
    """
    Supabase REST API client for HirePulse backend.
    
    Uses the service_role key for full database access (bypasses RLS).
    The anon key is only used on the frontend client-side.
    """
    def __init__(
        self,
        url: Optional[str] = None,
        service_role_key: Optional[str] = None,
        anon_key: Optional[str] = None,
    ):
        self.url = (url or settings.SUPABASE_URL).rstrip("/")
        self.service_role_key = service_role_key or settings.SUPABASE_SERVICE_ROLE_KEY
        self.anon_key = anon_key or settings.SUPABASE_ANON_KEY
        
        # Backend uses service_role key — full access, bypasses RLS
        self._active_key = self.service_role_key or self.anon_key
        self.headers = {
            "apikey": self._active_key,
            "Authorization": f"Bearer {self._active_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def is_configured(self) -> bool:
        return bool(self.url and self._active_key and "your-" not in self._active_key)

    async def ping(self) -> Dict[str, Any]:
        """Verify Supabase connection via the auth health endpoint."""
        if not self.is_configured():
            return {"status": "unconfigured", "error": "Supabase credentials missing"}
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(
                    f"{self.url}/auth/v1/health",
                    headers={"apikey": self._active_key},
                )
                return {
                    "status": "connected" if res.status_code == 200 else "error",
                    "status_code": res.status_code,
                    "url": self.url,
                }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def list_tables(self) -> List[str]:
        """List all public tables visible via PostgREST (requires service_role)."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(
                    f"{self.url}/rest/v1/",
                    headers=self.headers,
                )
                if res.status_code == 200:
                    # PostgREST returns OpenAPI spec with paths = table names
                    spec = res.json()
                    if "paths" in spec:
                        return [p.lstrip("/") for p in spec["paths"].keys() if p != "/"]
                    if "definitions" in spec:
                        return list(spec["definitions"].keys())
                return []
        except Exception as e:
            logger.warning(f"Failed to list tables: {e}")
            return []

    async def get_records(
        self, table: str, limit: int = 50, offset: int = 0,
        select: str = "*", order: Optional[str] = None, filters: Optional[Dict[str, str]] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch records from a Supabase table via PostgREST."""
        params = f"select={select}&limit={limit}&offset={offset}"
        if order:
            params += f"&order={order}"
        url = f"{self.url}/rest/v1/{table}?{params}"
        
        headers = {**self.headers}
        if filters:
            # PostgREST filter format: column=eq.value
            for col, val in filters.items():
                url += f"&{col}={val}"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    return res.json()
                logger.warning(f"Supabase GET {table}: {res.status_code} {res.text[:200]}")
                return []
        except Exception as e:
            logger.warning(f"Supabase get_records error: {e}")
            return []

    async def get_record_count(self, table: str, filters: Optional[Dict[str, str]] = None) -> int:
        """Get the count of records in a table."""
        url = f"{self.url}/rest/v1/{table}?select=*"
        headers = {
            **self.headers,
            "Prefer": "count=exact",
            "Range-Unit": "items",
            "Range": "0-0",
        }
        if filters:
            for col, val in filters.items():
                url += f"&{col}={val}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, headers=headers)
                # Count is in the Content-Range header: "0-0/1234"
                content_range = res.headers.get("content-range", "")
                if "/" in content_range:
                    total = content_range.split("/")[-1]
                    return int(total) if total != "*" else 0
                return 0
        except Exception as e:
            logger.warning(f"Supabase count error: {e}")
            return 0

    async def insert_records(
        self, table: str, records: List[Dict[str, Any]], upsert: bool = False,
    ) -> Dict[str, Any]:
        """Insert or upsert records into a Supabase table."""
        headers = {**self.headers}
        if upsert:
            headers["Prefer"] = "resolution=merge-duplicates,return=representation"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    f"{self.url}/rest/v1/{table}",
                    headers=headers,
                    json=records,
                )
                return {
                    "status_code": res.status_code,
                    "success": res.status_code in (200, 201),
                    "count": len(res.json()) if res.status_code in (200, 201) else 0,
                    "error": res.text if res.status_code >= 400 else None,
                }
        except Exception as e:
            return {"status_code": 0, "success": False, "error": str(e)}

    async def update_records(
        self, table: str, updates: Dict[str, Any], filters: Dict[str, str],
    ) -> Dict[str, Any]:
        """Update records matching filters in a Supabase table."""
        url = f"{self.url}/rest/v1/{table}"
        for col, val in filters.items():
            url += f"?{col}={val}" if "?" not in url else f"&{col}={val}"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.patch(url, headers=self.headers, json=updates)
                return {
                    "status_code": res.status_code,
                    "success": res.status_code == 200,
                    "data": res.json() if res.status_code == 200 else None,
                    "error": res.text if res.status_code >= 400 else None,
                }
        except Exception as e:
            return {"status_code": 0, "success": False, "error": str(e)}

    async def delete_records(self, table: str, filters: Dict[str, str]) -> Dict[str, Any]:
        """Delete records matching filters from a Supabase table."""
        url = f"{self.url}/rest/v1/{table}"
        for col, val in filters.items():
            url += f"?{col}={val}" if "?" not in url else f"&{col}={val}"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.delete(url, headers=self.headers)
                return {
                    "status_code": res.status_code,
                    "success": res.status_code in (200, 204),
                    "error": res.text if res.status_code >= 400 else None,
                }
        except Exception as e:
            return {"status_code": 0, "success": False, "error": str(e)}


# Singleton backend client (uses service_role key)
supabase_client = SupabaseClient()
