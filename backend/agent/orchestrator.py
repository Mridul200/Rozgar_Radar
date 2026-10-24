"""
Rozgar Radar Agent Orchestrator
"From Intent to Action" Autonomous Multi-Step Engine for ASI:One & Agentverse.
"""

from __future__ import annotations

import os
import sys
import re
import json
from typing import Dict, List, Any, Optional

# Ensure project root & backend on sys.path
_agent_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.abspath(os.path.join(_agent_dir, ".."))
_root_dir = os.path.abspath(os.path.join(_backend_dir, ".."))

for p in [_root_dir, _backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.agent.tools import (
    search_jobs,
    match_and_rank_jobs,
    check_candidate_eligibility,
    tailor_resume,
    prepare_application_draft,
)
from ai.ats_scorer import COMMON_TECH_SKILLS


# Recognized Indian Cities for Entity Extraction
INDIAN_CITIES = [
    "bengaluru", "bangalore", "pune", "hyderabad", "delhi", "noida", "gurgaon",
    "gurugram", "mumbai", "chennai", "kolkata", "ahmedabad", "remote"
]

COMMON_ROLES = [
    "full stack", "fullstack", "frontend", "backend", "software engineer",
    "python developer", "react developer", "data scientist", "data engineer",
    "devops", "cloud engineer", "machine learning", "ai engineer", "intern"
]


class RozgarAgentOrchestrator:
    """
    Autonomous multi-step orchestrator that bridges natural-language intents
    from ASI:One / Agent Chat Protocol into verified backend tool executions.
    """

    def __init__(self):
        self.context_memory: Dict[str, Any] = {}

    def extract_entities(self, text: str) -> Dict[str, Any]:
        """Extracts skills, locations, roles, experience, and job IDs from natural language."""
        text_lower = text.lower()
        entities: Dict[str, Any] = {
            "skills": [],
            "roles": [],
            "locations": [],
            "experience_years": 0.0,
            "job_id": None,
            "min_salary": None,
            "work_mode": None,
        }

        # 1. Extract Skills
        for skill in COMMON_TECH_SKILLS:
            # Match whole words or boundary
            pattern = r"\b" + re.escape(skill) + r"\b"
            if re.search(pattern, text_lower):
                entities["skills"].append(skill.title())

        # 2. Extract Locations
        for city in INDIAN_CITIES:
            if re.search(r"\b" + re.escape(city) + r"\b", text_lower):
                normalized_city = "Bengaluru" if city in ["bengaluru", "bangalore"] else city.title()
                if normalized_city not in entities["locations"]:
                    entities["locations"].append(normalized_city)

        # 3. Extract Roles
        for role in COMMON_ROLES:
            if role in text_lower:
                entities["roles"].append(role.title())

        # 4. Extract Experience
        exp_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:\+|\s*-\s*\d+)?\s*(?:years?|yrs?)", text_lower)
        if exp_match:
            try:
                entities["experience_years"] = float(exp_match.group(1))
            except ValueError:
                entities["experience_years"] = 0.0
        elif "fresher" in text_lower or "entry level" in text_lower:
            entities["experience_years"] = 0.0
        elif "senior" in text_lower:
            entities["experience_years"] = 5.0
        elif "lead" in text_lower or "architect" in text_lower:
            entities["experience_years"] = 7.0

        # 5. Extract Work Mode
        if "remote" in text_lower or "work from home" in text_lower or "wfh" in text_lower:
            entities["work_mode"] = "remote"
        elif "hybrid" in text_lower:
            entities["work_mode"] = "hybrid"
        elif "on-site" in text_lower or "onsite" in text_lower or "office" in text_lower:
            entities["work_mode"] = "on_site"

        # 6. Extract Job ID (UUID or specific ID format)
        id_match = re.search(r"\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b", text_lower)
        if id_match:
            entities["job_id"] = id_match.group(1)
        else:
            # Check for job_id=XYZ or job XYZ
            alt_id = re.search(r"\bjob\s*(?:id|#)?\s*[:=]?\s*([a-zA-Z0-9_\-]+)", text_lower)
            if alt_id and alt_id.group(1) not in ["search", "post", "listing", "listings", "opening", "openings"]:
                entities["job_id"] = alt_id.group(1)

        return entities

    def detect_intent(self, text: str, entities: Dict[str, Any]) -> str:
        """Classifies user intent for tool orchestration."""
        t = text.lower()

        # Check for full end-to-end intent
        if ("and apply" in t or "and tailor" in t or "full" in t or "help me apply" in t) and (
            "match" in t or "find" in t or "search" in t
        ):
            return "FULL_PIPELINE"

        # Resume Tailoring / ATS Check
        if any(w in t for w in ["resume", "cv", "ats", "tailor", "optimize my resume", "score my resume"]):
            return "RESUME_TAILORING"

        # Application Draft / Apply Link
        if any(w in t for w in ["apply", "cover letter", "application draft", "how to apply", "application link"]):
            return "APPLICATION_DRAFT"

        # Eligibility / Qualification Check
        if any(w in t for w in ["eligible", "eligibility", "qualify", "qualified", "missing skills", "can i apply"]):
            return "ELIGIBILITY_CHECK"

        # Matching / Ranking
        if any(w in t for w in ["match", "ranking", "ranked", "recommend", "recommended", "compatibility"]) or (
            len(entities["skills"]) >= 2 and entities["experience_years"] > 0
        ):
            return "JOB_MATCHING"

        # Search / Find Jobs
        if any(w in t for w in ["search", "find", "list", "show", "openings", "jobs", "vacancies", "hiring"]):
            return "JOB_SEARCH"

        # Greetings or Help
        if any(w in t for w in ["hi", "hello", "hey", "help", "who are you", "what can you do"]):
            return "GREETING"

        # Default fallback: Search
        return "JOB_SEARCH"

    async def execute(self, user_text: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Main entry point: processes input, executes backend tools, and synthesizes output.
        """
        entities = self.extract_entities(user_text)
        intent = self.detect_intent(user_text, entities)

        # Context retention (remember last searched/matched job)
        sender = (context or {}).get("sender", "default")
        last_job_id = self.context_memory.get(f"{sender}_last_job_id")
        if not entities["job_id"] and last_job_id:
            entities["job_id"] = last_job_id

        # -----------------------------------------------------------------------
        # Branch 1: FULL PIPELINE (Search -> Match -> Eligibility -> Tailor -> Apply)
        # -----------------------------------------------------------------------
        if intent == "FULL_PIPELINE":
            skills = entities["skills"] or ["Python", "FastAPI", "React", "Docker"]
            locations = entities["locations"] or ["Bengaluru", "Remote"]
            exp = entities["experience_years"] or 2.0

            # Step 1: Match & Rank real jobs
            ranked = match_and_rank_jobs(
                skills=skills,
                preferred_roles=entities["roles"] or ["Full Stack Engineer"],
                preferred_locations=locations,
                years_experience=exp,
                limit=3
            )

            if not ranked:
                # Fallback to direct search
                search_res = search_jobs(keyword=skills[0] if skills else None, limit=3)
                if not search_res:
                    return (
                        "🔍 **No direct matches found.** Please try adjusting your skills or preferred location."
                    )
                top_job = search_res[0]
            else:
                top_job = ranked[0]

            top_id = top_job.get("job_id")
            self.context_memory[f"{sender}_last_job_id"] = top_id

            # Step 2: Check Eligibility
            elig = check_candidate_eligibility(
                job_id=top_id,
                candidate_skills=skills,
                candidate_exp=exp,
                candidate_location=locations[0] if locations else None
            )

            # Step 3: Tailor Resume
            resume_data = tailor_resume(
                job_id=top_id,
                candidate_name="Job Seeker",
                current_skills=skills,
                years_experience=exp
            )

            # Step 4: Prepare Application Draft
            app_draft = prepare_application_draft(
                job_id=top_id,
                candidate_name="Job Seeker",
                candidate_skills=skills,
                candidate_exp=exp
            )

            # Synthesize Response
            lines = [
                f"# 🎯 Rozgar Radar Action Report: From Intent to Application",
                f"",
                f"### 1. 🏆 Top Matched Opportunity",
                f"• **Role:** {top_job['title']}",
                f"• **Company:** {top_job['company']}",
                f"• **Location:** {top_job['location']} ({top_job['work_mode'].title()})",
                f"• **Match Score:** **{top_job.get('match_score_pct', 85)}%**",
                f"• **Matched Skills:** {', '.join(top_job.get('matched_skills', skills[:3]))}",
                f"• **Salary:** {top_job.get('salary', 'Competitive')}",
                f"",
                f"### 2. 📋 Eligibility & Gap Analysis",
                f"• **Status:** {'✅ Fully Eligible' if elig.get('is_eligible') else '⚠️ Partially Qualified'}",
                f"• **Experience Fit:** {elig.get('experience_fit', 'Good Fit')}",
                f"• **Location Fit:** {elig.get('location_fit', 'Eligible')}",
                f"• **Missing Skills to Highlight:** {', '.join(elig.get('missing_required_skills', ['None'])) or 'None'}",
                f"",
                f"### 3. 📄 Tailored Resume & ATS Optimization",
                f"• **Projected ATS Score:** **{resume_data.get('tailored_ats_score', 88)}%** ({resume_data.get('score_increase', '+30 points')})",
                f"• **Tailored Professional Summary:**",
                f"> *\"{resume_data.get('tailored_summary')}\"*",
                f"• **Key Tailored Bullet Points:**",
            ]
            for b in resume_data.get("highlighted_bullets", [])[:2]:
                lines.append(f"  - {b}")

            lines.extend([
                f"",
                f"### 4. ✉️ Personalized Cover Letter Draft",
                f"```text",
                f"{app_draft.get('cover_letter', '')}",
                f"```",
                f"",
                f"### 5. 🚀 Direct Action",
                f"Ready to apply? Click the verified direct link below:",
                f"👉 **[Apply Directly on {top_job['company']} Portal]({top_job.get('application_url')})**",
                f"",
                f"*Source: Verified through {top_job.get('source', 'Company ATS')} via Rozgar Radar.*"
            ])
            return "\n".join(lines)

        # -----------------------------------------------------------------------
        # Branch 2: RESUME TAILORING
        # -----------------------------------------------------------------------
        if intent == "RESUME_TAILORING":
            job_id = entities["job_id"]
            if not job_id:
                # Find a top matching job first
                skills = entities["skills"] or ["Python", "JavaScript"]
                found = search_jobs(keyword=skills[0] if skills else "Software", limit=1)
                if found:
                    job_id = found[0]["job_id"]
                else:
                    return (
                        "📄 **Please specify which job you want to tailor your resume for.**\n"
                        "You can provide a Job ID, job title (e.g., 'tailor resume for Senior Python Engineer'), "
                        "or ask me to find a job first."
                    )

            self.context_memory[f"{sender}_last_job_id"] = job_id
            res = tailor_resume(
                job_id=job_id,
                candidate_name="Candidate",
                current_skills=entities["skills"] or ["Python", "React", "SQL"],
                years_experience=entities["experience_years"] or 2.0
            )

            if "error" in res:
                return f"❌ {res['error']}"

            lines = [
                f"# 📄 ATS-Optimized Resume Tailoring",
                f"Target: **{res.get('target_role')}** at **{res.get('target_company')}**",
                f"",
                f"### 📊 ATS Score Analysis",
                f"• Baseline Score: **{res.get('baseline_ats_score')}%**",
                f"• Tailored Score: **{res.get('tailored_ats_score')}%** ({res.get('score_increase')})",
                f"",
                f"### ✍️ Tailored Professional Summary",
                f"> {res.get('tailored_summary')}",
                f"",
                f"### 🎯 Recommended High-Impact Bullet Points",
            ]
            for b in res.get("highlighted_bullets", []):
                lines.append(f"• {b}")

            lines.extend([
                f"",
                f"### 🏷️ Critical Keywords Incorporated",
                f"{', '.join(res.get('tailored_skills', []))}",
                f"",
                f"👉 **[Apply to this Job]({res.get('application_url')})**"
            ])
            return "\n".join(lines)

        # -----------------------------------------------------------------------
        # Branch 3: APPLICATION DRAFT / COVER LETTER
        # -----------------------------------------------------------------------
        if intent == "APPLICATION_DRAFT":
            job_id = entities["job_id"]
            if not job_id:
                found = search_jobs(keyword=entities["skills"][0] if entities["skills"] else "Software", limit=1)
                if found:
                    job_id = found[0]["job_id"]
                else:
                    return "✉️ **Please mention which job you want to apply for!** (e.g., 'Apply for Backend Engineer at Acme')"

            self.context_memory[f"{sender}_last_job_id"] = job_id
            draft = prepare_application_draft(
                job_id=job_id,
                candidate_name="Job Seeker",
                candidate_skills=entities["skills"] or ["Python", "FastAPI"],
                candidate_exp=entities["experience_years"] or 2.0
            )

            if "error" in draft:
                return f"❌ {draft['error']}"

            lines = [
                f"# ✉️ Verified Application Draft",
                f"Role: **{draft.get('job_title')}** | Company: **{draft.get('company_name')}** ({draft.get('location')})",
                f"",
                f"### 📝 Customized Cover Letter",
                f"```text",
                f"{draft.get('cover_letter')}",
                f"```",
                f"",
                f"### 🔗 Official Verified Application Link",
                f"👉 **[Click Here to Submit Your Application on {draft.get('company_name')} Portal]({draft.get('verified_application_url')})**",
                f"",
                f"*Source: {draft.get('source_platform')} via Rozgar Radar.*"
            ]
            return "\n".join(lines)

        # -----------------------------------------------------------------------
        # Branch 4: ELIGIBILITY CHECK
        # -----------------------------------------------------------------------
        if intent == "ELIGIBILITY_CHECK":
            job_id = entities["job_id"]
            if not job_id:
                found = search_jobs(keyword=entities["skills"][0] if entities["skills"] else "Software", limit=1)
                if found:
                    job_id = found[0]["job_id"]
                else:
                    return "📋 **Please specify a job to check your eligibility against.**"

            self.context_memory[f"{sender}_last_job_id"] = job_id
            elig = check_candidate_eligibility(
                job_id=job_id,
                candidate_skills=entities["skills"] or ["Python", "JavaScript"],
                candidate_exp=entities["experience_years"] or 2.0,
                candidate_location=entities["locations"][0] if entities["locations"] else None
            )

            if "error" in elig:
                return f"❌ {elig['error']}"

            lines = [
                f"# 📋 Eligibility & Qualifications Assessment",
                f"Position: **{elig.get('title')}** at **{elig.get('company')}**",
                f"",
                f"• **Overall Verdict:** {'✅ **QUALIFIED & ELIGIBLE**' if elig.get('is_eligible') else '⚠️ **QUALIFICATION GAP DETECTED**'}",
                f"• **Qualification Score:** **{elig.get('qualification_score')}%**",
                f"• **Experience Fit:** {elig.get('experience_fit')}",
                f"• **Location / Mode:** {elig.get('location_fit')}",
                f"",
                f"### ✅ Your Matching Skills",
                f"{', '.join(elig.get('matched_skills', [])) or 'None matched yet'}",
                f"",
                f"### ⚠️ Missing Required Qualifications",
                f"{', '.join(elig.get('missing_required_skills', [])) or 'None! You meet all listed skill requirements.'}",
                f"",
                f"### 💡 Actionable Strategy to Qualify",
            ]
            for adv in elig.get("actionable_advice", []):
                lines.append(f"• {adv}")

            lines.extend([
                f"",
                f"👉 **[View Job & Apply]({elig.get('application_url')})**"
            ])
            return "\n".join(lines)

        # -----------------------------------------------------------------------
        # Branch 5: MATCHING & RANKING
        # -----------------------------------------------------------------------
        if intent == "JOB_MATCHING" and entities["skills"]:
            ranked = match_and_rank_jobs(
                skills=entities["skills"],
                preferred_roles=entities["roles"],
                preferred_locations=entities["locations"],
                years_experience=entities["experience_years"],
                limit=5
            )

            if not ranked:
                return "🔍 **No ranked opportunities found matching this exact combination.** Try broadening your skills or location."

            self.context_memory[f"{sender}_last_job_id"] = ranked[0]["job_id"]

            lines = [
                f"# 🎯 Top Ranked Job Recommendations",
                f"Matched against: **Skills:** {', '.join(entities['skills'])} | **Exp:** {entities['experience_years']} yrs | **Location:** {', '.join(entities['locations']) or 'All India'}",
                f""
            ]

            for i, r in enumerate(ranked, 1):
                lines.extend([
                    f"### {i}. {r['title']} — {r['company']} (Match: **{r['match_score_pct']}%**)",
                    f"• **Location:** {r['location']} ({r['work_mode'].title()}) | **Salary:** {r['salary']}",
                    f"• **Matched Skills:** {', '.join(r.get('matched_skills', [])[:4]) or 'General profile match'}",
                    f"• **Missing Skills:** {', '.join(r.get('missing_skills', [])[:3]) or 'None'}",
                    f"• 👉 **[Apply on {r['company']} Portal]({r['application_url']})**",
                    f""
                ])

            lines.append("*Want to tailor your resume for any of these? Just say 'Tailor my resume for Job #1'.*")
            return "\n".join(lines)

        # -----------------------------------------------------------------------
        # Branch 6: JOB SEARCH
        # -----------------------------------------------------------------------
        if intent == "JOB_SEARCH":
            kw = None
            if entities["skills"]:
                kw = entities["skills"][0]
            elif entities["roles"]:
                kw = entities["roles"][0]

            loc = entities["locations"][0] if entities["locations"] else None
            jobs = search_jobs(
                keyword=kw,
                location=loc,
                work_mode=entities["work_mode"],
                limit=5
            )

            if not jobs:
                return (
                    f"🔍 **No jobs found matching your criteria.**\n"
                    f"Try searching for broader keywords like 'Python', 'React', 'Frontend', 'Remote', or 'Bengaluru'."
                )

            self.context_memory[f"{sender}_last_job_id"] = jobs[0]["job_id"]

            lines = [
                f"# 🔎 Verified Job Opportunities on Rozgar Radar",
                f"Showing real-time openings from verified ATS sources (Greenhouse, Lever, Ashby, etc.):",
                f""
            ]

            for i, j in enumerate(jobs, 1):
                lines.extend([
                    f"### {i}. {j['title']} @ {j['company']}",
                    f"• **Location:** {j['location']} | **Mode:** {j['work_mode'].title()} | **Salary:** {j['salary']}",
                    f"• **Summary:** {j['snippet']}",
                    f"• 👉 **[Apply Direct on Official Portal]({j['application_url']})**",
                    f""
                ])

            lines.append("💡 *Tip: Tell me your skills and experience to rank these or generate a tailored cover letter!*")
            return "\n".join(lines)

        # -----------------------------------------------------------------------
        # Branch 7: GREETINGS & CAPABILITY OVERVIEW
        # -----------------------------------------------------------------------
        return (
            f"# 🇮🇳 Rozgar Radar Career Copilot (ASI:One Agent)\n\n"
            f"Hello! I am your autonomous AI Career Copilot powered by **Rozgar Radar** and the **Fetch.ai Agent Chat Protocol (ACP)**.\n\n"
            f"### 🛠️ What I can do for you:\n"
            f"1. **🔍 Search Verified Jobs:** Find genuine openings indexed directly from company ATS portals (Greenhouse, Lever, Ashby, etc.).\n"
            f"2. **🎯 Profile Matching & Ranking:** Calculate compatibility scores (0-100%) across 6 dimensions.\n"
            f"3. **📋 Eligibility Check:** Identify missing skills, qualification gaps, and how to become qualified.\n"
            f"4. **📄 ATS Resume Tailoring:** Optimize your resume summary, skills, and bullet points to maximize ATS match.\n"
            f"5. **✉️ Application Drafting:** Generate customized cover letters and provide the direct, verified apply URL.\n\n"
            f"### 💡 Try asking me:\n"
            f"• *\"Find Python developer jobs in Bengaluru\"*\n"
            f"• *\"I have 2 years experience with React, Node, and TypeScript. Rank top jobs for me.\"*\n"
            f"• *\"Check my eligibility for a Senior Full Stack Engineer role with 3 years experience.\"*\n"
            f"• *\"Tailor my resume and draft a cover letter for the top Python job.\"*\n"
        )
