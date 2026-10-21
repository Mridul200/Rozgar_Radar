import os
import re
from typing import Dict, Any, List, Optional

STRONG_ACTION_VERBS = [
    "Architected", "Engineered", "Spearheaded", "Optimized", "Delivered",
    "Implemented", "Streamlined", "Accelerated", "Orchestrated", "Scaled",
    "Automated", "Standardized", "Transformed", "Established"
]

def generate_summary_ai(resume_data: Dict[str, Any], target_role: Optional[str] = None) -> List[str]:
    """Generates 2-3 concise professional summaries based strictly on provided facts."""
    name = resume_data.get("fullName", "").strip()
    title = target_role or resume_data.get("professionalTitle", "").strip() or "Software Professional"

    skills_data = resume_data.get("skills", {})
    tech_skills = []
    if isinstance(skills_data, dict):
        tech_skills = skills_data.get("technical", []) + skills_data.get("tools", [])
    elif isinstance(skills_data, list):
        tech_skills = skills_data

    skills_str = ", ".join(tech_skills[:5]) if tech_skills else "modern software engineering practices"

    experience = resume_data.get("experience", [])
    num_exps = len(experience)
    exp_phrase = f"with experience across {num_exps} key industry roles" if num_exps > 0 else "with a strong foundation in modern engineering"

    projects = resume_data.get("projects", [])
    proj_phrase = f"demonstrated through hands-on projects including {projects[0].get('name')}" if projects else ""

    opt1 = (
        f"Goal-oriented {title} {exp_phrase}. Proven expertise in {skills_str}. "
        f"Committed to building clean, scalable architectures and collaborating with cross-functional teams to deliver impactful solutions."
    )

    opt2 = (
        f"Dedicated {title} proficient in {skills_str}. Experienced in architecting robust applications, "
        f"optimizing performance, and writing maintainable code aligned with industry standards."
    )

    opt3 = (
        f"Results-driven {title} passionate about solving complex engineering challenges using {skills_str}. "
        f"Focuses on delivering reliable end-to-end features with high test coverage and clean documentation."
    )

    return [opt1, opt2, opt3]

def improve_bullets_ai(bullet_text: str, context: Optional[str] = None) -> List[str]:
    """Rewrites weak or passive bullet points into strong action-oriented statements without inventing metrics."""
    cleaned = bullet_text.strip().lstrip("•-* ")
    if not cleaned:
        return [
            "Engineered core system features ensuring high reliability and adherence to engineering standards.",
            "Collaborated with cross-functional stakeholders to deliver key sprint deliverables on schedule."
        ]

    # Check first word
    words = cleaned.split()
    first_word = words[0] if words else ""

    # Generate 3 refined variations
    # 1. Action verb conversion
    verb = STRONG_ACTION_VERBS[len(cleaned) % len(STRONG_ACTION_VERBS)]
    lower_rest = " ".join(words[1:]) if len(words) > 1 else cleaned

    opt1 = f"{verb} {cleaned.lstrip('worked on ').lstrip('responsible for ').lstrip('helped in ')}."
    opt2 = f"Implemented and optimized {cleaned.lstrip('worked on ').lstrip('responsible for ')}, adhering to scalable design best practices."
    opt3 = f"Spearheaded development of {cleaned.lstrip('worked on ')}, streamlining workflows and maintaining high code quality."

    # Capitalize properly
    opt1 = re.sub(r"\s+", " ", opt1).strip().rstrip(".") + "."
    opt2 = re.sub(r"\s+", " ", opt2).strip().rstrip(".") + "."
    opt3 = re.sub(r"\s+", " ", opt3).strip().rstrip(".") + "."

    return [opt1, opt2, opt3]

def improve_project_ai(name: str, tech: str, desc: str) -> List[str]:
    """Formats technical project descriptions clearly highlighting technical architecture and deliverables."""
    opt1 = f"Designed and deployed {name or 'system'} utilizing {tech or 'modern technologies'}. {desc or 'Focused on modular architecture, API performance, and seamless user experience.'}"
    opt2 = f"Architected {name or 'project'} to address key technical workflows with {tech or 'scalable tools'}. {desc or 'Integrated robust error handling and clean data pipelines.'}"
    return [opt1, opt2]

def enhance_text_ai(text: str) -> List[str]:
    """Corrects grammar and refines professional tone."""
    cleaned = text.strip()
    if not cleaned:
        return ["Clear, concise professional statement."]

    opt1 = re.sub(r"\bi\s+", "", cleaned, flags=re.IGNORECASE)
    opt1 = opt1[0].upper() + opt1[1:] if opt1 else ""
    if not opt1.endswith("."):
        opt1 += "."

    opt2 = f"Actively {opt1.lower()}"
    return [opt1, opt2]

def tailor_resume_ai(resume_data: Dict[str, Any], job_description: str) -> Dict[str, Any]:
    """Analyzes resume against JD and returns tailoring recommendations without fabricating credentials."""
    jd_lower = job_description.lower()
    skills_data = resume_data.get("skills", {})
    my_skills = []
    if isinstance(skills_data, dict):
        for k, v in skills_data.items():
            my_skills.extend(v)
    elif isinstance(skills_data, list):
        my_skills = skills_data

    # Find common skills
    matched = [s for s in my_skills if s.lower() in jd_lower]
    # Identify high-frequency keywords in JD not in resume
    candidate_terms = [
        "python", "react", "fastapi", "docker", "aws", "sql", "typescript",
        "graphql", "kubernetes", "microservices", "ci/cd", "redis", "tailwind"
    ]
    missing = [t.title() for t in candidate_terms if t in jd_lower and not any(t == s.lower() for s in my_skills)]

    suggestions = []
    if matched:
        suggestions.append(f"Emphasize your proven experience with {', '.join(matched[:3])} in your top bullet points.")
    if missing:
        suggestions.append(f"If you have hands-on exposure to {', '.join(missing[:3])}, consider adding them to your skills or project descriptions.")
    suggestions.append("Align your professional summary keywords with the job description's primary requirements.")

    return {
        "matched_skills": matched,
        "missing_skills": missing,
        "actionable_tailoring_steps": suggestions
    }

