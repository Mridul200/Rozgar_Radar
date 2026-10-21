import logging
from typing import List, Any
from services.job_ingestion.base_connector import BaseJobConnector
from services.job_ingestion.normalizer import NormalizedJob

logger = logging.getLogger("job_ingestion")

class NCSConnector(BaseJobConnector):
    """
    Connector for India National Career Service (NCS) - Ministry of Labour & Employment.
    
    Status: Permission Required (permission_required / inactive)
    Portal: https://www.ncs.gov.in/
    Official Authorization Contact: support.ncs@gov.in
    
    Compliance & Governance Notes:
    - High India relevance covering Central/State government vacancies and partnered private vacancies.
    - NCS Terms of Service and data governance require official MOA/partner authorization
      before third-party programmatic redistribution or scraping of job listings.
    - Automated live fetching is gated under `permission_status="permission_required"` until
      an authorized API key / partner XML/JSON feed is verified and provisioned.
    - In accordance with project requirements: Zero fabricated counts; live synchronization
      raises PermissionError until authorized credentials are configured.
    """

    async def fetch_raw_data(self) -> Any:
        msg = (
            f"National Career Service (NCS) integration is gated: permission_status='permission_required'. "
            f"Official authorization from the Ministry of Labour & Employment is required before enabling live sync. "
            f"Portal: https://www.ncs.gov.in/ | Contact: support.ncs@gov.in"
        )
        logger.warning(f"[{self.source_id}] {msg}")
        raise PermissionError(msg)

    def parse_response(self, raw_data: Any) -> List[NormalizedJob]:
        """
        Stub parser ready to normalize partner feed listings once authorized.
        Fields expected from official NCS API:
        - JobId, JobTitle, OrganizationName, JobLocation, Description, ApplyUrl, PostingDate.
        """
        return []
