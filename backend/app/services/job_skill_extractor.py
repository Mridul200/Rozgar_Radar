"""
Deterministic job-skill extractor for the Rozgar Radar matching engine.

This module populates the job_skills table by scanning each job's
normalized_title and description_plain for known skill tokens from the
canonical taxonomy.  It uses NO AI/LLM — only exact-match and regex rules.

Usage:
    from app.services.job_skill_extractor import extract_and_store_job_skills
    extract_and_store_job_skills(db, job_id, normalized_title, description_plain)
"""

from __future__ import annotations
import re
import uuid
import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.models.matching import SkillAlias, CanonicalSkill, JobSkill

logger = logging.getLogger(__name__)

# Ordered from longest → shortest so "react native" is matched before "react"
_TITLE_BOOST_SKILLS = [
    "react native", "ruby on rails", "next.js", "node.js", "spring boot",
    "asp.net", "vue.js", "angular", "machine learning", "deep learning",
    "apache spark", "power bi", "github actions", "scikit-learn",
    "react", "python", "javascript", "typescript", "java", "golang", "rust",
    "scala", "kotlin", "swift", "php", "django", "fastapi", "flask",
    "postgresql", "mongodb", "redis", "kubernetes", "docker", "aws", "gcp",
    "azure", "terraform", "ansible", "jenkins", "elasticsearch", "linux",
    "tensorflow", "pytorch", "pandas", "numpy", "graphql", "git",
    "sql", "html", "css",
]


def _get_alias_map(db: Session) -> dict[str, str]:
    """Returns {normalized_alias: canonical_skill_id}."""
    rows = db.query(SkillAlias).all()
    return {r.normalized_alias: r.canonical_skill_id for r in rows}


def _tokenize(text: str) -> str:
    """Lowercase and normalise whitespace."""
    return re.sub(r"\s+", " ", text.lower().strip())


def _extract_skill_ids(text: str, alias_map: dict[str, str]) -> dict[str, bool]:
    """
    Scan `text` for alias matches (longest first).
    Returns {canonical_skill_id: is_required} where is_required indicates
    whether the skill appeared in a 'required' context.
    """
    found: dict[str, bool] = {}
    text_lower = _tokenize(text)

    # Sort aliases longest first to avoid partial overlaps
    sorted_aliases = sorted(alias_map.keys(), key=len, reverse=True)

    for alias in sorted_aliases:
        # Word-boundary aware regex so "java" doesn't match inside "javascript"
        pattern = r"(?<![a-z0-9])" + re.escape(alias) + r"(?![a-z0-9])"
        if re.search(pattern, text_lower):
            skill_id = alias_map[alias]
            if skill_id not in found:
                # Heuristic: if alias appears near required/must/essential → is_required=True
                # Otherwise default True; preferred context words → False
                is_req = True
                ctx_window = 120
                for m in re.finditer(pattern, text_lower):
                    start = max(0, m.start() - ctx_window)
                    end = min(len(text_lower), m.end() + ctx_window)
                    context = text_lower[start:end]
                    if any(kw in context for kw in ("nice to have", "preferred", "plus", "bonus", "desirable")):
                        is_req = False
                        break
                found[skill_id] = is_req

    return found


def extract_and_store_job_skills(
    db: Session,
    job_id: str,
    normalized_title: Optional[str],
    description_plain: Optional[str],
    overwrite: bool = False,
) -> int:
    """
    Extract skills from job text and upsert into job_skills table.

    Args:
        db: SQLAlchemy session
        job_id: job_listings.id
        normalized_title: job.normalized_title (used for boosting)
        description_plain: job.description_plain (primary signal)
        overwrite: if True, delete existing job_skills rows first

    Returns:
        Number of skills inserted/updated.
    """
    alias_map = _get_alias_map(db)
    if not alias_map:
        logger.warning("skill_aliases table is empty — run seed_skill_taxonomy first")
        return 0

    combined_text = " ".join(filter(None, [normalized_title or "", description_plain or ""]))
    if not combined_text.strip():
        return 0

    found = _extract_skill_ids(combined_text, alias_map)

    if not found:
        return 0

    if overwrite:
        db.query(JobSkill).filter_by(job_id=job_id).delete(synchronize_session=False)

    inserted = 0
    for canonical_skill_id, is_required in found.items():
        existing = db.query(JobSkill).filter_by(
            job_id=job_id, canonical_skill_id=canonical_skill_id
        ).first()
        if not existing:
            db.add(JobSkill(
                id=str(uuid.uuid4()),
                job_id=job_id,
                canonical_skill_id=canonical_skill_id,
                is_required=is_required,
                weight=1.0,
            ))
            inserted += 1

    if inserted:
        db.commit()

    return inserted


def bulk_extract_all_jobs(db: Session, batch_size: int = 200) -> dict:
    """
    Extract skills for all jobs that currently have no entries in job_skills.
    Returns summary stats.
    """
    from app.models.job import JobListing
    from sqlalchemy import not_, exists

    already_done = db.query(JobSkill.job_id).distinct().subquery()
    jobs_to_process = (
        db.query(JobListing)
        .filter(
            not_(exists().where(JobSkill.job_id == JobListing.id)),
            JobListing.is_duplicate == False,
        )
        .yield_per(batch_size)
    )

    total = 0
    processed = 0
    for job in jobs_to_process:
        cnt = extract_and_store_job_skills(
            db=db,
            job_id=job.id,
            normalized_title=job.normalized_title,
            description_plain=job.description_plain,
            overwrite=False,
        )
        total += cnt
        processed += 1

    logger.info(f"bulk_extract_all_jobs: processed {processed} jobs, inserted {total} skill associations")
    return {"jobs_processed": processed, "skills_inserted": total}

