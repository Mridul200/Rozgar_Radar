"""
Core matching engine for Rozgar Radar.

Scoring formula (weights are loaded from MatchingConfig, row id=1):
  final_score = Σ(factor_score * weight)

Factors:
  skills      (0.40) — required skill overlap + preferred bonus (cap 0.10)
  role        (0.20) — normalized_title / department match vs preferred_roles
  experience  (0.15) — candidate years_experience vs job min/max bounds
  location    (0.10) — city / work_mode match vs preferred_locations
  salary      (0.10) — candidate min_salary vs job salary range (normalized annual INR)
  education   (0.05) — candidate education rank vs job minimum requirement

Hard-filter pass is required before any scoring:
  • Skills hard filter: if job has required skills AND candidate has 0 matching skills
    AND candidate has 5+ skills in their profile → exclude
  • Education hard filter: job requires qualification that candidate doesn't have → exclude
  • Location hard filter: job is India-ineligible → exclude

Edge cases:
  • Missing job salary → pass salary filter, neutral score 0.5
  • Missing job experience bounds → treat as unbounded, score = 1.0
  • Missing candidate experience → don't exclude; score = 0.0; flag "incomplete profile"
  • Job has 0 required skills → skills factor = preferred_bonus only (≤ 0.10), still recommended
  • Empty candidate preferred_locations → treat as "open to any location"
"""

from __future__ import annotations

import json
import logging
import math
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.matching import CanonicalSkill, JobSkill, MatchCache, MatchingConfig
from app.models.user import UserProfile, User
from app.models.job import JobListing
from app.services.skill_taxonomy import normalise_skill_list

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Default weights / tolerances (used when no MatchingConfig row exists)
# ---------------------------------------------------------------------------
DEFAULT_WEIGHTS = {
    "skills": 0.40,
    "role": 0.20,
    "experience": 0.15,
    "location": 0.10,
    "salary": 0.10,
    "education": 0.05,
}
DEFAULT_TOLERANCES = {
    "exp_years_slack": 1.0,   # Allow ±1 year slack on experience bounds
    "salary_slack_pct": 0.10, # Allow up to 10% below candidate min_salary
}
DEFAULT_BONUS = {
    "preferred_skills_cap": 0.10,  # Max bonus from preferred skills
}

CACHE_TTL_MINUTES = 15

# Education rank map — higher rank = more qualified
EDUCATION_RANK: dict[str, int] = {
    "10th": 1,
    "12th": 2,
    "diploma": 3,
    "graduate": 4,
    "post-graduate": 5,
    "phd": 6,
}

# Keyword → education rank for job description scanning
EDU_KEYWORDS: list[tuple[str, int]] = [
    ("phd", 6), ("doctorate", 6),
    ("post-graduate", 5), ("postgraduate", 5), ("masters", 5), ("master's", 5), ("mba", 5),
    ("graduate", 4), ("bachelor", 4), ("b.e", 4), ("b.tech", 4), ("be", 4), ("btech", 4),
    ("diploma", 3),
    ("12th", 2), ("hsc", 2), ("intermediate", 2),
    ("10th", 1), ("ssc", 1), ("matriculation", 1),
]

# Salary conversion to annual INR
WORKING_DAYS_PER_YEAR = 250
WORKING_HOURS_PER_DAY = 8


# ---------------------------------------------------------------------------
# Config loading
# ---------------------------------------------------------------------------

def _load_config(db: Session) -> tuple[dict, dict, dict, int]:
    """Returns (weights, tolerances, bonus, config_version)."""
    cfg = db.query(MatchingConfig).filter_by(id=1).first()
    if not cfg:
        return DEFAULT_WEIGHTS, DEFAULT_TOLERANCES, DEFAULT_BONUS, 1
    try:
        weights = json.loads(cfg.weights_json)
        tolerances = json.loads(cfg.tolerances_json)
        bonus = json.loads(cfg.bonus_json)
        return weights, tolerances, bonus, cfg.version
    except Exception:
        return DEFAULT_WEIGHTS, DEFAULT_TOLERANCES, DEFAULT_BONUS, 1


def seed_default_config(db: Session) -> None:
    """Insert the default MatchingConfig row if it doesn't exist."""
    if not db.query(MatchingConfig).filter_by(id=1).first():
        db.add(MatchingConfig(
            id=1,
            version=1,
            weights_json=json.dumps(DEFAULT_WEIGHTS),
            tolerances_json=json.dumps(DEFAULT_TOLERANCES),
            bonus_json=json.dumps(DEFAULT_BONUS),
        ))
        db.commit()


# ---------------------------------------------------------------------------
# Salary normalisation
# ---------------------------------------------------------------------------

def _to_annual_inr(amount: Optional[float], pay_period: Optional[str]) -> Optional[float]:
    """Convert a salary value to approximate annual INR."""
    if amount is None:
        return None
    pp = (pay_period or "yearly").lower()
    if pp == "yearly":
        return float(amount)
    if pp == "monthly":
        return float(amount) * 12
    if pp == "hourly":
        return float(amount) * WORKING_HOURS_PER_DAY * WORKING_DAYS_PER_YEAR
    return float(amount)  # Unknown period → treat as yearly


def _normalise_inr(amount: Optional[float]) -> Optional[float]:
    """
    Rozgar Radar stores Indian salaries as LPA values < 200 (e.g. 12.0 = 12 LPA).
    Convert to absolute INR for comparison (multiply by 100,000).
    International large values (> 1000) are treated as already in absolute INR/USD.
    """
    if amount is None:
        return None
    if amount < 200:
        # Small number = LPA
        return amount * 100_000
    return amount  # Already absolute


# ---------------------------------------------------------------------------
# Education helpers
# ---------------------------------------------------------------------------

def _education_rank(education_str: Optional[str]) -> int:
    """Map a string like 'Post-graduate' to its rank."""
    if not education_str:
        return 0
    norm = education_str.strip().lower()
    for key, rank in EDUCATION_RANK.items():
        if key in norm:
            return rank
    return 0


def _job_min_education_rank(description_plain: Optional[str]) -> int:
    """
    Scan job description for the minimum education requirement.
    Returns 0 if none found (no constraint).
    """
    if not description_plain:
        return 0
    text = description_plain.lower()
    for keyword, rank in EDU_KEYWORDS:
        if re.search(r"\b" + re.escape(keyword) + r"\b", text):
            return rank
    return 0


# ---------------------------------------------------------------------------
# Role matching
# ---------------------------------------------------------------------------

def _normalise_role(role: str) -> str:
    return re.sub(r"[^a-z0-9 ]", " ", role.lower()).strip()


def _role_score(
    job_normalized_title: Optional[str],
    job_department: Optional[str],
    preferred_roles: list[str],
) -> float:
    """
    1.0 = exact title match (any preferred role)
    0.7 = partial title overlap (2+ words match)
    0.5 = department match only
    0.0 = no match
    """
    if not preferred_roles:
        return 0.5  # Neutral: candidate hasn't stated a preference

    job_title_norm = _normalise_role(job_normalized_title or "")
    job_dept_norm = _normalise_role(job_department or "")
    job_title_words = set(job_title_norm.split())

    best = 0.0
    for role in preferred_roles:
        role_norm = _normalise_role(role)
        role_words = set(role_norm.split()) - {"", "and", "or", "the", "a", "an"}

        # Exact match
        if role_norm == job_title_norm:
            return 1.0

        # Substring / partial match
        if role_norm in job_title_norm or job_title_norm in role_norm:
            best = max(best, 0.85)
            continue

        # Word overlap ≥ 2 words
        overlap = role_words & job_title_words
        if len(overlap) >= 2:
            best = max(best, 0.70)
        elif len(overlap) == 1 and len(role_words) <= 2:
            best = max(best, 0.50)

        # Department match
        if job_dept_norm and (job_dept_norm in role_norm or role_norm in job_dept_norm):
            best = max(best, 0.50)

    return best


# ---------------------------------------------------------------------------
# Location matching
# ---------------------------------------------------------------------------

def _location_score(
    job_city: Optional[str],
    job_work_mode: str,
    preferred_locations: list[str],
    candidate_current_city: Optional[str],
) -> float:
    """
    1.0 = preferred city match OR remote job (any mode with "remote")
    0.7 = current city matches job city (not in preferred but still reasonable)
    0.5 = hybrid job (partially flexible)
    0.3 = on_site job, city doesn't match
    0.0 = on_site in city not in preferences, and no remote option
    """
    work_mode = (job_work_mode or "not_disclosed").lower()

    # Remote jobs are accessible from anywhere
    if work_mode == "remote":
        return 1.0

    # No location preference stated → open to all
    if not preferred_locations:
        return 0.8 if work_mode == "hybrid" else 0.6

    job_city_norm = (job_city or "").strip().lower()

    pref_norms = [p.strip().lower() for p in preferred_locations]
    remote_preferred = any("remote" in p for p in pref_norms)

    # Hybrid jobs — partial score if city or remote in preferences
    if work_mode == "hybrid":
        if any(job_city_norm and job_city_norm in p or p in job_city_norm for p in pref_norms):
            return 0.9
        if remote_preferred:
            return 0.7
        return 0.5

    # On-site jobs — check city match
    if job_city_norm:
        for p in pref_norms:
            if job_city_norm in p or p in job_city_norm:
                return 1.0

    # Current city fallback
    if candidate_current_city and job_city_norm:
        if job_city_norm in candidate_current_city.lower() or candidate_current_city.lower() in job_city_norm:
            return 0.7

    return 0.2


# ---------------------------------------------------------------------------
# Experience matching
# ---------------------------------------------------------------------------

def _experience_score(
    candidate_years: Optional[float],
    job_description: Optional[str],
    slack: float,
) -> tuple[float, Optional[str]]:
    """
    Returns (score, reason_note).
    Parses experience requirements from job description text.
    """
    if candidate_years is None:
        return 0.0, "Profile incomplete: add years of experience"

    # Extract experience range from description
    min_exp: Optional[float] = None
    max_exp: Optional[float] = None

    text = (job_description or "").lower()

    # Patterns: "2-5 years", "3 to 7 years", "minimum 2 years", "at least 3 years"
    range_match = re.search(r"(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)\s*years?", text)
    min_match = re.search(r"(?:minimum|at least|min\.?)\s*(\d+(?:\.\d+)?)\s*years?", text)
    single_match = re.search(r"(\d+)\+?\s*years?\s*(?:of\s+)?(?:experience|exp)", text)

    if range_match:
        min_exp = float(range_match.group(1))
        max_exp = float(range_match.group(2))
    elif min_match:
        min_exp = float(min_match.group(1))
    elif single_match:
        min_exp = float(single_match.group(1))

    # No experience requirement found → unbounded → full score
    if min_exp is None:
        return 1.0, None

    effective_min = max(0.0, min_exp - slack)
    effective_max = (max_exp + slack) if max_exp is not None else float("inf")

    if effective_min <= candidate_years <= effective_max:
        return 1.0, None
    if candidate_years < effective_min:
        gap = effective_min - candidate_years
        score = max(0.0, 1.0 - (gap / max(min_exp, 1.0)) * 0.5)
        return round(score, 4), f"Under-experienced by {gap:.1f} yr(s)"
    # Over-experienced
    return 0.7, "Slightly over-experienced"


# ---------------------------------------------------------------------------
# Salary matching
# ---------------------------------------------------------------------------

def _salary_score(
    job_salary_min: Optional[float],
    job_salary_max: Optional[float],
    job_pay_period: Optional[str],
    candidate_min_salary: Optional[float],
    slack_pct: float,
) -> float:
    """Returns 0.0–1.0. Missing data on either side → neutral 0.5."""
    if job_salary_min is None and job_salary_max is None:
        return 0.5  # No job salary info → pass with neutral score
    if candidate_min_salary is None:
        return 0.5  # Candidate hasn't stated salary → neutral

    job_min_annual = _to_annual_inr(job_salary_min, job_pay_period)
    job_max_annual = _to_annual_inr(job_salary_max or job_salary_min, job_pay_period)

    # Normalise LPA vs absolute INR
    job_min_annual = _normalise_inr(job_min_annual)
    job_max_annual = _normalise_inr(job_max_annual)
    cand_min = _normalise_inr(candidate_min_salary)

    if job_max_annual is None or cand_min is None:
        return 0.5

    effective_job_max = job_max_annual * (1 + slack_pct)
    effective_job_min = (job_min_annual or 0) * (1 - slack_pct)

    if cand_min <= effective_job_max:
        # Candidate salary expectation within job range
        if job_min_annual and cand_min >= effective_job_min:
            return 1.0
        # Candidate expects less than job minimum (positive — they are affordable)
        return 1.0
    else:
        # Job max < candidate min → gap
        gap_ratio = (cand_min - effective_job_max) / max(cand_min, 1)
        return max(0.0, round(1.0 - gap_ratio, 4))


# ---------------------------------------------------------------------------
# Skills matching
# ---------------------------------------------------------------------------

def _skills_score(
    candidate_skill_slugs: set[str],
    job_required_slugs: set[str],
    job_preferred_slugs: set[str],
    preferred_skills_cap: float,
) -> tuple[float, list[str], list[str]]:
    """
    Returns (score, matched_required_names, missing_required_slugs).
    """
    matched_required = candidate_skill_slugs & job_required_slugs
    missing_required = job_required_slugs - candidate_skill_slugs

    if job_required_slugs:
        base_score = len(matched_required) / len(job_required_slugs)
    else:
        base_score = 0.0  # No required skills → base = 0

    # Preferred skill bonus
    matched_preferred = candidate_skill_slugs & job_preferred_slugs
    if job_preferred_slugs:
        preferred_ratio = len(matched_preferred) / len(job_preferred_slugs)
    else:
        preferred_ratio = 0.0

    bonus = min(preferred_ratio * preferred_skills_cap, preferred_skills_cap)
    final_score = min(1.0, base_score + bonus)

    return round(final_score, 4), sorted(matched_required), sorted(missing_required)


# ---------------------------------------------------------------------------
# Main scoring function
# ---------------------------------------------------------------------------

def score_job_for_candidate(
    db: Session,
    profile: UserProfile,
    user: User,
    job: JobListing,
    weights: dict,
    tolerances: dict,
    bonus: dict,
) -> Optional[dict]:
    """
    Score a single job against a candidate profile.

    Returns None if the job fails a hard filter.
    Otherwise returns a result dict:
    {
        score: float (0-1),
        matched_skills: [str],
        missing_skills: [str],
        sub_scores: {factor: float},
        reasons: [str],
        incomplete_profile: bool,
        pass_hard_filter: True,
    }
    """
    # ── Decode profile fields ────────────────────────────────────────────
    def _jl(val, default=None):
        if not val:
            return default or []
        try:
            r = json.loads(val)
            return r if isinstance(r, list) else (default or [])
        except Exception:
            return default or []

    candidate_skills_raw: list[str] = _jl(profile.skills)
    preferred_roles: list[str] = _jl(profile.preferred_roles)
    preferred_locations: list[str] = _jl(profile.preferred_locations)

    # Career preferences may override preferred_locations
    career_prefs: dict = {}
    if profile.career_preferences:
        try:
            career_prefs = json.loads(profile.career_preferences)
        except Exception:
            pass
    if career_prefs.get("preferred_locations"):
        preferred_locations = career_prefs["preferred_locations"]

    preferred_roles_from_prefs = career_prefs.get("role_category") or career_prefs.get("desired_job_type")
    if preferred_roles_from_prefs and not preferred_roles:
        preferred_roles = [preferred_roles_from_prefs]

    candidate_years: Optional[float] = (
        float(profile.years_experience) if profile.years_experience is not None else None
    )
    candidate_min_salary: Optional[float] = (
        float(profile.min_salary) if profile.min_salary is not None else None
    )
    candidate_education_raw: str = ""
    edu_details: dict = {}
    if profile.education_details:
        try:
            edu_details = json.loads(profile.education_details)
        except Exception:
            pass
    candidate_education_raw = (
        edu_details.get("highest_qualification") or profile.education or ""
    )

    # Normalise candidate skills to slugs
    candidate_skill_slugs: set[str] = set(normalise_skill_list(candidate_skills_raw, db))

    # ── Get job skills from job_skills table ─────────────────────────────
    job_skill_rows = db.query(JobSkill, CanonicalSkill).join(
        CanonicalSkill, JobSkill.canonical_skill_id == CanonicalSkill.id
    ).filter(JobSkill.job_id == job.id).all()

    job_required_slugs: set[str] = set()
    job_preferred_slugs: set[str] = set()
    for row in job_skill_rows:
        if row.JobSkill.is_required:
            job_required_slugs.add(row.CanonicalSkill.slug)
        else:
            job_preferred_slugs.add(row.CanonicalSkill.slug)

    # ── Hard Filters ──────────────────────────────────────────────────────

    # 1. India eligibility
    if not job.is_india_eligible:
        return None

    # 2. Skills hard filter: job has required skills, candidate has profile skills,
    #    but 0 overlap → exclude (only when candidate has ≥5 skills)
    if job_required_slugs and len(candidate_skill_slugs) >= 5:
        if not (candidate_skill_slugs & job_required_slugs):
            return None

    # 3. Education hard filter
    job_min_edu_rank = _job_min_education_rank(job.description_plain)
    candidate_edu_rank = _education_rank(candidate_education_raw)
    if job_min_edu_rank > 0 and candidate_edu_rank > 0:
        if candidate_edu_rank < job_min_edu_rank:
            return None  # Candidate doesn't meet education requirement

    # ── Factor Scoring ────────────────────────────────────────────────────
    pref_cap = bonus.get("preferred_skills_cap", DEFAULT_BONUS["preferred_skills_cap"])
    exp_slack = tolerances.get("exp_years_slack", DEFAULT_TOLERANCES["exp_years_slack"])
    sal_slack = tolerances.get("salary_slack_pct", DEFAULT_TOLERANCES["salary_slack_pct"])

    # Skills
    skills_score, matched_skills, missing_skills = _skills_score(
        candidate_skill_slugs, job_required_slugs, job_preferred_slugs, pref_cap
    )

    # Role
    role_score = _role_score(job.normalized_title, job.department, preferred_roles)

    # Experience
    exp_score, exp_note = _experience_score(candidate_years, job.description_plain, exp_slack)

    # Location
    loc_score = _location_score(
        job.city,
        job.work_mode,
        preferred_locations,
        profile.current_city,
    )

    # Salary
    sal_score = _salary_score(
        job.salary_min,
        job.salary_max,
        job.salary_pay_period,
        candidate_min_salary,
        sal_slack,
    )

    # Education
    if job_min_edu_rank == 0:
        edu_score = 1.0  # No requirement → full score
    elif candidate_edu_rank == 0:
        edu_score = 0.5  # Unknown candidate education → neutral
    else:
        edu_score = min(1.0, candidate_edu_rank / job_min_edu_rank)

    sub_scores = {
        "skills": skills_score,
        "role": role_score,
        "experience": exp_score,
        "location": loc_score,
        "salary": sal_score,
        "education": edu_score,
    }

    # Weighted final score
    final = sum(sub_scores[k] * weights.get(k, DEFAULT_WEIGHTS.get(k, 0)) for k in sub_scores)
    final = round(min(1.0, max(0.0, final)), 4)

    # Reasons
    reasons: list[str] = []
    if job_required_slugs:
        reasons.append(f"Skills: {len(matched_skills)}/{len(job_required_slugs)} required matched")
    if exp_note:
        reasons.append(exp_note)
    if role_score >= 0.85:
        reasons.append("Strong role match")
    elif role_score >= 0.5:
        reasons.append("Partial role match")
    if loc_score == 1.0 and job.work_mode == "remote":
        reasons.append("Remote opportunity")
    if sal_score < 0.5:
        reasons.append("Salary below expectation")

    incomplete_profile = (
        candidate_years is None
        or not candidate_skills_raw
        or not preferred_roles
    )

    return {
        "score": final,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "sub_scores": sub_scores,
        "reasons": reasons,
        "incomplete_profile": incomplete_profile,
        "pass_hard_filter": True,
    }


# ---------------------------------------------------------------------------
# Cache service
# ---------------------------------------------------------------------------

def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _profile_version(profile: UserProfile) -> str:
    return profile.updated_at.isoformat() if profile.updated_at else "0"


def _read_cache(db: Session, user_id: str, job_id: str, profile_version: str, config_version: int) -> Optional[dict]:
    row = db.query(MatchCache).filter_by(user_id=user_id, job_id=job_id).first()
    if not row:
        return None
    if row.expires_at < _utcnow():
        return None
    if row.profile_version != profile_version:
        return None
    if row.config_version != config_version:
        return None
    return {
        "score": float(row.score),
        "matched_skills": json.loads(row.matched_skills_json or "[]"),
        "missing_skills": json.loads(row.missing_skills_json or "[]"),
        "reasons": json.loads(row.reasons_json or "[]"),
        "sub_scores": json.loads(row.sub_scores_json or "{}"),
        "incomplete_profile": False,
        "pass_hard_filter": True,
        "_from_cache": True,
    }


def _write_cache(
    db: Session,
    user_id: str,
    job_id: str,
    result: dict,
    profile_version: str,
    config_version: int,
    ttl_minutes: int = CACHE_TTL_MINUTES,
) -> None:
    expires = _utcnow() + timedelta(minutes=ttl_minutes)
    existing = db.query(MatchCache).filter_by(user_id=user_id, job_id=job_id).first()
    if existing:
        existing.score = result["score"]
        existing.matched_skills_json = json.dumps(result.get("matched_skills", []))
        existing.missing_skills_json = json.dumps(result.get("missing_skills", []))
        existing.reasons_json = json.dumps(result.get("reasons", []))
        existing.sub_scores_json = json.dumps(result.get("sub_scores", {}))
        existing.profile_version = profile_version
        existing.config_version = config_version
        existing.computed_at = _utcnow()
        existing.expires_at = expires
    else:
        db.add(MatchCache(
            id=str(uuid.uuid4()),
            user_id=user_id,
            job_id=job_id,
            score=result["score"],
            matched_skills_json=json.dumps(result.get("matched_skills", [])),
            missing_skills_json=json.dumps(result.get("missing_skills", [])),
            reasons_json=json.dumps(result.get("reasons", [])),
            sub_scores_json=json.dumps(result.get("sub_scores", {})),
            profile_version=profile_version,
            config_version=config_version,
            computed_at=_utcnow(),
            expires_at=expires,
        ))
    db.commit()


def invalidate_user_cache(db: Session, user_id: str) -> None:
    """Delete all cache entries for a user — call on profile update."""
    db.query(MatchCache).filter_by(user_id=user_id).delete(synchronize_session=False)
    db.commit()


# ---------------------------------------------------------------------------
# Public API: get_recommendations
# ---------------------------------------------------------------------------

def get_recommendations(
    db: Session,
    user: User,
    profile: UserProfile,
    page: int = 1,
    page_size: int = 20,
    min_score: float = 0.0,
) -> dict:
    """
    Return paginated recommended jobs for an authenticated candidate.

    Steps:
    1. Load active, non-duplicate, india-eligible jobs
    2. Score each job (using cache where valid)
    3. Sort by score descending
    4. Paginate

    Returns:
    {
        total: int,
        page: int,
        page_size: int,
        total_pages: int,
        results: [{job fields + score + match data}],
        profile_complete: bool,
        profile_completion_pct: int,
    }
    """
    weights, tolerances, bonus, config_version = _load_config(db)
    pv = _profile_version(profile)

    # Pull jobs: active, non-duplicate, india-eligible
    jobs = (
        db.query(JobListing)
        .filter(
            JobListing.is_duplicate == False,
            JobListing.is_india_eligible == True,
            JobListing.freshness_status == "active",
        )
        .order_by(JobListing.first_seen_at.desc())
        .limit(2000)   # Cap to avoid N+1 at scale; good enough for 2500 jobs
        .all()
    )

    scored: list[dict] = []

    for job in jobs:
        # Try cache first
        cached = _read_cache(db, user.id, job.id, pv, config_version)
        if cached is not None:
            entry = cached
        else:
            result = score_job_for_candidate(
                db=db,
                profile=profile,
                user=user,
                job=job,
                weights=weights,
                tolerances=tolerances,
                bonus=bonus,
            )
            if result is None:
                continue  # Hard filter failed
            entry = result
            _write_cache(db, user.id, job.id, result, pv, config_version)

        if entry["score"] < min_score:
            continue

        scored.append({
            "job_id": job.id,
            "title": job.title,
            "normalized_title": job.normalized_title,
            "company_name": job.company_name,
            "city": job.city,
            "work_mode": job.work_mode,
            "employment_type": job.employment_type,
            "department": job.department,
            "salary_min": float(job.salary_min) if job.salary_min is not None else None,
            "salary_max": float(job.salary_max) if job.salary_max is not None else None,
            "salary_currency": job.salary_currency,
            "salary_pay_period": job.salary_pay_period,
            "application_url": job.application_url,
            "location_category": job.location_category,
            "publication_date": job.publication_date.isoformat() if job.publication_date else None,
            "first_seen_at": job.first_seen_at.isoformat() if job.first_seen_at else None,
            "match_score": entry["score"],
            "match_score_pct": round(entry["score"] * 100),
            "matched_skills": entry.get("matched_skills", []),
            "missing_skills": entry.get("missing_skills", []),
            "reasons": entry.get("reasons", []),
            "sub_scores": entry.get("sub_scores", {}),
            "incomplete_profile": entry.get("incomplete_profile", False),
        })

    # Sort by score descending, then recency
    scored.sort(key=lambda x: (-x["match_score"], x["first_seen_at"] or ""))

    total = len(scored)
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    end = start + page_size
    page_results = scored[start:end]

    profile_complete = (profile.profile_completion_pct or 0) >= 60

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "results": page_results,
        "profile_complete": profile_complete,
        "profile_completion_pct": profile.profile_completion_pct or 0,
    }

