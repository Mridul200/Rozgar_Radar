"""
SQLAlchemy models for the Profile-to-Job Matching System.

Tables:
  canonical_skills   — master skill taxonomy (id, name, slug, category)
  skill_aliases      — alias → canonical_skill mapping (for fuzzy normalization)
  job_skills         — job ↔ canonical_skill associations (required / preferred)
  matching_config    — single-row versioned weight/tolerance config
  match_cache        — persistent SQLite cache for computed match scores (TTL 15 min)
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Integer,
    Numeric, ForeignKey, Index, UniqueConstraint
)
from app.database import Base, utc_now


class CanonicalSkill(Base):
    """Master list of standardised skills used for deterministic matching."""
    __tablename__ = "canonical_skills"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False, unique=True)      # Display name e.g. "Python"
    slug = Column(String(128), nullable=False, unique=True)      # Normalised key e.g. "python"
    category = Column(String(64), nullable=True)                 # e.g. "language", "framework", "tool"
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_canonical_skill_slug", "slug"),
    )


class SkillAlias(Base):
    """Maps alias strings (lowercased) to a canonical skill."""
    __tablename__ = "skill_aliases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    canonical_skill_id = Column(
        String(36),
        ForeignKey("canonical_skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alias = Column(String(128), nullable=False)           # Original alias text
    normalized_alias = Column(String(128), nullable=False) # alias.lower().strip()
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("normalized_alias", name="uq_skill_alias_normalized"),
        Index("idx_skill_alias_normalized", "normalized_alias"),
    )


class JobSkill(Base):
    """Associates a job listing with one or more canonical skills."""
    __tablename__ = "job_skills"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(
        String(64),
        ForeignKey("job_listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    canonical_skill_id = Column(
        String(36),
        ForeignKey("canonical_skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_required = Column(Boolean, default=True, nullable=False)  # True=required, False=preferred
    weight = Column(Numeric(3, 2), default=1.0, nullable=False)  # relative importance 0.0–1.0
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("job_id", "canonical_skill_id", name="uq_job_skill"),
        Index("idx_job_skill_job", "job_id"),
        Index("idx_job_skill_canonical", "canonical_skill_id"),
    )


class MatchingConfig(Base):
    """
    Single-row versioned configuration for the matching engine.
    Row id=1 is always the active config.
    weights_json : {"skills": 0.40, "role": 0.20, "experience": 0.15,
                    "location": 0.10, "salary": 0.10, "education": 0.05}
    tolerances_json: {"exp_years_slack": 1.0, "salary_slack_pct": 0.10}
    bonus_json: {"preferred_skills_cap": 0.10}
    """
    __tablename__ = "matching_config"

    id = Column(Integer, primary_key=True, default=1)
    version = Column(Integer, default=1, nullable=False)
    weights_json = Column(Text, nullable=False)
    tolerances_json = Column(Text, nullable=False)
    bonus_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)


class MatchCache(Base):
    """
    Persistent SQLite cache for computed match scores.
    Entries are invalidated when:
      - profile.updated_at changes (profile_version mismatch)
      - expires_at < NOW  (TTL exceeded, default 15 min)
      - config_version mismatch
    """
    __tablename__ = "match_cache"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    job_id = Column(String(64), nullable=False, index=True)

    score = Column(Numeric(5, 4), nullable=False)             # 0.0000 – 1.0000

    # JSON-encoded lists of canonical skill names
    matched_skills_json = Column(Text, nullable=True)         # ["Python","React"]
    missing_skills_json = Column(Text, nullable=True)         # ["Kubernetes"]

    # Human-readable reason phrases
    reasons_json = Column(Text, nullable=True)                # ["Skills: 3/5 matched", …]

    # Factor-level sub-scores for display
    sub_scores_json = Column(Text, nullable=True)             # {"skills":0.6,"role":1.0,…}

    # Version stamps for cache invalidation
    profile_version = Column(String(32), nullable=False)      # profile.updated_at ISO string
    config_version = Column(Integer, nullable=False)

    computed_at = Column(DateTime, default=utc_now, nullable=False)
    expires_at = Column(DateTime, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_match_cache_user_job"),
        Index("idx_match_cache_user", "user_id"),
        Index("idx_match_cache_expires", "expires_at"),
    )

