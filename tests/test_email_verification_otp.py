import pytest
import re
from datetime import timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal, utc_now
from app.models.user import User, EmailVerificationOTP
from services.email_service import get_test_sent_emails, clear_test_sent_emails
from app.schemas.user import validate_email_format

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test():
    Base.metadata.create_all(bind=engine)
    clear_test_sent_emails()
    yield
    clear_test_sent_emails()


def test_email_format_validation_logic():
    """Validates that valid emails pass and invalid emails raise ValueError with exact error message."""
    valid_emails = [
        "user@gmail.com",
        "student@example.com",
        "john.doe+tag@company.co.in",
        "candidate@rozgar-radar.org",
        "dev@tech.io"
    ]
    for email in valid_emails:
        assert validate_email_format(email) == email.strip().lower()

    invalid_emails = [
        "abc",
        "abc@",
        "abc.com",
        "user@domain",
        "user@domain.",
        "user@.com",
        "plainaddress",
        "@missingusername.com",
        "   "
    ]
    for invalid in invalid_emails:
        with pytest.raises(ValueError) as exc:
            validate_email_format(invalid)
        assert "Please enter a valid email address." in str(exc.value)


def test_invalid_email_rejected_and_no_otp_sent():
    """Ensures invalid email never triggers an OTP email and returns 422/400."""
    invalid_cases = ["abc", "abc@", "abc.com", "user@domain"]
    for inv in invalid_cases:
        resp = client.post("/api/v1/auth/send-otp", json={
            "email": inv,
            "full_name": "Test User",
            "password": "Password123"
        })
        assert resp.status_code in [400, 422]
        # Verify NO email was dispatched
        assert len(get_test_sent_emails()) == 0


def test_complete_otp_registration_flow():
    """Tests the full registration lifecycle: send OTP -> verify OTP -> login."""
    test_email = "otp_verify_user@example.com"
    full_name = "Aarav Sharma"
    pwd = "StrongPassword@123"

    # Clean any prior record
    db = SessionLocal()
    try:
        db.query(User).filter(User.email == test_email).delete()
        db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == test_email).delete()
        db.commit()
    finally:
        db.close()

    # Step 1: Send OTP
    send_resp = client.post("/api/v1/auth/send-otp", json={
        "email": test_email,
        "full_name": full_name,
        "password": pwd
    })
    assert send_resp.status_code == 200
    data = send_resp.json()
    assert data["status"] == "otp_sent"
    assert data["email"] == test_email
    assert data["cooldown_seconds"] == 60

    # Verify email was dispatched with 6-digit code
    sent = get_test_sent_emails()
    assert len(sent) == 1
    assert sent[0]["to"] == test_email
    assert "Verification Code" in sent[0]["subject"]

    # Extract OTP from plain body for testing
    import re
    match = re.search(r"\b(\d{6})\b", sent[0]["plain"])
    assert match is not None
    otp_code = match.group(1)

    # Step 2: Attempt verification with incorrect OTP
    bad_resp = client.post("/api/v1/auth/verify-otp", json={
        "email": test_email,
        "otp": "000000"
    })
    assert bad_resp.status_code == 400
    assert "Invalid verification code" in bad_resp.json()["detail"]

    # Step 3: Verify with correct OTP
    verify_resp = client.post("/api/v1/auth/verify-otp", json={
        "email": test_email,
        "otp": otp_code
    })
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()
    assert "access_token" in verify_data
    assert verify_data["user"]["email"] == test_email
    assert verify_data["user"]["is_verified"] is True

    # Step 4: Login with newly verified user
    login_resp = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": pwd
    })
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()


def test_otp_resend_cooldown_and_invalidation():
    """Tests 60-second cooldown and ensures resending invalidates old OTP."""
    test_email = "cooldown_test@example.com"
    db = SessionLocal()
    try:
        db.query(User).filter(User.email == test_email).delete()
        db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == test_email).delete()
        db.commit()
    finally:
        db.close()

    # Send 1st OTP
    r1 = client.post("/api/v1/auth/send-otp", json={
        "email": test_email,
        "full_name": "Cooldown Test",
        "password": "Password123"
    })
    assert r1.status_code == 200
    first_otp = re.search(r"\b(\d{6})\b", get_test_sent_emails()[-1]["plain"]).group(1)

    # Immediate resend should trigger 429 cooldown
    r2 = client.post("/api/v1/auth/send-otp", json={
        "email": test_email,
        "full_name": "Cooldown Test",
        "password": "Password123"
    })
    assert r2.status_code == 429
    assert "Please wait" in r2.json()["detail"]

    # Fast-forward created_at by 65 seconds in DB to simulate cooldown passing
    db = SessionLocal()
    try:
        otp_rec = db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == test_email).first()
        otp_rec.created_at = utc_now() - timedelta(seconds=65)
        db.commit()
    finally:
        db.close()

    # Now resend should succeed
    r3 = client.post("/api/v1/auth/resend-otp", json={"email": test_email})
    assert r3.status_code == 200
    second_otp = re.search(r"\b(\d{6})\b", get_test_sent_emails()[-1]["plain"]).group(1)
    assert first_otp != second_otp

    # The 1st OTP should now be rejected as invalidated
    r_old = client.post("/api/v1/auth/verify-otp", json={"email": test_email, "otp": first_otp})
    assert r_old.status_code == 400

    # The 2nd OTP should succeed
    r_new = client.post("/api/v1/auth/verify-otp", json={"email": test_email, "otp": second_otp})
    assert r_new.status_code == 200


def test_expired_otp_is_rejected():
    """Tests that OTP past 5-minute expiration is rejected."""
    test_email = "expired_test@example.com"
    db = SessionLocal()
    try:
        db.query(User).filter(User.email == test_email).delete()
        db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == test_email).delete()
        db.commit()
    finally:
        db.close()

    r = client.post("/api/v1/auth/send-otp", json={
        "email": test_email,
        "full_name": "Expired Test",
        "password": "Password123"
    })
    assert r.status_code == 200
    otp = re.search(r"\b(\d{6})\b", get_test_sent_emails()[-1]["plain"]).group(1)

    # Set expires_at in the past
    db = SessionLocal()
    try:
        otp_rec = db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == test_email).first()
        otp_rec.expires_at = utc_now() - timedelta(minutes=1)
        db.commit()
    finally:
        db.close()

    # Verify should fail with expiration message
    resp = client.post("/api/v1/auth/verify-otp", json={"email": test_email, "otp": otp})
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()


def test_unverified_user_cannot_login():
    """Ensures an unverified user cannot log in and receives 403."""
    test_email = "unverified_login@example.com"
    pwd = "Password123"

    db = SessionLocal()
    try:
        db.query(User).filter(User.email == test_email).delete()
        from app.api.auth_deps import hash_password
        unverified_user = User(
            email=test_email,
            hashed_password=hash_password(pwd),
            full_name="Unverified User",
            is_verified=False
        )
        db.add(unverified_user)
        db.commit()
    finally:
        db.close()

    # Login attempt
    resp = client.post("/api/v1/auth/login", json={"email": test_email, "password": pwd})
    assert resp.status_code == 403
    assert "verify your email" in resp.json()["detail"].lower()


def test_duplicate_registration_rejected():
    """Tests that registering an already verified email returns 400."""
    test_email = "duplicate_test@example.com"
    pwd = "Password123"

    db = SessionLocal()
    try:
        db.query(User).filter(User.email == test_email).delete()
        from app.api.auth_deps import hash_password
        verified_user = User(
            email=test_email,
            hashed_password=hash_password(pwd),
            full_name="Verified User",
            is_verified=True
        )
        db.add(verified_user)
        db.commit()
    finally:
        db.close()

    resp = client.post("/api/v1/auth/send-otp", json={
        "email": test_email,
        "full_name": "Another User",
        "password": pwd
    })
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"].lower()
