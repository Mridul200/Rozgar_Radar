# AI & ATS Optimization Subsystem

This module houses intelligent resume evaluation, ATS readiness scoring, and profile-to-job matching algorithms for HirePulse.

## Modules

### 1. `ats_scorer.py`
The automated ATS (Applicant Tracking System) inspection engine:
- **Keyword & Technical Skill Extraction**: Matches over 60+ technical and soft skills against target job descriptions and roles.
- **Quantifiable Metrics Analysis**: Detects numerical indicators, percentages, revenue, latency reductions, and scale metrics to reward high-impact bullet points.
- **Action Verb Verification**: Scans for proactive verbs (*architected, spearheaded, optimized, launched*) to discourage passive voice.
- **Section & Layout Hygiene**: Validates standard resume structure (Experience, Education, Skills, Projects).
- **Evidence Extraction**: Highlights specific sentences from the candidate's resume that demonstrate competence.
- **Actionable Improvement Suggestions**: Generates tailored advice for missing keywords and bullet improvements.

### 2. `job_matcher.py`
Candidate-to-Job Matching Engine:
- Multi-factor scoring taking into account candidate skills, target role titles, preferred locations, and remote work preferences.
- Returns match percentages, skill overlap, and recommendation signals.

## Usage Example

```python
from ai import analyze_resume_ats, calculate_job_match

# 1. Evaluate Resume
result = analyze_resume_ats(
    resume_text="Senior Python Backend Developer with 4 years building FastAPI services...",
    job_description="Looking for Python engineers skilled in FastAPI, PostgreSQL, Docker...",
    target_role="Backend Developer"
)
print("Score:", result["overall_score"])
print("Matched Skills:", result["matched_skills"])

# 2. Match Candidate Profile with a Job
match = calculate_job_match(
    candidate_skills=["Python", "FastAPI", "Docker", "PostgreSQL"],
    candidate_preferred_roles=["Backend Engineer"],
    candidate_preferred_locations=["Bengaluru", "Remote"],
    job_title="Senior Python Backend Engineer",
    job_location="Bengaluru, India"
)
print("Compatibility:", match["match_percentage"], "%")
```

## Future Extensions
- Support for LLM-based embeddings (OpenAI `text-embedding-3-small`, Google Gemini embeddings) for semantic vector search.
- Integration with generative AI APIs for automatic cover letter and resume summary generation.
