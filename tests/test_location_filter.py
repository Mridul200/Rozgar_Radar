import pytest
from services.job_ingestion.location_filter import (
    LocationClassifier,
    LocationCategory,
    IngestionLocationFilter,
)

def test_india_office_detection():
    # Test Bengaluru office
    res1 = LocationClassifier.classify(
        title="Account Executive, Enterprise (Bengaluru, India)",
        location_raw="Bengaluru, India",
        work_mode="on_site"
    )
    assert res1.category == LocationCategory.INDIA_OFFICE
    assert res1.is_india_eligible is True

    # Test Mumbai office
    res2 = LocationClassifier.classify(
        title="Senior Growth Manager",
        location_raw="Mumbai",
        work_mode="hybrid"
    )
    assert res2.category == LocationCategory.INDIA_OFFICE
    assert res2.is_india_eligible is True

    # Test Pune in title with generic Hybrid location
    res3 = LocationClassifier.classify(
        title="Senior Software Engineer - Pune Office",
        location_raw="Hybrid",
        work_mode="hybrid"
    )
    assert res3.category == LocationCategory.INDIA_OFFICE
    assert res3.is_india_eligible is True


def test_remote_india_detection():
    # Explicit India remote
    res1 = LocationClassifier.classify(
        title="Senior Backend Engineer",
        location_raw="Remote - India",
        work_mode="remote"
    )
    assert res1.category == LocationCategory.REMOTE_INDIA
    assert res1.is_india_eligible is True

    # India mentioned in title with remote work mode
    res2 = LocationClassifier.classify(
        title="Partner Sales Manager, India",
        location_raw="Home Based - APAC",
        work_mode="remote"
    )
    assert res2.category == LocationCategory.REMOTE_INDIA
    assert res2.is_india_eligible is True


def test_apac_worldwide_verification():
    # Open worldwide remote with no restrictions -> verified
    res1 = LocationClassifier.classify(
        title="Golang Systems Engineer",
        location_raw="Home based - Worldwide",
        work_mode="remote",
        description="We are a global distributed team hiring talented engineers anywhere."
    )
    assert res1.category == LocationCategory.APAC_WORLDWIDE
    assert res1.is_india_eligible is True

    # Open APAC remote with no restrictions -> verified
    res2 = LocationClassifier.classify(
        title="Customer Success - Team Manager",
        location_raw="Home Based - APAC",
        work_mode="remote"
    )
    assert res2.category == LocationCategory.APAC_WORLDWIDE
    assert res2.is_india_eligible is True

    # Negative verification: Worldwide location but restricted to US/Americas in title or desc
    res3 = LocationClassifier.classify(
        title="Sales Director, Federal Accounts",
        location_raw="Distributed",
        work_mode="remote"
    )
    assert res3.category == LocationCategory.INTERNATIONAL_ONLY
    assert res3.is_india_eligible is False

    # Negative verification: Worldwide location but description requires US residency
    res4 = LocationClassifier.classify(
        title="Fullstack Developer",
        location_raw="Work from anywhere",
        work_mode="remote",
        description="Must reside in the US and be authorized to work in the United States without visa sponsorship."
    )
    assert res4.category == LocationCategory.INTERNATIONAL_ONLY
    assert res4.is_india_eligible is False


def test_international_only_exclusion():
    # London office
    res1 = LocationClassifier.classify(
        title="Product Designer",
        location_raw="London, UK",
        work_mode="on_site"
    )
    assert res1.category == LocationCategory.INTERNATIONAL_ONLY
    assert res1.is_india_eligible is False

    # US-only remote
    res2 = LocationClassifier.classify(
        title="Staff Engineer",
        location_raw="Remote - United States",
        work_mode="remote"
    )
    assert res2.category == LocationCategory.INTERNATIONAL_ONLY
    assert res2.is_india_eligible is False

    # EMEA-only remote
    res3 = LocationClassifier.classify(
        title="Accountant",
        location_raw="Home based - EMEA",
        work_mode="remote"
    )
    assert res3.category == LocationCategory.INTERNATIONAL_ONLY
    assert res3.is_india_eligible is False


def test_ingestion_location_filter_modes():
    # In india_focused mode:
    # India office -> accepted
    keep, res = IngestionLocationFilter.filter_for_ingestion(
        title="DevOps Engineer",
        location_raw="Bengaluru, India",
        mode="india_focused"
    )
    assert keep is True
    assert res.category == LocationCategory.INDIA_OFFICE

    # International only -> dropped
    keep, res = IngestionLocationFilter.filter_for_ingestion(
        title="DevOps Engineer",
        location_raw="Berlin, Germany",
        mode="india_focused"
    )
    assert keep is False
    assert res.category == LocationCategory.INTERNATIONAL_ONLY

    # In "all" mode:
    # Both are kept
    keep_all, _ = IngestionLocationFilter.filter_for_ingestion(
        title="DevOps Engineer",
        location_raw="Berlin, Germany",
        mode="all"
    )
    assert keep_all is True
