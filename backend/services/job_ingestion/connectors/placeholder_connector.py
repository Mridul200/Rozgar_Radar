import logging
from typing import List, Any
from services.job_ingestion.base_connector import BaseJobConnector
from services.job_ingestion.normalizer import NormalizedJob

logger = logging.getLogger("job_ingestion")

class PlaceholderConnector(BaseJobConnector):
    """
    Placeholder connector for unapproved, pending review, or restricted sources
    (such as Adzuna, LinkedIn, TCS, Naukri, Indeed).
    
    Adheres to the strict project guideline: Never invent API endpoints, bypass logins,
    or fabricate integration results.
    """

    async def fetch_raw_data(self) -> Any:
        msg = (
            f"Source '{self.source.name}' (ID: {self.source.id}) cannot be synchronized automatically. "
            f"Status: '{self.source.permission_status}'. "
            f"Access method: '{self.source.access_method}'. "
            f"Notes: {self.source.rate_limit_notes or 'Requires verified commercial partner feed.'}"
        )
        logger.warning(msg)
        raise NotImplementedError(msg)

    def parse_response(self, raw_data: Any) -> List[NormalizedJob]:
        return []
