import asyncio
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings
from app.models.source import JobSource
from services.job_ingestion.normalizer import NormalizedJob

logger = logging.getLogger("job_ingestion")

class BaseJobConnector(ABC):
    """Abstract connector that all job source connectors must implement."""

    def __init__(self, source: JobSource):
        self.source = source
        self.source_id = source.id
        self.headers = {
            "User-Agent": "HirePulseBot/1.0 (+https://github.com/hirepulse/bot; info@hirepulse.dev)",
            "Accept": "application/json",
        }

    async def fetch_raw_data(self) -> Any:
        """Fetches raw data from the provider's verified endpoint with exponential backoff and retries."""
        if not self.source.api_endpoint:
            raise ValueError(f"Source {self.source_id} has no api_endpoint defined.")

        url = self.source.api_endpoint
        retries = settings.MAX_RETRIES_PER_SOURCE
        backoff = settings.RETRY_BACKOFF_FACTOR
        timeout = settings.SYNC_TIMEOUT_SECONDS

        async with httpx.AsyncClient(headers=self.headers, timeout=timeout, follow_redirects=True) as client:
            for attempt in range(1, retries + 1):
                try:
                    logger.info(f"[{self.source_id}] Fetching from {url} (Attempt {attempt}/{retries})")
                    response = await client.get(url)
                    
                    if response.status_code == 200:
                        return response.json()
                    elif response.status_code == 429:
                        wait_seconds = backoff ** attempt
                        logger.warning(f"[{self.source_id}] Rate limited (429). Backing off for {wait_seconds}s...")
                        await asyncio.sleep(wait_seconds)
                    elif response.status_code in [500, 502, 503, 504]:
                        wait_seconds = backoff ** attempt
                        logger.warning(f"[{self.source_id}] Server error ({response.status_code}). Backing off for {wait_seconds}s...")
                        await asyncio.sleep(wait_seconds)
                    else:
                        response.raise_for_status()
                except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                    logger.error(f"[{self.source_id}] Request failed on attempt {attempt}: {exc}")
                    if attempt == retries:
                        raise
                    await asyncio.sleep(backoff ** attempt)
        
        raise RuntimeError(f"[{self.source_id}] Max retries exceeded without successful response.")

    @abstractmethod
    def parse_response(self, raw_data: Any) -> List[NormalizedJob]:
        """Parses the provider's specific JSON response into a list of NormalizedJob models."""
        pass

    async def fetch_and_normalize(self) -> List[NormalizedJob]:
        """Pipeline method that runs fetching and parsing end to end."""
        raw_data = await self.fetch_raw_data()
        return self.parse_response(raw_data)
