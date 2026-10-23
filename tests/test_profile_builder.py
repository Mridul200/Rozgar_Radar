import pytest
import io
from PIL import Image

def test_mobile_number_validation():
    from app.schemas.user import validate_mobile_format
    assert validate_mobile_format("9876543210") == "9876543210"
    assert validate_mobile_format("+91 98765 43210") == "9876543210"
    assert validate_mobile_format("08765432109") == "8765432109"
    assert validate_mobile_format("7123456789") == "7123456789"
    assert validate_mobile_format("6123456789") == "6123456789"

    with pytest.raises(ValueError):
        validate_mobile_format("1234567890")  # starts with 1
    with pytest.raises(ValueError):
        validate_mobile_format("5876543210")  # starts with 5
    with pytest.raises(ValueError):
        validate_mobile_format("987654321")   # only 9 digits

def test_profile_photo_upload_and_delete(client, db_session):
    # 1. Register test user
    reg = client.post("/api/v1/auth/register", json={
        "email": "photouser@example.com",
        "password": "Password123!",
        "full_name": "Photo User",
        "mobile_number": "9876543210",
        "work_status": "fresher",
        "current_city": "Bengaluru"
    })
    assert reg.status_code == 200
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload valid test photo
    img = Image.new("RGB", (200, 200), color=(13, 139, 112))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res = client.post(
        "/api/v1/profile/upload-photo",
        headers=headers,
        files={"file": ("test.jpg", buf, "image/jpeg")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "data:image/jpeg;base64," in data["photo_url"]

    # 3. Verify get profile returns photo_url and mobile_number
    prof_res = client.get("/api/v1/profile", headers=headers)
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["profile_photo_url"] == data["photo_url"]
    assert prof["mobile_number"] == "9876543210"
    assert prof["current_city"] == "Bengaluru"
    assert prof["work_status"] == "fresher"

    # 4. Delete photo
    del_res = client.delete("/api/v1/profile/photo", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["photo_url"] is None

def test_profile_completion_fresher_vs_experienced(client, db_session):
    # Fresher user
    reg_fresher = client.post("/api/v1/auth/register", json={
        "email": "fresher@example.com",
        "password": "Password123!",
        "full_name": "Fresher Candidate",
        "mobile_number": "9876543211",
        "work_status": "fresher",
        "current_city": "Pune"
    })
    token_f = reg_fresher.json()["access_token"]
    res_f = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token_f}"})
    assert res_f.status_code == 200
    # Fresher should not be penalized for 0 employment history
    score_fresher = res_f.json()["profile_completion_pct"]
    assert score_fresher >= 25
