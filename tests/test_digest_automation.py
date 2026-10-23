"""
Tests for the email automation pipeline:
- delivery schedule helpers (delivery_time / timezone / frequency honored)
- daily digest scheduler (send, dedupe, due-logic, SMTP gating)
- instant job alerts (send once, strict dedup)
- admin protection of /automation/trigger-all
- scoring with min_salary and experience_level
"""
import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.models.source import JobSource
from app.models.job import JobListing
from app.models.user import User, UserProfile, AutomationConfig, AutomationLog, EmailNotificationLog
from services.delivery_schedule import (
    is_digest_due,
    last_delivery_moment,
    next_delivery_moment,
    normalize_frequency,
)
import services.digest_scheduler as digest_scheduler
import services.job_ingestion.alerts as alerts_module
from app.api.automation import calculate_match_score

IST = "Asia/Kolkata"


def _make_source(db, suffix="src"):
    source = JobSource(
        id=f"test_{suffix}_{uuid.uuid4().hex[:8]}",
        name=f"Test Source {suffix}",
        source_type="ats",
        access_method="public_api",
    )
    db.add(source)
    db.commit()
    return source


def _make_job(db, source, title="Backend Engineer", **overrides):
    jid = f"job_{uuid.uuid4().hex[:12]}"
    defaults = dict(
        id=jid,
        source_id=source.id,
        title=title,
        normalized_title=title,
        company_name="Acme Corp",
        is_india_eligible=True,
        location_category="india_office",
        location_raw="Bengaluru, India",
        city="Bengaluru",
        country="India",
        work_mode="remote",
        employment_type="full_time",
        application_url=f"https://example.com/{jid}",
        canonical_url=f"https://example.com/{jid}",
        publication_date=datetime(2026, 10, 20, 8, 0),
        freshness_status="active",
        is_duplicate=False,
    )
    defaults.update(overrides)
    job = JobListing(**defaults)
    db.add(job)
    db.commit()
    return job


def _make_user_with_config(db, email="digest_user@example.com", **config_overrides):
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        hashed_password="x",
        full_name="Digest User",
    )
    db.add(user)
    db.flush()
    config_defaults = dict(
        is_active=True,
        preferred_titles='["Backend Engineer"]',
        delivery_frequency="daily",
        delivery_time="09:00",
        timezone=IST,
        min_match_score=60,
    )
    config_defaults.update(config_overrides)
    config = AutomationConfig(user_id=user.id, **config_defaults)
    db.add(config)
    db.commit()
    return user, config


def _install_fake_email(monkeypatch, module):
    sent = []

    def _fake_send(to_address, subject, html_body, plain_body=None):
        sent.append({"to": to_address, "subject": subject})
        return True

    monkeypatch.setattr(module, "is_smtp_configured", lambda: True)
    monkeypatch.setattr(module, "send_email", _fake_send)
    return sent


# ---------------------------------------------------------------------------
# Delivery schedule helpers
# ---------------------------------------------------------------------------

def test_normalize_frequency_defaults_to_daily():
    assert normalize_frequency(None) == "daily"
    assert normalize_frequency("WEEKLY") == "weekly"
    assert normalize_frequency("hourly") == "daily"  # unsupported -> daily


def test_delivery_moment_honors_timezone_and_time():
    now = datetime(2026, 10, 21, 6, 47, tzinfo=timezone.utc)  # 12:17 IST
    last = last_delivery_moment(now, "09:00", IST)
    assert last == datetime(2026, 10, 21, 3, 30, tzinfo=timezone.utc)  # 09:00 IST
    nxt = next_delivery_moment(now, "09:00", IST)
    assert nxt == datetime(2026, 10, 22, 3, 30, tzinfo=timezone.utc)


def test_delivery_moment_before_delivery_time_uses_previous_day():
    now = datetime(2026, 10, 20, 22, 0, tzinfo=timezone.utc)  # Oct 21, 03:30 IST (before 09:00)
    last = last_delivery_moment(now, "09:00", IST)
    assert last == datetime(2026, 10, 20, 3, 30, tzinfo=timezone.utc)


def test_weekly_frequency_snaps_to_fixed_weekday():
    now = datetime(2026, 10, 21, 6, 47, tzinfo=timezone.utc)  # Wednesday
    last = last_delivery_moment(now, "09:00", IST, "weekly")
    # Oct 19, 2026 is a Monday (epoch anchor weekday)
    assert last == datetime(2026, 10, 19, 3, 30, tzinfo=timezone.utc)


def test_is_digest_due_logic():
    now = datetime(2026, 10, 21, 6, 47, tzinfo=timezone.utc)
    # Never run -> due
    assert is_digest_due(None, now, "09:00", IST) is True
    # Ran at 03:29 IST (before today's 09:00 boundary) -> due
    assert is_digest_due(datetime(2026, 10, 20, 21, 29, tzinfo=timezone.utc), now, "09:00", IST) is True
    # Ran at 12:06 IST today (after 08:30 boundary) -> not due
    assert is_digest_due(datetime(2026, 10, 21, 6, 36, tzinfo=timezone.utc), now, "08:30", IST) is False
    # Weekly: ran 2 days ago -> not due; ran 8 days ago -> due
    assert is_digest_due(now - timedelta(days=2), now, "09:00", IST, "weekly") is False
    assert is_digest_due(now - timedelta(days=8), now, "09:00", IST, "weekly") is True


# ---------------------------------------------------------------------------
# Digest scheduler
# ---------------------------------------------------------------------------

def test_run_all_digests_sends_and_logs(db_session, monkeypatch):
    sent = _install_fake_email(monkeypatch, digest_scheduler)
    source = _make_source(db_session)
    job = _make_job(db_session, source)
    user, config = _make_user_with_config(db_session)

    result = digest_scheduler.run_all_due_daily_digests(force=True, db=db_session)

    assert result["processed"] == 1
    assert result["emails_sent"] == 1
    assert len(sent) == 1
    assert sent[0]["to"] == user.email
    assert "Backend Engineer" in sent[0]["subject"] or "Recommended" in sent[0]["subject"]

    log = db_session.query(AutomationLog).filter(AutomationLog.user_id == user.id).one()
    assert log.status == "success"
    assert log.jobs_sent == 1
    assert json.loads(log.sent_job_ids) == [job.id]

    db_session.refresh(config)
    assert config.last_run_at is not None
    assert config.next_run_at is not None


def test_run_all_digests_skips_recently_run_configs(db_session, monkeypatch):
    sent = _install_fake_email(monkeypatch, digest_scheduler)
    source = _make_source(db_session)
    _make_job(db_session, source)
    user, config = _make_user_with_config(db_session)
    # Last run 1 hour ago (after today's 09:00 IST boundary) -> not due
    config.last_run_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db_session.commit()

    result = digest_scheduler.run_all_due_daily_digests(force=False, db=db_session)

    assert result["processed"] == 0
    assert result["emails_sent"] == 0
    assert sent == []


def test_run_all_digests_deduplicates_previously_sent_jobs(db_session, monkeypatch):
    sent = _install_fake_email(monkeypatch, digest_scheduler)
    source = _make_source(db_session)
    _make_job(db_session, source)
    user, config = _make_user_with_config(db_session)

    first = digest_scheduler.run_all_due_daily_digests(force=True, db=db_session)
    assert first["emails_sent"] == 1

    # Make the config due again: last run was before today's boundary
    config.last_run_at = datetime(2026, 10, 20, 0, 0, tzinfo=timezone.utc)
    db_session.commit()

    second = digest_scheduler.run_all_due_daily_digests(force=False, db=db_session)

    # The only job was already sent -> no re-send, no_matches logged
    assert second["processed"] == 1
    assert second["emails_sent"] == 0
    assert len(sent) == 1
    log = (
        db_session.query(AutomationLog)
        .filter(AutomationLog.user_id == user.id, AutomationLog.status == "no_matches")
        .one()
    )
    assert log.jobs_sent == 0


def test_run_all_digests_requires_smtp(db_session, monkeypatch):
    monkeypatch.setattr(digest_scheduler, "is_smtp_configured", lambda: False)
    source = _make_source(db_session)
    _make_job(db_session, source)
    _make_user_with_config(db_session)

    result = digest_scheduler.run_all_due_daily_digests(force=True, db=db_session)

    assert result == {"processed": 0, "emails_sent": 0, "status": "email_not_configured"}
    assert db_session.query(AutomationLog).count() == 0


def test_digest_respects_weekly_frequency(db_session, monkeypatch):
    sent = _install_fake_email(monkeypatch, digest_scheduler)
    source = _make_source(db_session)
    _make_job(db_session, source)
    user, config = _make_user_with_config(db_session, delivery_frequency="weekly")
    # Last run 2 days ago -> weekly not due yet
    config.last_run_at = datetime.now(timezone.utc) - timedelta(days=2)
    db_session.commit()

    result = digest_scheduler.run_all_due_daily_digests(force=False, db=db_session)
    assert result["processed"] == 0
    assert sent == []

    # 8 days ago -> due
    config.last_run_at = datetime.now(timezone.utc) - timedelta(days=8)
    db_session.commit()
    result = digest_scheduler.run_all_due_daily_digests(force=False, db=db_session)
    assert result["processed"] == 1
    assert result["emails_sent"] == 1


# ---------------------------------------------------------------------------
# Instant alerts
# ---------------------------------------------------------------------------

def test_instant_alerts_send_once_with_dedup(db_session, monkeypatch):
    sent = _install_fake_email(monkeypatch, alerts_module)
    source = _make_source(db_session)
    job = _make_job(db_session, source, title="Senior Backend Engineer")
    user, config = _make_user_with_config(db_session, email="alert_user@example.com")
    profile = UserProfile(user_id=user.id, email_alerts_enabled=True)
    db_session.add(profile)
    db_session.commit()

    alerts_module.process_instant_alerts_for_new_jobs(db_session, [job])
    assert len(sent) == 1
    assert sent[0]["to"] == user.email
    log = db_session.query(EmailNotificationLog).filter(EmailNotificationLog.user_id == user.id).one()
    assert log.status == "sent"
    assert log.job_id == job.id

    # Second pass with the same job must not re-alert
    alerts_module.process_instant_alerts_for_new_jobs(db_session, [job])
    assert len(sent) == 1
    assert db_session.query(EmailNotificationLog).count() == 1


def test_instant_alerts_respect_disabled_opt_out(db_session, monkeypatch):
    sent = _install_fake_email(monkeypatch, alerts_module)
    source = _make_source(db_session)
    job = _make_job(db_session, source)
    user, config = _make_user_with_config(db_session, email="optout_user@example.com")
    profile = UserProfile(user_id=user.id, email_alerts_enabled=False)
    db_session.add(profile)
    db_session.commit()

    alerts_module.process_instant_alerts_for_new_jobs(db_session, [job])
    assert sent == []
    assert db_session.query(EmailNotificationLog).count() == 0


# ---------------------------------------------------------------------------
# Scoring: min_salary and experience_level now participate
# ---------------------------------------------------------------------------

def _score_job(job, config=None, profile=None):
    score, reasons = calculate_match_score(job, config, profile)
    return score, reasons


def test_scoring_min_salary_participates(db_session):
    source = _make_source(db_session)
    config = AutomationConfig(user_id="u", min_salary=1000000)  # 10 LPA in INR/year

    meets = JobListing(
        id="j_meets", source_id=source.id, title="Backend Engineer", normalized_title="Backend Engineer",
        company_name="A", application_url="https://x/1", canonical_url="https://x/1",
        salary_min=15, salary_currency="INR",
    )
    below = JobListing(
        id="j_below", source_id=source.id, title="Backend Engineer", normalized_title="Backend Engineer",
        company_name="A", application_url="https://x/2", canonical_url="https://x/2",
        salary_min=5, salary_currency="INR",
    )
    meets_score, meets_reasons = _score_job(meets, config=config)
    below_score, below_reasons = _score_job(below, config=config)
    assert meets_score > below_score
    assert any("salary" in r.lower() for r in meets_reasons)
    assert any("salary" in r.lower() for r in below_reasons)


def test_scoring_experience_level_participates(db_session):
    source = _make_source(db_session)
    config = AutomationConfig(user_id="u", experience_level="fresher")

    senior_job = JobListing(
        id="j_sen", source_id=source.id, title="Senior Backend Engineer", normalized_title="Senior Backend Engineer",
        company_name="A", application_url="https://x/3", canonical_url="https://x/3",
    )
    junior_job = JobListing(
        id="j_jun", source_id=source.id, title="Backend Engineer Intern", normalized_title="Backend Engineer Intern",
        company_name="A", application_url="https://x/4", canonical_url="https://x/4",
    )
    senior_score, _ = _score_job(senior_job, config=config)
    junior_score, _ = _score_job(junior_job, config=config)
    assert junior_score > senior_score


# ---------------------------------------------------------------------------
# /automation/trigger-all is admin-protected
# ---------------------------------------------------------------------------

def test_trigger_all_requires_admin_key(client, monkeypatch):
    called = {"n": 0}

    def _fake_run(force=False):
        called["n"] += 1
        return {"processed": 0, "emails_sent": 0}

    monkeypatch.setattr(digest_scheduler, "run_all_due_daily_digests", _fake_run)

    # No key -> forbidden
    resp = client.post("/api/v1/automation/trigger-all")
    assert resp.status_code == 403

    # Wrong key -> forbidden
    resp = client.post("/api/v1/automation/trigger-all", headers={"X-Admin-Key": "wrong"})
    assert resp.status_code == 403
    assert called["n"] == 0

    # Correct key -> runs
    from app.config import settings
    resp = client.post(
        "/api/v1/automation/trigger-all",
        headers={"X-Admin-Key": settings.ADMIN_API_KEY},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"
    assert called["n"] == 1
