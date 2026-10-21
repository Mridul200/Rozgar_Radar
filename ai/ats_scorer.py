import re
from typing import Dict, List, Any, Optional

COMMON_TECH_SKILLS = [
    "python", "javascript", "typescript", "react", "next.js", "node.js", "vue", "angular",
    "fastapi", "django", "flask", "express", "sql", "postgresql", "mysql", "mongodb",
    "redis", "sqlite", "docker", "kubernetes", "aws", "gcp", "azure", "git", "github",
    "ci/cd", "rest api", "graphql", "html", "css", "tailwind", "linux", "agile",
    "scrum", "data structures", "algorithms", "machine learning", "deep learning",
    "nlp", "pytorch", "tensorflow", "pandas", "numpy", "java", "c++", "c#", "go", "rust",
    "microservices", "kafka", "rabbitmq", "unit testing", "jest", "pytest", "terraform"
]

SOFT_SKILLS = [
    "leadership", "communication", "collaboration", "problem solving", "mentorship",
    "project management", "critical thinking", "adaptability", "teamwork", "ownership"
]

ACTION_VERBS = [
    "engineered", "architected", "developed", "spearheaded", "optimized", "implemented",
    "designed", "reduced", "increased", "built", "launched", "scaled", "automated",
    "streamlined", "delivered", "orchestrated", "transformed", "established"
]

def extract_tokens(text: str) -> set[str]:
    """Extract cleaned lowercase words/terms."""
    cleaned = re.sub(r"[^\w\s\.\+#/]", " ", (text or "").lower())
    return set(cleaned.split())

def analyze_resume_ats(resume_text: str, job_description: str, target_role: Optional[str] = None) -> Dict[str, Any]:
    """
    Evaluates resume text against a target job description and role using ATS heuristics:
    1. Keyword & Technical Skill Extraction
    2. Readability & Formatting Hygiene
    3. Quantitative Metrics & Action Verbs
    4. Experience & Structural Alignment
    """
    resume_lower = (resume_text or "").lower()
    jd_lower = (job_description or "").lower()

    if not resume_lower.strip():
        return {
            "overall_score": 0,
            "match_level": "Needs Improvement",
            "matched_skills": [],
            "missing_skills": ["No resume content provided to evaluate"],
            "skill_breakdown": [],
            "experience_score": 0,
            "readability_score": 0,
            "keyword_coverage_percent": 0,
            "formatting_observations": ["Resume content is completely empty."],
            "actionable_suggestions": ["Upload or write resume content before running ATS analysis."],
            "evidence_snippets": [],
            "role_alignment_notes": "Unable to evaluate empty resume.",
            "disclaimer": "This score is an automated heuristic estimate and does not guarantee employer hiring outcomes."
        }

    # 1. Identify skills required in JD
    jd_skills = []
    for skill in COMMON_TECH_SKILLS + SOFT_SKILLS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, jd_lower):
            jd_skills.append(skill)

    # Fallback to top tech skills if JD is very short
    if not jd_skills:
        for skill in COMMON_TECH_SKILLS[:12]:
            if skill in resume_lower:
                jd_skills.append(skill)
        if not jd_skills:
            jd_skills = ["python", "javascript", "sql", "git", "react", "rest api"]

    # 2. Check matched vs missing skills
    matched_skills = []
    missing_skills = []
    skill_breakdown = []

    for skill in jd_skills:
        pattern = r"\b" + re.escape(skill) + r"\b"
        is_found = bool(re.search(pattern, resume_lower))
        cat = "soft" if skill in SOFT_SKILLS else "technical"
        if is_found:
            matched_skills.append(skill)
            skill_breakdown.append({"skill": skill.title(), "found": True, "category": cat})
        else:
            missing_skills.append(skill)
            skill_breakdown.append({"skill": skill.title(), "found": False, "category": cat})

    keyword_coverage = int((len(matched_skills) / max(1, len(jd_skills))) * 100)

    # 3. Readability & formatting checks
    formatting_observations = []
    readability_score = 75

    # Check for measurable impact (percentages, numbers, currencies)
    metrics_count = len(re.findall(r"\b(?:\d+[\%kK\+]?|\$\d+|\₹\d+)\b", resume_text))
    if metrics_count >= 4:
        formatting_observations.append("Excellent quantitative impact: Found concrete numbers, percentages, and metrics.")
        readability_score += 15
    elif metrics_count >= 1:
        formatting_observations.append("Moderate metric usage: Consider adding more quantifiable outcomes (e.g. 'reduced latency by 35%').")
        readability_score += 5
    else:
        formatting_observations.append("Lacks quantifiable metrics: Add measurable results to bullet points for higher recruiter impact.")
        readability_score -= 15

    # Check for action verbs
    verbs_found = [v for v in ACTION_VERBS if re.search(r"\b" + v + r"\b", resume_lower)]
    if len(verbs_found) >= 4:
        formatting_observations.append(f"Strong action verbs detected: {', '.join(verbs_found[:4])}.")
        readability_score += 10
    else:
        formatting_observations.append("Passive wording observed: Start bullet points with strong action verbs (e.g. 'Architected', 'Spearheaded').")
        readability_score -= 10

    # Check standard section headers
    expected_sections = ["experience", "education", "skills", "projects"]
    found_sections = [s for s in expected_sections if s in resume_lower]
    if len(found_sections) >= 3:
        formatting_observations.append(f"Standard ATS structure verified: Detected sections ({', '.join(found_sections).title()}).")
    else:
        formatting_observations.append("Consider adding explicit section headers: 'Work Experience', 'Education', 'Technical Skills', 'Projects'.")

    readability_score = max(30, min(95, readability_score))

    # 4. Experience & role alignment
    exp_matches = 0
    if target_role and target_role.lower() in resume_lower:
        exp_matches += 1

    years_mentions = re.findall(r"(\d+)\+?\s*years?", resume_lower)
    if years_mentions:
        experience_score = 80
    else:
        experience_score = 65

    # 5. Extract Evidence Snippets from Resume
    evidence_snippets = []
    sentences = re.split(r"[\n\.\;]", resume_text)
    for sent in sentences:
        s_clean = sent.strip()
        if len(s_clean) > 25 and any(m in s_clean.lower() for m in matched_skills[:5]):
            if len(evidence_snippets) < 4:
                evidence_snippets.append(s_clean)

    # 6. Overall Weighted Score: Keyword coverage (50%), Readability (25%), Experience (25%)
    overall = int((keyword_coverage * 0.50) + (readability_score * 0.25) + (experience_score * 0.25))
    overall = max(20, min(96, overall))

    if overall >= 80:
        match_level = "High"
    elif overall >= 60:
        match_level = "Moderate"
    else:
        match_level = "Needs Improvement"

    # 7. Actionable Suggestions
    actionable_suggestions = []
    if missing_skills:
        actionable_suggestions.append(
            f"Integrate key missing keywords into your Skills or Project bullet points: {', '.join([s.title() for s in missing_skills[:4]])}."
        )
    if metrics_count < 3:
        actionable_suggestions.append(
            "Quantify your accomplishments using the formula: Accomplished [X] as measured by [Y] by doing [Z]."
        )
    if "education" not in found_sections:
        actionable_suggestions.append("Ensure an explicit 'Education' section with your degree and graduation year.")
    if len(resume_text.split()) < 150:
        actionable_suggestions.append("Resume is too brief. Provide more technical context and detail about past responsibilities.")
    if not actionable_suggestions:
        actionable_suggestions.append("Great alignment! Tailor your summary slightly to mirror the target company's mission statement.")

    role_notes = f"Analyzed against '{target_role or 'Target Job Description'}'. Keyword match reflects alignment with core technical stack and requirements."

    return {
        "overall_score": overall,
        "match_level": match_level,
        "matched_skills": [s.title() for s in matched_skills],
        "missing_skills": [s.title() for s in missing_skills],
        "skill_breakdown": skill_breakdown,
        "experience_score": experience_score,
        "readability_score": readability_score,
        "keyword_coverage_percent": keyword_coverage,
        "formatting_observations": formatting_observations,
        "actionable_suggestions": actionable_suggestions,
        "evidence_snippets": evidence_snippets[:4],
        "role_alignment_notes": role_notes,
        "disclaimer": "This score is an automated ATS readiness estimate based on keyword frequency, structural hygiene, and skill extraction. It does not guarantee employment or bypass human review."
    }
