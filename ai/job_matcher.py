"""
AI Candidate & Job Matcher
Calculates compatibility metrics between candidate profiles (skills, preferences, experience)
and indexed job listings.
"""

from typing import Dict, List, Any, Optional
from ai.ats_scorer import COMMON_TECH_SKILLS, extract_tokens

def _expand_skill_variants(skill: str) -> List[str]:
    s = skill.lower().strip()
    variants = [s]
    if "full stack" in s:
        variants.append(s.replace("full stack", "fullstack"))
        variants.append(s.replace("full stack", "full-stack"))
    elif "fullstack" in s:
        variants.append(s.replace("fullstack", "full stack"))
        variants.append(s.replace("fullstack", "full-stack"))
    elif "frontend" in s:
        variants.append(s.replace("frontend", "front end"))
        variants.append(s.replace("frontend", "front-end"))
    elif "front end" in s:
        variants.append(s.replace("front end", "frontend"))
    elif "backend" in s:
        variants.append(s.replace("backend", "back end"))
        variants.append(s.replace("backend", "back-end"))
    elif "back end" in s:
        variants.append(s.replace("back end", "backend"))
    elif s in ["react", "react.js", "reactjs"]:
        variants.extend(["react", "react.js", "reactjs"])
    elif s in ["node", "node.js", "nodejs"]:
        variants.extend(["node", "node.js", "nodejs"])
    elif s in ["vue", "vue.js", "vuejs"]:
        variants.extend(["vue", "vue.js", "vuejs"])
    elif s in ["angular", "angularjs"]:
        variants.extend(["angular", "angularjs"])
    elif s in ["power bi", "powerbi"]:
        variants.extend(["power bi", "powerbi"])
    return list(dict.fromkeys(variants))

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
    c_skills_set = {s.lower().strip() for s in candidate_skills if s.strip()}
    job_text = f"{job_title or ''} {job_description or ''}".lower()
    
    # 1. Skill Match with variant tolerance
    matched_skills = []
    missing_skills = []
    for skill in c_skills_set:
        variants = _expand_skill_variants(skill)
        if any(v in job_text for v in variants):
            matched_skills.append(skill)
        else:
            missing_skills.append(skill)
            
    skill_score = (len(matched_skills) / max(1, len(c_skills_set))) * 100 if c_skills_set else 70.0
    
    # 2. Role Title Match
    title_score = 45.0
    title_lower = (job_title or "").lower()
    for role in candidate_preferred_roles:
        r_clean = role.lower().strip()
        if not r_clean:
            continue
        variants = _expand_skill_variants(r_clean)
        if any(v in title_lower or title_lower in v for v in variants):
            title_score = 100.0
            break
        elif any(w in title_lower for w in ["full stack", "fullstack", "software engineer", "developer", "engineer"] if any(w in v for v in variants)):
            title_score = max(title_score, 85.0)
        elif any(word in title_lower for word in r_clean.split() if len(word) > 3):
            title_score = max(title_score, 75.0)
            
    # 3. Location & Mode Match
    loc_lower = (job_location or "").lower()
    work_mode_lower = (job_work_mode or "").lower()
    
    if work_mode_lower == "remote" or "remote" in loc_lower:
        loc_score = 100.0
    elif not candidate_preferred_locations:
        # Candidate has no restrictive location preference
        loc_score = 85.0
    else:
        loc_score = 40.0
        for pref_loc in candidate_preferred_locations:
            pl_clean = pref_loc.lower().strip()
            if pl_clean and (pl_clean in loc_lower or loc_lower in pl_clean):
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
