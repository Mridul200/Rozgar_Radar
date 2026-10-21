import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def test_auth_register_and_login():
    email = "candidate_test@example.com"
    pwd = "securepassword123"

    # Register
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": pwd,
        "full_name": "Test Candidate"
    })
    assert reg_resp.status_code in [200, 400]

    # Login
    login_resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": pwd
    })
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == email

    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Me check
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email

def test_profile_lifecycle():
    # Login
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "candidate_test@example.com",
        "password": "securepassword123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update profile
    put_resp = client.put("/api/v1/profile", json={
        "current_city": "Bengaluru",
        "current_state": "Karnataka",
        "preferred_locations": ["Bengaluru", "Remote India"],
        "preferred_roles": ["Full Stack Engineer", "Python Developer"],
        "skills": ["Python", "FastAPI", "React", "Docker"],
        "experience_level": "1-3_years",
        "years_experience": 2.5,
        "min_salary": 1400000,
        "onboarding_completed": True
    }, headers=headers)
    assert put_resp.status_code == 200
    profile = put_resp.json()
    assert profile["current_city"] == "Bengaluru"
    assert "FastAPI" in profile["skills"]
    assert profile["onboarding_completed"] is True

    # Get profile
    get_resp = client.get("/api/v1/profile", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["current_city"] == "Bengaluru"

def test_automation_lifecycle():
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "candidate_test@example.com",
        "password": "securepassword123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Configure automation
    update_resp = client.put("/api/v1/automation", json={
        "is_active": True,
        "preferred_titles": ["Full Stack Engineer", "Backend Developer"],
        "preferred_locations": ["Bengaluru", "Remote India"],
        "preferred_skills": ["Python", "FastAPI", "React"],
        "min_match_score": 50,
        "delivery_time": "08:30"
    }, headers=headers)
    assert update_resp.status_code == 200
    config = update_resp.json()
    assert config["is_active"] is True
    assert config["delivery_time"] == "08:30"

    # Preview matching jobs
    prev_resp = client.get("/api/v1/automation/preview", headers=headers)
    assert prev_resp.status_code == 200
    assert "total_matches" in prev_resp.json()

    # Trigger test digest
    trig_resp = client.post("/api/v1/automation/trigger?is_test=true", headers=headers)
    assert trig_resp.status_code == 200
    assert trig_resp.json()["status"] in ["success", "no_matches"]

def test_ats_analysis():
    ats_resp = client.post("/api/v1/resumes/analyze-ats", json={
        "resume_text": "Experienced Python and FastAPI Developer with 3+ years building cloud-native REST APIs and microservices on AWS and Docker. Reduced server response latency by 35% through query optimization.",
        "target_role": "Backend Python Engineer",
        "job_description": "We are looking for a Backend Python Engineer with expertise in FastAPI, PostgreSQL, AWS, Docker, and RESTful API architecture."
    })
    assert ats_resp.status_code == 200
    result = ats_resp.json()
    assert "overall_score" in result
    assert result["overall_score"] >= 60
    assert "Python" in result["matched_skills"] or "Fastapi" in result["matched_skills"]
    assert len(result["formatting_observations"]) > 0
    assert len(result["actionable_suggestions"]) > 0
