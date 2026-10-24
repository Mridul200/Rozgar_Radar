import re
from typing import Dict, List, Any, Optional

COMMON_TECH_SKILLS = [
    "python", "javascript", "typescript", "react", "next.js", "node.js", "vue", "angular",
    "fastapi", "django", "flask", "express", "sql", "postgresql", "mysql", "mongodb",
    "redis", "sqlite", "docker", "kubernetes", "aws", "gcp", "azure", "git", "github",
    "ci/cd", "rest api", "graphql", "html", "css", "tailwind", "linux", "agile",
    "scrum", "data structures", "algorithms", "machine learning", "deep learning",
    "nlp", "pytorch", "tensorflow", "pandas", "numpy", "java", "c++", "c#", "go", "rust",
    "microservices", "kafka", "rabbitmq", "unit testing", "jest", "pytest", "terraform",
    "full stack", "fullstack", "frontend", "backend", "web development", "software engineering",
    "system design", "distributed systems", "api design", "react native", "flutter", "cloud architecture", "cloud computing",
    "power bi", "excel", "tableau", "selenium", "etl", "etl pipelines", "airflow", "spark", "pyspark", "snowflake", "qa"
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

SYNONYM_MAP: Dict[str, str] = {
    "js": "javascript",
    "ts": "typescript",
    "reactjs": "react",
    "react.js": "react",
    "nodejs": "node.js",
    "nextjs": "next.js",
    "postgres": "postgresql",
    "k8s": "kubernetes",
    "amazon web services": "aws",
    "google cloud": "gcp",
    "google cloud platform": "gcp",
    "restful": "rest api",
    "restful api": "rest api",
    "rest": "rest api",
    "machine learning": "ml",
    "deep learning": "dl",
    "artificial intelligence": "ai",
    "ci/cd": "continuous integration",
    "devlopment": "development",
    "devloper": "developer",
    "pyhton": "python",
    "recat": "react",
    "javascrip": "javascript",
    "frotend": "frontend",
    "bakend": "backend",
    "full-stack": "full stack",
    "fullstack": "full stack",
    "front-end": "frontend",
    "back-end": "backend",
    "web dev": "web development",
    "full stack dev": "full stack developer",
}

def normalize_term(term: str) -> str:
    cleaned = term.lower().strip()
    return SYNONYM_MAP.get(cleaned, cleaned)

def extract_tokens(text: str) -> set:
    cleaned = re.sub(r"[^\w\s\.\+#/]", " ", (text or "").lower())
    return set(cleaned.split())

def analyze_resume_ats(
    resume_text: str,
    job_description: str,
    target_role: Optional[str] = None,
    company_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Rozgar Radar Transparent ATS Compatibility & Job Match Engine
    Calculates 5 distinct category subscores according to the required specification:
    1. Keyword Match (40%)
    2. Experience Relevance (20%)
    3. Section Completeness (15%)
    4. Formatting & Parsing Compatibility (15%)
    5. Content Quality & Achievements (10%)
    """
    resume_lower = (resume_text or "").lower()
    jd_lower = (job_description or "").lower()

    if not resume_lower.strip():
        return {
            "overall_score": 0,
            "match_level": "Needs Improvement",
            "subscores": {
                "keyword_match": 0,
                "experience_relevance": 0,
                "section_completeness": 0,
                "formatting_compatibility": 0,
                "content_quality": 0,
            },
            "keyword_analysis": {
                "required_matched": [],
                "required_missing": ["No resume content provided to evaluate"],
                "preferred_matched": [],
                "preferred_missing": [],
                "synonym_matches": []
            },
            "matched_skills": [],
            "missing_skills": ["No resume content provided to evaluate"],
            "skill_breakdown": [],
            "evidence_snippets": [],
            "formatting_warnings": [
                {
                    "title": "Empty Document",
                    "severity": "risk",
                    "confidence": "high",
                    "detail": "Resume content was empty or unreadable.",
                    "fix": "Upload a readable PDF/DOCX or write content in the Resume Builder."
                }
            ],
            "prioritized_improvements": [
                {
                    "priority": "high",
                    "category": "Content",
                    "recommendation": "Add your skills, work experience, or projects.",
                    "reason": "ATS systems require readable text to identify candidate qualifications.",
                    "can_fix_with_ai": True,
                    "target_section": "summary"
                }
            ],
            "experience_score": 0,
            "readability_score": 0,
            "keyword_coverage_percent": 0,
            "formatting_observations": ["Resume content is completely empty."],
            "actionable_suggestions": ["Upload or enter resume content before running ATS analysis."],
            "role_alignment_notes": "Unable to evaluate empty resume.",
            "disclaimer": "This score is an automated Rozgar Radar ATS Compatibility & Job Match estimate. It does not guarantee interview outcomes."
        }

    # 1. KEYWORD & SKILL MATCH (40% Weight)
    all_known_skills = COMMON_TECH_SKILLS + SOFT_SKILLS

    required_keywords = []
    preferred_keywords = []

    req_split = re.split(r"\b(preferred|nice to have|bonus|good to have)\b", jd_lower)
    req_text = req_split[0]
    pref_text = req_split[1] + req_split[2] if len(req_split) > 2 else ""

    for skill in all_known_skills:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, req_text):
            required_keywords.append(skill)
        elif pref_text and re.search(pattern, pref_text):
            preferred_keywords.append(skill)
        elif re.search(pattern, jd_lower):
            required_keywords.append(skill)

    if not required_keywords:
        for skill in ["python", "javascript", "sql", "git", "rest api"]:
            if skill in jd_lower or skill in resume_lower:
                required_keywords.append(skill)

    required_matched = []
    required_missing = []
    preferred_matched = []
    preferred_missing = []
    synonym_matches = []
    skill_breakdown = []

    for skill in required_keywords:
        pattern = r"\b" + re.escape(skill) + r"\b"
        is_direct = bool(re.search(pattern, resume_lower))
        is_synonym = False
        syn_term = ""

        if not is_direct:
            for syn, canon in SYNONYM_MAP.items():
                if canon == skill and re.search(r"\b" + re.escape(syn) + r"\b", resume_lower):
                    is_synonym = True
                    syn_term = syn
                    break

        cat = "soft" if skill in SOFT_SKILLS else "technical"

        if is_direct:
            required_matched.append(skill.title())
            skill_breakdown.append({"skill": skill.title(), "found": True, "category": cat})
        elif is_synonym:
            required_matched.append(skill.title())
            synonym_matches.append({"term": syn_term.upper(), "canonical": skill.title()})
            skill_breakdown.append({"skill": skill.title(), "found": True, "category": cat})
        else:
            required_missing.append(skill.title())
            skill_breakdown.append({"skill": skill.title(), "found": False, "category": cat})

    for skill in preferred_keywords:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, resume_lower):
            preferred_matched.append(skill.title())
        else:
            preferred_missing.append(skill.title())

    req_ratio = len(required_matched) / max(1, len(required_keywords))
    pref_ratio = len(preferred_matched) / max(1, len(preferred_keywords)) if preferred_keywords else 1.0
    keyword_match_subscore = int((req_ratio * 0.85 + pref_ratio * 0.15) * 100)
    keyword_match_subscore = max(10, min(100, keyword_match_subscore))

    # 2. EXPERIENCE RELEVANCE (20% Weight)
    exp_subscore = 65
    role_mentions = 0
    if target_role:
        for word in target_role.lower().split():
            if len(word) > 3 and word in resume_lower:
                role_mentions += 1
    if role_mentions >= 2:
        exp_subscore += 20
    elif role_mentions == 1:
        exp_subscore += 10

    years_matches = re.findall(r"(\d+)\+?\s*years?", resume_lower)
    if years_matches:
        exp_subscore += 10

    exp_subscore = max(20, min(100, exp_subscore))

    # 3. SECTION COMPLETENESS (15% Weight)
    detected_sections = []
    section_checks = {
        "summary": ["summary", "objective", "profile", "about"],
        "skills": ["skills", "technologies", "competencies"],
        "experience_or_projects": ["experience", "employment", "projects", "work history"],
        "education": ["education", "academic", "degree", "university", "b.tech", "college"],
        "contact": ["email", "phone", "@", "linkedin", "github"]
    }

    completeness_pts = 0
    for sec_name, keywords in section_checks.items():
        found = any(k in resume_lower for k in keywords)
        if found:
            detected_sections.append(sec_name)
            completeness_pts += 20

    section_completeness_subscore = max(20, min(100, completeness_pts))

    # 4. FORMATTING & PARSING COMPATIBILITY (15% Weight)
    formatting_warnings = []
    formatting_subscore = 85

    pipe_tables = len(re.findall(r"\|.*\|", resume_text))
    if pipe_tables > 4:
        formatting_warnings.append({
            "title": "Possible Table Formatting Detected",
            "severity": "warning",
            "confidence": "medium",
            "detail": "Observed multiple table divider rows. Some legacy ATS parsers scramble table columns into a single line.",
            "fix": "Use a single-column layout with clean bullet lists instead of complex tables."
        })
        formatting_subscore -= 10

    word_count = len(resume_text.split())
    if word_count < 120:
        formatting_warnings.append({
            "title": "Low Text Density",
            "severity": "risk",
            "confidence": "high",
            "detail": f"Resume contains only {word_count} words. ATS systems may mark this profile as incomplete.",
            "fix": "Expand your experience descriptions, skills list, and technical contributions."
        })
        formatting_subscore -= 20
    elif word_count > 1200:
        formatting_warnings.append({
            "title": "Extended Document Length",
            "severity": "info",
            "confidence": "medium",
            "detail": f"Document length is {word_count} words. Two-page or multi-page resumes may dilute keyword concentration.",
            "fix": "Tighten bullet points and focus on high-impact achievements from recent roles."
        })
        formatting_subscore -= 5

    has_email = bool(re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", resume_text))
    has_phone = bool(re.search(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+91[-.\s]?[6-9]\d{9}", resume_text))
    if not has_email:
        formatting_warnings.append({
            "title": "Missing Email Address in Extracted Text",
            "severity": "risk",
            "confidence": "high",
            "detail": "No valid email address was detected in the parsed text.",
            "fix": "Ensure your email is in plain text near the top of your resume, not embedded in an image header."
        })
        formatting_subscore -= 15

    formatting_subscore = max(20, min(100, formatting_subscore))

    # 5. CONTENT QUALITY & ACHIEVEMENTS (10% Weight)
    content_subscore = 65

    metrics_count = len(re.findall(r"\b(?:\d+[\%kK\+]?|\$\d+|\₹\d+)\b", resume_text))
    if metrics_count >= 4:
        content_subscore += 20
    elif metrics_count >= 1:
        content_subscore += 10
    else:
        content_subscore -= 10

    verbs_found = [v for v in ACTION_VERBS if re.search(r"\b" + v + r"\b", resume_lower)]
    if len(verbs_found) >= 4:
        content_subscore += 15
    elif len(verbs_found) >= 2:
        content_subscore += 5
    else:
        content_subscore -= 10

    content_subscore = max(20, min(100, content_subscore))

    # FINAL WEIGHTED SCORE
    final_score = int(
        (keyword_match_subscore * 0.40) +
        (exp_subscore * 0.20) +
        (section_completeness_subscore * 0.15) +
        (formatting_subscore * 0.15) +
        (content_subscore * 0.10)
    )
    final_score = max(15, min(98, final_score))

    if final_score >= 80:
        match_level = "High"
    elif final_score >= 60:
        match_level = "Moderate"
    else:
        match_level = "Needs Improvement"

    # EVIDENCE SNIPPETS
    evidence_snippets = []
    lines = [l.strip() for l in resume_text.splitlines() if len(l.strip()) > 25]
    for line in lines:
        for skill in (required_matched + preferred_matched)[:5]:
            if skill.lower() in line.lower() and len(evidence_snippets) < 4:
                if line not in evidence_snippets:
                    evidence_snippets.append(line)

    # PRIORITIZED IMPROVEMENTS
    prioritized_improvements = []

    if required_missing:
        prioritized_improvements.append({
            "priority": "high",
            "category": "Keywords",
            "recommendation": f"Add missing verified skills: {', '.join(required_missing[:4])}.",
            "reason": "Direct skill keywords account for 40% of ATS ranking algorithms.",
            "can_fix_with_ai": True,
            "target_section": "skills"
        })

    if metrics_count < 2:
        prioritized_improvements.append({
            "priority": "medium",
            "category": "Experience",
            "recommendation": "Quantify past achievements with real percentages, scale numbers, or latency metrics.",
            "reason": "ATS content quality scoring favors outcome-driven statements over generic duties.",
            "can_fix_with_ai": True,
            "target_section": "experience"
        })

    if "summary" not in detected_sections:
        prioritized_improvements.append({
            "priority": "medium",
            "category": "Structure",
            "recommendation": "Include a targeted 2-3 sentence Professional Summary at the top.",
            "reason": "Summaries anchor search queries and give recruiters immediate role alignment.",
            "can_fix_with_ai": True,
            "target_section": "summary"
        })

    if len(verbs_found) < 3:
        prioritized_improvements.append({
            "priority": "optional",
            "category": "Tone",
            "recommendation": "Start your bullet points with active engineering verbs (e.g., 'Architected', 'Engineered').",
            "reason": "Improves readability index and professional tone.",
            "can_fix_with_ai": True,
            "target_section": "experience"
        })

    role_notes = (
        f"Analyzed against '{target_role or 'Target Job Description'}'"
        + (f" at {company_name}" if company_name else "")
        + f". Overall ATS match is {final_score}/100 with {len(required_matched)} required skills verified."
    )

    return {
        "overall_score": final_score,
        "match_level": match_level,
        "subscores": {
            "keyword_match": keyword_match_subscore,
            "experience_relevance": exp_subscore,
            "section_completeness": section_completeness_subscore,
            "formatting_compatibility": formatting_subscore,
            "content_quality": content_subscore,
        },
        "keyword_analysis": {
            "required_matched": required_matched,
            "required_missing": required_missing,
            "preferred_matched": preferred_matched,
            "preferred_missing": preferred_missing,
            "synonym_matches": synonym_matches,
        },
        "matched_skills": required_matched + preferred_matched,
        "missing_skills": required_missing + preferred_missing,
        "skill_breakdown": skill_breakdown,
        "evidence_snippets": evidence_snippets[:4],
        "formatting_warnings": formatting_warnings,
        "prioritized_improvements": prioritized_improvements,
        "experience_score": exp_subscore,
        "readability_score": formatting_subscore,
        "keyword_coverage_percent": keyword_match_subscore,
        "formatting_observations": [w["detail"] for w in formatting_warnings] or ["Clean structural formatting verified."],
        "actionable_suggestions": [p["recommendation"] for p in prioritized_improvements] or ["Resume is well optimized for this role."],
        "role_alignment_notes": role_notes,
        "disclaimer": "Rozgar Radar ATS Compatibility & Job Match Score is an independent algorithmic estimate based on the supplied resume and job description. It does not guarantee interview shortlisting or employment."
    }
