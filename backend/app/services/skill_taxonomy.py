"""
Canonical skill taxonomy and alias seeder for the Rozgar Radar matching engine.

Call seed_skill_taxonomy(db) once at startup (inside lifespan) to populate
canonical_skills and skill_aliases tables idempotently.

All matching is case-insensitive; the normalise_skill() helper maps any
user-typed or job-description skill token to its canonical slug.
"""

from __future__ import annotations
import re
import uuid
from typing import Optional
from sqlalchemy.orm import Session

from app.models.matching import CanonicalSkill, SkillAlias


# ---------------------------------------------------------------------------
# Taxonomy: (canonical_name, slug, category, [aliases...])
# ---------------------------------------------------------------------------
TAXONOMY: list[tuple[str, str, str, list[str]]] = [
    # ── Languages ──────────────────────────────────────────────────────────
    ("Python",       "python",       "language", ["python3", "py", "python 3"]),
    ("JavaScript",   "javascript",   "language", ["js", "javascript es6", "es6", "ecmascript"]),
    ("TypeScript",   "typescript",   "language", ["ts"]),
    ("Java",         "java",         "language", ["java8", "java 8", "java 11", "java 17", "core java"]),
    ("C",            "c",            "language", ["c language", "c programming", "c lang"]),
    ("C++",          "cplusplus",    "language", ["c plus plus", "cpp"]),
    ("C#",           "csharp",       "language", ["c sharp", "dotnet c#", "c# .net"]),
    ("Go",           "go",           "language", ["golang", "go lang"]),
    ("Rust",         "rust",         "language", ["rust lang", "rust programming"]),
    ("Ruby",         "ruby",         "language", ["ruby on rails lang"]),
    ("PHP",          "php",          "language", ["php7", "php8", "php 7", "php 8"]),
    ("Swift",        "swift",        "language", ["swift ios"]),
    ("Kotlin",       "kotlin",       "language", ["kotlin android"]),
    ("Scala",        "scala",        "language", ["scala lang"]),
    ("R",            "r_lang",       "language", ["r programming", "r language", "r statistical"]),
    ("MATLAB",       "matlab",       "language", ["mat lab"]),
    ("Shell",        "shell",        "language", ["bash", "shell script", "bash scripting", "shell scripting", "zsh"]),
    ("SQL",          "sql",          "language", ["structured query language", "sql queries", "sql query"]),

    # ── Web Frameworks & Libraries ──────────────────────────────────────────
    ("React",        "react",        "framework", ["reactjs", "react.js", "react js"]),
    ("Next.js",      "nextjs",       "framework", ["nextjs", "next js"]),
    ("Vue.js",       "vuejs",        "framework", ["vue", "vuejs", "vue js"]),
    ("Angular",      "angular",      "framework", ["angularjs", "angular.js", "angular 2+"]),
    ("Svelte",       "svelte",       "framework", ["sveltejs", "svelte.js"]),
    ("Node.js",      "nodejs",       "framework", ["node", "nodejs", "node js", "express.js", "expressjs"]),
    ("Django",       "django",       "framework", ["django rest framework", "drf"]),
    ("FastAPI",      "fastapi",      "framework", ["fast api"]),
    ("Flask",        "flask",        "framework", ["flask python"]),
    ("Spring Boot",  "spring_boot",  "framework", ["spring", "spring framework", "springboot"]),
    ("Laravel",      "laravel",      "framework", ["laravel php"]),
    ("Ruby on Rails","rails",        "framework", ["ror", "rails"]),
    ("ASP.NET",      "aspnet",       "framework", [".net", "asp.net", "aspnet core", ".net core", "dotnet"]),

    # ── Mobile ─────────────────────────────────────────────────────────────
    ("React Native", "react_native", "mobile", ["react-native"]),
    ("Flutter",      "flutter",      "mobile", ["flutter dart"]),
    ("Android",      "android",      "mobile", ["android sdk", "android development"]),
    ("iOS",          "ios",          "mobile", ["ios development", "xcode"]),

    # ── Databases ───────────────────────────────────────────────────────────
    ("PostgreSQL",   "postgresql",   "database", ["postgres", "postgresql db", "psql"]),
    ("MySQL",        "mysql",        "database", ["mysql db"]),
    ("MongoDB",      "mongodb",      "database", ["mongo", "mongodb atlas"]),
    ("Redis",        "redis",        "database", ["redis cache"]),
    ("SQLite",       "sqlite",       "database", ["sqlite3"]),
    ("Elasticsearch","elasticsearch","database", ["elastic search", "elk stack", "opensearch"]),
    ("Cassandra",    "cassandra",    "database", ["apache cassandra"]),
    ("DynamoDB",     "dynamodb",     "database", ["aws dynamodb"]),
    ("Oracle DB",    "oracle",       "database", ["oracle database", "oracle sql", "plsql", "pl/sql"]),
    ("SQL Server",   "sql_server",   "database", ["mssql", "microsoft sql server", "ms sql"]),
    ("Firebase",     "firebase",     "database", ["firebase realtime", "firestore"]),

    # ── Cloud ──────────────────────────────────────────────────────────────
    ("AWS",          "aws",          "cloud", ["amazon web services", "aws cloud"]),
    ("GCP",          "gcp",          "cloud", ["google cloud", "google cloud platform"]),
    ("Azure",        "azure",        "cloud", ["microsoft azure", "azure cloud"]),

    # ── DevOps & Infrastructure ────────────────────────────────────────────
    ("Docker",       "docker",       "devops", ["docker container", "dockerfile"]),
    ("Kubernetes",   "kubernetes",   "devops", ["k8s", "kube", "kubernetes cluster"]),
    ("Terraform",    "terraform",    "devops", ["terraform iac", "hashicorp terraform"]),
    ("Ansible",      "ansible",      "devops", ["ansible automation"]),
    ("Jenkins",      "jenkins",      "devops", ["jenkins ci", "jenkins pipeline"]),
    ("GitHub Actions","github_actions","devops", ["github actions ci", "gh actions"]),
    ("CI/CD",        "cicd",         "devops", ["ci cd", "continuous integration", "continuous deployment", "continuous delivery"]),
    ("Linux",        "linux",        "devops", ["ubuntu", "centos", "rhel", "linux server"]),
    ("Nginx",        "nginx",        "devops", ["nginx server"]),

    # ── Data & ML ──────────────────────────────────────────────────────────
    ("Machine Learning","machine_learning","data", ["ml", "machine learning algorithms"]),
    ("Deep Learning","deep_learning", "data", ["dl", "neural networks", "deep neural network"]),
    ("TensorFlow",   "tensorflow",   "data", ["tf", "tensorflow 2"]),
    ("PyTorch",      "pytorch",      "data", ["torch"]),
    ("Scikit-learn", "sklearn",      "data", ["sklearn", "scikit learn"]),
    ("Pandas",       "pandas",       "data", ["pandas python"]),
    ("NumPy",        "numpy",        "data", ["numpy python"]),
    ("Data Analysis","data_analysis","data", ["data analytics", "data analyst", "analytical skills"]),
    ("Power BI",     "power_bi",     "data", ["powerbi", "microsoft power bi"]),
    ("Tableau",      "tableau",      "data", ["tableau desktop"]),
    ("Apache Spark", "spark",        "data", ["spark", "pyspark"]),
    ("Hadoop",       "hadoop",       "data", ["apache hadoop", "hdfs"]),

    # ── Frontend Tooling ────────────────────────────────────────────────────
    ("HTML",         "html",         "frontend", ["html5", "html 5"]),
    ("CSS",          "css",          "frontend", ["css3", "css 3", "sass", "scss", "less"]),
    ("Tailwind CSS", "tailwind",     "frontend", ["tailwindcss", "tailwind"]),
    ("GraphQL",      "graphql",      "frontend", ["graph ql"]),
    ("REST API",     "rest_api",     "frontend", ["restful api", "rest apis", "restful", "rest"]),

    # ── Testing ─────────────────────────────────────────────────────────────
    ("Jest",         "jest",         "testing", ["jest testing"]),
    ("pytest",       "pytest",       "testing", ["py test", "pytest python"]),
    ("Selenium",     "selenium",     "testing", ["selenium webdriver"]),
    ("Cypress",      "cypress",      "testing", ["cypress testing"]),

    # ── Security ────────────────────────────────────────────────────────────
    ("Cybersecurity","cybersecurity","security", ["cyber security", "information security", "infosec"]),
    ("Penetration Testing","pentesting","security", ["pen testing", "ethical hacking"]),

    # ── Soft Skills ─────────────────────────────────────────────────────────
    ("Communication","communication","soft", ["verbal communication", "written communication"]),
    ("Teamwork",     "teamwork",     "soft", ["team player", "collaborative"]),
    ("Leadership",   "leadership",   "soft", ["team lead", "people management"]),
    ("Problem Solving","problem_solving","soft", ["analytical thinking", "critical thinking"]),
    ("Agile",        "agile",        "soft", ["scrum", "kanban", "agile methodology", "scrum master"]),
    ("Git",          "git",          "tool", ["github", "gitlab", "bitbucket", "version control", "git version control"]),
    ("Jira",         "jira",         "tool", ["jira software", "atlassian jira"]),
]


def _slugify(text: str) -> str:
    """Convert text to a lowercase alphanumeric slug for comparison."""
    return re.sub(r"[^a-z0-9_]", "", text.lower().replace(" ", "_").replace("-", "_").replace(".", ""))


def _norm(text: str) -> str:
    """Normalise alias for exact-match lookup."""
    return text.strip().lower()


def seed_skill_taxonomy(db: Session) -> None:
    """
    Idempotently insert canonical skills and their aliases.
    Safe to call on every startup — existing rows are skipped.
    """
    existing_aliases = {r[0] for r in db.query(SkillAlias.normalized_alias).all()}
    existing_slugs = {r[0] for r in db.query(CanonicalSkill.slug).all()}

    for (name, slug, category, aliases) in TAXONOMY:
        if slug not in existing_slugs:
            skill = CanonicalSkill(
                id=str(uuid.uuid4()),
                name=name,
                slug=slug,
                category=category,
            )
            db.add(skill)
            db.flush()
            existing_slugs.add(slug)
        else:
            skill = db.query(CanonicalSkill).filter_by(slug=slug).first()

        all_aliases = [name] + aliases
        for alias_text in all_aliases:
            norm = _norm(alias_text)
            if norm not in existing_aliases:
                db.add(SkillAlias(
                    id=str(uuid.uuid4()),
                    canonical_skill_id=skill.id,
                    alias=alias_text,
                    normalized_alias=norm,
                ))
                existing_aliases.add(norm)

    db.commit()


# ---------------------------------------------------------------------------
# Runtime lookup helpers
# ---------------------------------------------------------------------------

def _build_lookup_map(db: Session) -> dict[str, str]:
    """
    Returns {normalized_alias: canonical_skill_slug} for all aliases.
    Cached on module level after first call per process.
    """
    rows = db.query(SkillAlias, CanonicalSkill).join(
        CanonicalSkill, SkillAlias.canonical_skill_id == CanonicalSkill.id
    ).all()
    return {row.SkillAlias.normalized_alias: row.CanonicalSkill.slug for row in rows}


_ALIAS_CACHE: dict[str, str] | None = None


def normalise_skill(skill_text: str, db: Session) -> Optional[str]:
    """
    Maps a free-text skill token to its canonical slug.
    Returns None if unrecognised.
    """
    global _ALIAS_CACHE
    if _ALIAS_CACHE is None:
        _ALIAS_CACHE = _build_lookup_map(db)
    return _ALIAS_CACHE.get(_norm(skill_text))


def bust_skill_cache() -> None:
    """Call after adding new aliases so the in-process cache is rebuilt."""
    global _ALIAS_CACHE
    _ALIAS_CACHE = None


def normalise_skill_list(skills: list[str], db: Session) -> list[str]:
    """
    Normalise a list of skill strings, returning unique canonical slugs.
    Unrecognised skills are dropped.
    """
    slugs = set()
    for s in skills:
        slug = normalise_skill(s, db)
        if slug:
            slugs.add(slug)
    return sorted(slugs)

