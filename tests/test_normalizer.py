from services.job_ingestion.normalizer import Normalizer

def test_clean_text():
    assert Normalizer.clean_text("  Senior   Software   Engineer  \n ") == "Senior Software Engineer"
    assert Normalizer.clean_text(None) == ""

def test_normalize_title():
    raw_title = "Senior Fullstack Engineer [Remote] (f/m/d) - React/Node!"
    normalized = Normalizer.normalize_title(raw_title)
    assert normalized == "senior fullstack engineer react node"

def test_strip_html():
    html = "<p>We are hiring! <br/>Requirements: <ul><li>Python 3</li><li>FastAPI</li></ul></p>"
    stripped = Normalizer.strip_html(html)
    assert "We are hiring!" in stripped
    assert "Python 3" in stripped
    assert "<" not in stripped and ">" not in stripped

def test_canonicalize_url():
    dirty_url = "https://boards.greenhouse.io/figma/jobs/5426468004?gh_jid=5426468004&utm_source=linkedin&utm_medium=job_post&ref=referral#apply"
    canonical = Normalizer.canonicalize_url(dirty_url)
    assert canonical == "https://boards.greenhouse.io/figma/jobs/5426468004"
    assert "utm_source" not in canonical
    assert "gh_jid" not in canonical

def test_detect_work_mode():
    assert Normalizer.detect_work_mode("Backend Engineer (Remote)", "India") == "remote"
    assert Normalizer.detect_work_mode("Frontend Engineer", "Hybrid - Bengaluru") == "hybrid"
    assert Normalizer.detect_work_mode("DevOps Engineer", "Bengaluru, India") == "on_site"
    assert Normalizer.detect_work_mode("Product Manager", None) == "not_disclosed"

def test_detect_employment_type():
    assert Normalizer.detect_employment_type("Full Time") == "full_time"
    assert Normalizer.detect_employment_type("Contractor / 6 months") == "contract"
    assert Normalizer.detect_employment_type("Summer Intern") == "internship"
    assert Normalizer.detect_employment_type(None) == "not_disclosed"

def test_parse_salary():
    min_sal, max_sal, curr, period = Normalizer.parse_salary("Salary: $120,000 - $160,000 per year")
    assert min_sal == 120000.0
    assert max_sal == 160000.0
    assert curr == "USD"
    assert period == "yearly"

    min_inr, max_inr, curr_inr, period_inr = Normalizer.parse_salary("₹25,00,000 - ₹35,00,000 per annum")
    assert min_inr is not None
    assert curr_inr == "INR"
    assert period_inr == "yearly"
