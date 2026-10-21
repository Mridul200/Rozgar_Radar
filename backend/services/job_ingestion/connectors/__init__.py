from app.models.source import JobSource
from services.job_ingestion.base_connector import BaseJobConnector
from services.job_ingestion.connectors.greenhouse import GreenhouseConnector
from services.job_ingestion.connectors.lever import LeverConnector
from services.job_ingestion.connectors.ashby import AshbyConnector
from services.job_ingestion.connectors.smartrecruiters import SmartRecruitersConnector
from services.job_ingestion.connectors.workday import WorkdayConnector
from services.job_ingestion.connectors.workable import WorkableConnector
from services.job_ingestion.connectors.recruitee import RecruiteeConnector
from services.job_ingestion.connectors.ncs import NCSConnector
from services.job_ingestion.connectors.arbeitnow import ArbeitnowConnector
from services.job_ingestion.connectors.placeholder_connector import PlaceholderConnector

def get_connector(source: JobSource) -> BaseJobConnector:
    """Factory that returns the appropriate connector for a given JobSource."""
    platform = (source.ats_platform or source.source_type or "").lower()

    # NCS integration requires official government authorization
    if platform == "ncs" or source.id.startswith("ncs"):
        return NCSConnector(source)

    if source.permission_status != "approved" or not source.is_active:
        return PlaceholderConnector(source)

    if platform == "greenhouse":
        return GreenhouseConnector(source)
    elif platform == "lever":
        return LeverConnector(source)
    elif platform == "ashby":
        return AshbyConnector(source)
    elif platform == "smartrecruiters":
        return SmartRecruitersConnector(source)
    elif platform == "workday":
        return WorkdayConnector(source)
    elif platform == "workable":
        return WorkableConnector(source)
    elif platform == "recruitee":
        return RecruiteeConnector(source)
    elif platform in ["arbeitnow", "aggregator"]:
        return ArbeitnowConnector(source)
    else:
        return PlaceholderConnector(source)

__all__ = [
    "BaseJobConnector",
    "GreenhouseConnector",
    "LeverConnector",
    "AshbyConnector",
    "SmartRecruitersConnector",
    "WorkdayConnector",
    "WorkableConnector",
    "RecruiteeConnector",
    "NCSConnector",
    "ArbeitnowConnector",
    "PlaceholderConnector",
    "get_connector",
]
