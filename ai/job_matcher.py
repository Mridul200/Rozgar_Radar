"""
AI Candidate & Job Matcher
Calculates compatibility metrics between candidate profiles (skills, preferences, experience)
and indexed job listings.
"""

from typing import Dict, List, Any, Optional
from ai.ats_scorer import COMMON_TECH_SKILLS, extract_tokens

def calculate_job_match(
    candidate_skills: List[str],
    candidate_preferred_roles: List[str],
    candidate_preferred_locations: List[str],
    job_title: str,
    job_description: Optional[str] = None,
    job_location: Optional[str] = None,
    job_work_mode: Optional[str] = None,
    is_india_eligible: bool = True
) -> Dict[str, Any]:
    """
    Computes a weighted match score between candidate preferences and a job listing.
    """
    c_skills_set = {s.lower().strip() for s in candidate_skills if s}
    job_text = f"{job_title or ''} {job_description or ''}".lower()
    
    # 1. Skill Match
    matched_skills = []
    missing_skills = []
    for skill in c_skills_set:
        if skill in job_text:
            matched_skills.append(skill)
        else:
            missing_skills.append(skill)
            
    skill_score = (len(matched_skills) / max(1, len(c_skills_set))) * 100 if c_skills_set else 70.0
    
    # 2. Role Title Match
    title_score = 40.0
    title_lower = (job_title or "").lower()
    for role in candidate_preferred_roles:
        r_clean = role.lower().strip()
        if r_clean and (r_clean in title_lower or title_lower in r_clean):
            title_score = 100.0
            break
        elif r_clean and any(word in title_lower for word in r_clean.split()):
            title_score = max(title_score, 75.0)
            
    # 3. Location & Mode Match
    loc_score = 60.0
    loc_lower = (job_location or "").lower()
    work_mode_lower = (job_work_mode or "").lower()
    
    if work_mode_lower == "remote" or "remote" in loc_lower:
        loc_score = 100.0
    else:
        for pref_loc in candidate_preferred_locations:
            if pref_loc.lower().strip() in loc_lower:
                loc_score = 100.0
                break
                
    # Weighted composite: 50% Skill, 30% Role, 20% Location
    overall_match = int((skill_score * 0.50) + (title_score * 0.30) + (loc_score * 0.20))
    overall_match = max(10, min(99, overall_match))
    
    return {
        "match_percentage": overall_match,
        "is_recommended": overall_match >= 70,
        "matched_skills": [s.title() for s in matched_skills],
        "missing_skills": [s.title() for s in missing_skills],
        "skill_compatibility": int(skill_score),
        "role_compatibility": int(title_score),
        "location_compatibility": int(loc_score)
    }
