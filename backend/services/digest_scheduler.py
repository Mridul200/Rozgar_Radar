import logging
import json
import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import SessionLocal
from app.models.user import User, UserProfile, AutomationConfig, AutomationLog
from app.models.job import JobListing
from services.email_service import is_smtp_configured, send_email, render_digest_template
from services.delivery_schedule import (
    is_digest_due,
    next_delivery_moment,
    normalize_frequency,
)
from app.api.automation import calculate_match_score

logger = logging.getLogger("digest_scheduler")

# Liveness state of the background digest worker in this process
_WORKER_STATE = {"alive": False, "last_tick_at": None}


def get_scheduler_status() -> dict:
    """Real liveness status of the periodic digest worker (no hardcoding)."""
    return {
        "digest_worker_alive": _WORKER_STATE["alive"] is True,
        "last_tick_at": _WORKER_STATE["last_tick_at"],
    }


def run_all_due_daily_digests(force: bool = False, db: Session = None) -> dict:
    """
    Finds all active automation configurations whose scheduled delivery moment
    has arrived and delivers their digest emails.

    When `db` is provided (tests / embedded use), that session is used and left
    open for the caller; otherwise a private SessionLocal is created and closed.
    """
    if not is_smtp_configured():
        logger.warning("SMTP is not configured. Daily digests skipped.")
        return {"processed": 0, "emails_sent": 0, "status": "smtp_not_configured"}

    own_session = db is None
    if own_session:
        db = SessionLocal()
    processed_count = 0
    sent_count = 0

    try:
        active_configs = db.query(AutomationConfig).filter(AutomationConfig.is_active == True).all()
        now = datetime.now(timezone.utc)

        for config in active_configs:
            user = db.query(User).filter(User.id == config.user_id).first()
            if not user or not user.email:
                continue

            # Check if due based on the user's scheduled delivery time/timezone/frequency
            frequency = normalize_frequency(config.delivery_frequency)
            if not force and not is_digest_due(
                config.last_run_at, now, config.delivery_time, config.timezone, frequency
            ):
                continue

            profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()

            # Collect previously sent job IDs to eliminate duplicates
            prev_logs = db.query(AutomationLog).filter(AutomationLog.user_id == user.id).all()
            already_sent_ids = set()
            for l in prev_logs:
                if l.sent_job_ids:
                    try:
                        for j_id in json.loads(l.sent_job_ids):
                            already_sent_ids.add(j_id)
                    except Exception:
                        pass

            query = db.query(JobListing).filter(
                JobListing.is_duplicate == False,
                JobListing.freshness_status == "active"
            )
            # Prefer India-eligible jobs, then recency; wide window so the digest
            # is not starved by large batches of international postings
            candidates = query.order_by(
                desc(JobListing.is_india_eligible), desc(JobListing.publication_date)
            ).limit(300).all()

            matched_jobs = []
            min_threshold = config.min_match_score or 60

            for job in candidates:
                if job.id in already_sent_ids and not force:
                    continue
                score, reasons = calculate_match_score(job, config, profile)
                if score >= min_threshold:
                    matched_jobs.append((job, score, reasons))

            matched_jobs.sort(key=lambda x: x[1], reverse=True)
            top_jobs = matched_jobs[:10]
            next_run_at = next_delivery_moment(now, config.delivery_time, config.timezone, frequency)

            processed_count += 1
            if not top_jobs:
                log = AutomationLog(
                    user_id=user.id,
                    jobs_found=len(matched_jobs),
                    jobs_sent=0,
                    status="no_matches",
                    sent_job_ids=json.dumps([]),
                    error_message=None
                )
                db.add(log)
                config.last_run_at = now
                config.next_run_at = next_run_at
                db.commit()
                continue

            # Send digest email
            today_str = now.strftime("%B %d, %Y")
            subject = f"🎯 Rozgar Radar: {len(top_jobs)} Recommended Job Matches – {today_str}"
            jobs_data = [
                {
                    "title": j[0].title,
                    "company_name": j[0].company_name,
                    "location_raw": j[0].location_raw,
                    "city": j[0].city,
                    "work_mode": j[0].work_mode,
                    "application_url": j[0].application_url,
                    "match_score": j[1],
                    "match_reasons": j[2]
                }
                for j in top_jobs
            ]

            body_html = render_digest_template(
                user_name=user.full_name or "Job Seeker",
                jobs=jobs_data,
                date_str=today_str
            )

            try:
                target_email = (profile.notification_email if profile and profile.notification_email else user.email).strip().lower()
                send_email(
                    to_address=target_email,
                    subject=subject,
                    html_body=body_html,
                    plain_body=f"Rozgar Radar found {len(top_jobs)} matching jobs for you today."
                )
                sent_ids = [j[0].id for j in top_jobs]
                log = AutomationLog(
                    user_id=user.id,
                    jobs_found=len(matched_jobs),
                    jobs_sent=len(top_jobs),
                    status="success",
                    sent_job_ids=json.dumps(sent_ids),
                    error_message=None
                )
                db.add(log)
                config.last_run_at = now
                config.next_run_at = next_run_at
                db.commit()
                sent_count += 1
                logger.info(f"Daily digest delivered to {user.email} ({len(top_jobs)} jobs)")
            except Exception as exc:
                logger.error(f"Failed to deliver daily digest to {user.email}: {exc}")
                log = AutomationLog(
                    user_id=user.id,
                    jobs_found=len(matched_jobs),
                    jobs_sent=0,
                    status="email_error",
                    sent_job_ids=json.dumps([]),
                    error_message=str(exc)
                )
                db.add(log)
                db.commit()

        return {
            "processed": processed_count,
            "emails_sent": sent_count,
            "timestamp": now.isoformat()
        }
    finally:
        if own_session:
            db.close()


async def periodic_daily_digest_worker():
    """
    Background worker that checks if scheduled digests
    (daily/weekly at the user's configured delivery time) are due.
    Performs an initial check 10 seconds after startup, then checks every 30 minutes.
    """
    CHECK_INTERVAL = 30 * 60  # 30 minutes
    _WORKER_STATE["alive"] = True
    try:
        # Initial short grace period to allow database tables & startup initialization to complete
        await asyncio.sleep(10)
        while True:
            try:
                _WORKER_STATE["last_tick_at"] = datetime.now(timezone.utc)
                logger.info("Checking for scheduled daily job digests...")
                run_all_due_daily_digests(force=False)
            except Exception as exc:
                logger.error(f"Error in periodic daily digest worker run: {exc}")
            await asyncio.sleep(CHECK_INTERVAL)
    except asyncio.CancelledError:
        pass
    finally:
        _WORKER_STATE["alive"] = False
