"""
Location Filter & Classification Engine for Ingestion Pipeline.

Classifies listings into four strict categories:
1. india_office: Physical or hybrid office in India (Bengaluru, Mumbai, Delhi/NCR, Hyderabad, Pune, etc.)
2. remote_india: Remote role that explicitly permits working from India
3. apac_worldwide: APAC or Worldwide/Global remote roles — eligibility verified (no non-India residency/timezone restrictions)
4. international_only: Explicitly restricted to non-India country, city, or regional feed (excluded from India-focused feed)
"""
import re
from dataclasses import dataclass
from typing import Optional, Tuple, Set, List

class LocationCategory:
    INDIA_OFFICE = "india_office"
    REMOTE_INDIA = "remote_india"
    APAC_WORLDWIDE = "apac_worldwide"
    INTERNATIONAL_ONLY = "international_only"

@dataclass
class LocationClassificationResult:
    category: str
    is_india_eligible: bool
    reason: str

# Comprehensive Indian cities, tech hubs, and states
INDIAN_CITIES: Set[str] = {
    "bengaluru", "bangalore", "mumbai", "delhi", "new delhi", "gurgaon", "gurugram",
    "noida", "hyderabad", "pune", "chennai", "kolkata", "ahmedabad", "jaipur",
    "kochi", "cochin", "thiruvananthapuram", "trivandrum", "chandigarh", "indore",
    "coimbatore", "goa", "bhubaneswar", "visakhapatnam", "vizag", "mysore", "mysuru",
    "nagpur", "surat", "lucknow", "vadodara"
}

INDIAN_STATES: Set[str] = {
    "karnataka", "maharashtra", "delhi ncr", "telangana", "tamil nadu", "haryana",
    "uttar pradesh", "kerala", "west bengal", "gujarat", "rajasthan", "punjab"
}

# Foreign countries, cities, and regional abbreviations that indicate non-India office or restricted territory
FOREIGN_REGIONS: List[str] = [
    r"\b(?:us|u\.s\.|usa|united\s+states)\b",
    r"\b(?:uk|u\.k\.|united\s+kingdom|england|scotland|london)\b",
    r"\b(?:canada|canadian|ontario|toronto|vancouver|montreal|ottawa)\b",
    r"\b(?:germany|deutschland|berlin|munich|frankfurt)\b",
    r"\b(?:france|paris)\b",
    r"\b(?:switzerland|geneva|zurich)\b",
    r"\b(?:netherlands|amsterdam)\b",
    r"\b(?:ireland|dublin)\b",
    r"\b(?:australia|sydney|melbourne|brisbane|canberra|perth|adelaide)\b",
    r"\b(?:new\s+zealand|auckland|wellington)\b",
    r"\b(?:spain|madrid|barcelona)\b",
    r"\b(?:sweden|stockholm)\b",
    r"\b(?:greece|athens)\b",
    r"\b(?:singapore)\b",
    r"\b(?:japan|tokyo)\b",
    r"\b(?:taiwan|taipei)\b",
    r"\b(?:dubai|uae)\b",
    r"\b(?:austin|dallas|denver|seattle|san\s+francisco|new\s+york|los\s+angeles|chicago|boston)\b",
    r"\b(?:dc\s+metro|washington\s+dc|us\s+federal|federal\s+accounts|sled)\b",
    r"\b(?:emea|americas|latam|north\s+america|europe)\b",
]

# Strict exclusion phrases in description, title, or location indicating residency or legal authorization restrictions
RESTRICTION_PATTERNS: List[str] = [
    r"\b(?:must\s+reside\s+in|based\s+in|located\s+in)\s+(?:the\s+)?(?:us|u\.s\.|usa|united\s+states|uk|u\.k\.|canada|europe|emea|germany|france|australia)\b",
    r"\b(?:us|u\.s\.|usa|canada|uk|emea|americas|latam)\s+only\b",
    r"\bauthorized\s+to\s+work\s+in\s+the\s+(?:us|united\s+states|uk|canada)\s+without\s+(?:visa\s+)?sponsorship\b",
    r"\bhome\s+based\s*-\s*(?:americas|emea|us|canada)\b",
    r"\bremote\s*-\s*(?:us|usa|united\s+states|canada|uk|emea|europe|germany|france|americas|latam)\b",
    r"\btime\s*zone\s*:\s*(?:pst|est|cst|mst|gmt|cet)\s+only\b",
]

class LocationClassifier:
    """Classifies a job listing into India office, Remote India, verified APAC/Worldwide, or International only."""

    @classmethod
    def classify(
        cls,
        title: str,
        location_raw: Optional[str],
        city: Optional[str] = None,
        country: Optional[str] = None,
        work_mode: Optional[str] = None,
        description: Optional[str] = None
    ) -> LocationClassificationResult:
        t_clean = (title or "").lower()
        loc_clean = (location_raw or "").lower().strip()
        c_clean = (city or "").lower().strip()
        cntry_clean = (country or "").lower().strip()
        d_clean = (description or "")[:4000].lower()
        combined_text = f"{t_clean} {loc_clean} {c_clean} {cntry_clean}"

        # -------------------------------------------------------------
        # STEP 1: Detect explicit India presence (Office vs Remote India)
        # -------------------------------------------------------------
        has_india_city = any(re.search(r"\b" + city_name + r"\b", combined_text) for city_name in INDIAN_CITIES)
        has_india_state = any(re.search(r"\b" + st_name + r"\b", combined_text) for st_name in INDIAN_STATES)
        has_india_word = bool(re.search(r"\b(?:india|indian)\b", combined_text)) or bool(re.search(r"(?:,\s*in\b|\(in\))", loc_clean))

        if has_india_city or has_india_state or has_india_word:
            # Determine if this is an explicit Remote India role or an Office/Hybrid India role
            is_remote_flag = (
                work_mode == "remote"
                or bool(re.search(r"\b(?:remote|work\s+from\s+home|wfh|home\s+based)\b", combined_text))
            ) and not bool(re.search(r"\b(?:in-office|office\s+based)\b", combined_text))

            if is_remote_flag:
                return LocationClassificationResult(
                    category=LocationCategory.REMOTE_INDIA,
                    is_india_eligible=True,
                    reason="Explicit remote opening with verified India eligibility"
                )
            else:
                city_label = city or (has_india_city and "India tech hub") or "India"
                return LocationClassificationResult(
                    category=LocationCategory.INDIA_OFFICE,
                    is_india_eligible=True,
                    reason=f"Office or hybrid location in India ({city_label})"
                )

        # -------------------------------------------------------------
        # STEP 2: APAC / Worldwide: Verify eligibility before including
        # -------------------------------------------------------------
        is_worldwide_loc = bool(re.search(r"\b(?:home\s+based\s*-\s*worldwide|worldwide|work\s+from\s+anywhere|anywhere|any\s+location)\b", loc_clean))
        is_distributed_loc = loc_clean in ["distributed", "remote", "remote job"]
        is_apac_loc = (
            bool(re.search(r"\b(?:home\s+based\s*-\s*apac|apac|asia-pacific|asia\s+pacific|saarc)\b", loc_clean))
            or bool(re.search(r"\b(?:home\s+based\s*-\s*apac)\b", t_clean))
        )

        if is_worldwide_loc or is_distributed_loc or is_apac_loc:
            # Verification Check A: Does the title or location restrict to a specific foreign city/country/region?
            for foreign_pat in FOREIGN_REGIONS:
                if re.search(foreign_pat, loc_clean) or re.search(foreign_pat, t_clean):
                    return LocationClassificationResult(
                        category=LocationCategory.INTERNATIONAL_ONLY,
                        is_india_eligible=False,
                        reason=f"Designated as {loc_clean} but restricted to foreign territory ({foreign_pat})"
                    )

            # Verification Check B: Does the job description contain regional residency / citizenship restrictions?
            for exc_pat in RESTRICTION_PATTERNS:
                if re.search(exc_pat, d_clean):
                    return LocationClassificationResult(
                        category=LocationCategory.INTERNATIONAL_ONLY,
                        is_india_eligible=False,
                        reason="Worldwide/APAC feed rejected: contains regional residency/citizenship restriction"
                    )

            # Verification Passed:
            if is_apac_loc:
                return LocationClassificationResult(
                    category=LocationCategory.APAC_WORLDWIDE,
                    is_india_eligible=True,
                    reason="Verified APAC region feed (India eligible)"
                )
            return LocationClassificationResult(
                category=LocationCategory.APAC_WORLDWIDE,
                is_india_eligible=True,
                reason="Verified Worldwide / Global remote feed with zero regional restrictions"
            )

        # -------------------------------------------------------------
        # STEP 3: International Only: Exclude from India-focused feed
        # -------------------------------------------------------------
        return LocationClassificationResult(
            category=LocationCategory.INTERNATIONAL_ONLY,
            is_india_eligible=False,
            reason="International office or foreign regional territory"
        )


class IngestionLocationFilter:
    """Applies location filtering during the ingestion pipeline."""

    @classmethod
    def filter_for_ingestion(
        cls,
        title: str,
        location_raw: Optional[str],
        city: Optional[str] = None,
        country: Optional[str] = None,
        work_mode: Optional[str] = None,
        description: Optional[str] = None,
        mode: str = "all"
    ) -> Tuple[bool, LocationClassificationResult]:
        """
        Evaluates a job listing for ingestion.
        
        Args:
            mode: "all" (ingest all with tags) or "india_focused" (ingest only India eligible).
            
        Returns:
            (should_ingest, classification_result)
        """
        classification = LocationClassifier.classify(
            title=title,
            location_raw=location_raw,
            city=city,
            country=country,
            work_mode=work_mode,
            description=description
        )

        if mode == "india_focused":
            # Exclude international only from the India-focused feed
            should_ingest = classification.is_india_eligible
            return should_ingest, classification

        # In "all" mode, keep every job but enrich with classification
        return True, classification
