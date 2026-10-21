import logging
import json
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from services.email_service import is_smtp_configured, send_email, render_alert_template
from app.api.automation import calculate_match_score

logger = logging.getLogger("instant_alerts")

def calculate_job_score(job, config, profile) -> int:
    """Unified scoring: delegates to the shared matcher used by daily digests."""
    score, _reasons = calculate_match_score(job, config, profile)
    return min(score, 100)


def process_instant_alerts_for_new_jobs(db: Session, new_job_records: list):
    """
    Evaluates newly inserted jobs against active users who have instant alerts enabled.
    Sends instant notification emails for top matches with strict deduplication.
    """
    if not new_job_records:
        return

    if not is_smtp_configured():
        logger.debug("SMTP is not configured. Skipping instant job alert dispatch.")
        return

    try:
        from app.models.user import User, UserProfile, AutomationConfig, EmailNotificationLog

        # Find users with email_alerts_enabled
        profiles = db.query(UserProfile).filter(UserProfile.email_alerts_enabled == True).all()
        if not profiles:
            return

        for profile in profiles:
            user = db.query(User).filter(User.id == profile.user_id).first()
            if not user or not user.email:
                continue

            config = db.query(AutomationConfig).filter(AutomationConfig.user_id == user.id).first()
            min_threshold = (config.min_match_score if config else 70) or 70

            # Filter jobs matching this user
            sent_count = 0
            for job in new_job_records:
                if sent_count >= 3:  # Max 3 instant alerts per user per sync run to prevent inbox flooding
                    break

                # Deduplication check
                already_alerted = db.query(EmailNotificationLog).filter(
                    EmailNotificationLog.user_id == user.id,
                    EmailNotificationLog.job_id == job.id,
                    EmailNotificationLog.email_type == "instant_alert"
                ).first()

                if already_alerted:
                    continue

                score, match_reasons = calculate_match_score(job, config, profile)
                if score >= min_threshold:
                    subject = f"🎯 Instant Match: {job.title} at {job.company_name} ({score}% Match)"
                    job_data = {
                        "title": job.title,
                        "company_name": job.company_name,
                        "location_raw": job.location_raw or job.city or "India",
                        "application_url": job.application_url or "#",
                        "match_score": score,
                        "match_reasons": match_reasons
                    }
                    html_body = render_alert_template(
                        user_name=user.full_name or "Job Seeker",
                        job=job_data
                    )

                    try:
                        send_email(
                            to_address=user.email,
                            subject=subject,
                            html_body=html_body,
                            plain_body=f"New matching job opening: {job.title} at {job.company_name}."
                        )
                        log_entry = EmailNotificationLog(
                            user_id=user.id,
                            job_id=job.id,
                            email_type="instant_alert",
                            recipient_email=user.email,
                            subject=subject,
                            status="sent"
                        )
                        db.add(log_entry)
                        db.commit()
                        sent_count += 1
                        logger.info(f"Instant alert sent to {user.email} for job {job.title}")
                    except Exception as err:
                        logger.error(f"Failed to send instant alert to {user.email}: {err}")
                        log_entry = EmailNotificationLog(
                            user_id=user.id,
                            job_id=job.id,
                            email_type="instant_alert",
                            recipient_email=user.email,
                            subject=subject,
                            status="failed",
                            error_message=str(err)
                        )
                        db.add(log_entry)
                        db.commit()

    except Exception as exc:
        logger.error(f"Error during instant job alerts processing: {exc}")
