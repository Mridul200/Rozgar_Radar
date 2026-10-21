"""
Bridge to the top-level ai package for backward-compatibility.
"""
from ai.ats_scorer import (
    COMMON_TECH_SKILLS,
    SOFT_SKILLS,
    ACTION_VERBS,
    extract_tokens,
    analyze_resume_ats
)

__all__ = [
    "COMMON_TECH_SKILLS",
    "SOFT_SKILLS",
    "ACTION_VERBS",
    "extract_tokens",
    "analyze_resume_ats"
]
