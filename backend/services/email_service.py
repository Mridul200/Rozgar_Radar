import os
import sys
import logging
import smtplib
from email.message import EmailMessage
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

# Ensure project root & backend are available on sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.abspath(os.path.join(_current_dir, ".."))
_project_root = os.path.abspath(os.path.join(_current_dir, "..", ".."))

for _p in [_backend_dir, _project_root]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from dotenv import load_dotenv
    for _env_file in [os.path.join(_project_root, ".env"), os.path.join(_backend_dir, ".env")]:
        if os.path.exists(_env_file):
            load_dotenv(_env_file)
except ImportError:
    pass

try:
    from app.config import settings
except ImportError:
    settings = None

logger = logging.getLogger("email_service")


def get_smtp_config() -> Optional[dict]:
    """Retrieve and validate SMTP configuration from environment or settings."""
    host = os.getenv("SMTP_HOST") or (settings.SMTP_HOST if settings else "smtp.gmail.com")
    host = (host or "smtp.gmail.com").strip()

    port_val = os.getenv("SMTP_PORT") or (settings.SMTP_PORT if settings else 587)
    try:
        port = int(str(port_val).strip())
    except ValueError:
        port = 587

    user = os.getenv("SMTP_USER") or (settings.SMTP_USER if settings else "")
    user = (user or "").strip()

    raw_password = os.getenv("SMTP_PASSWORD") or (settings.SMTP_PASSWORD if settings else "")
    password = (raw_password or "").replace(" ", "").strip()

    sender = os.getenv("SMTP_SENDER") or (settings.SMTP_SENDER if settings else user)
    sender = (sender or "").strip() or user

    if not host or not user or not password:
        return None

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "sender": sender,
    }


def is_smtp_configured() -> bool:
    """Check if SMTP credentials are set."""
    return get_smtp_config() is not None


def send_email(to_address: str, subject: str, html_body: str, plain_body: Optional[str] = None) -> bool:
    """Send an email via configured SMTP with TLS."""
    cfg = get_smtp_config()
    if not cfg:
        raise RuntimeError("SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"Rozgar Radar <{cfg['sender']}>"
    msg["To"] = to_address

    if not plain_body:
        plain_body = "Rozgar Radar Job Notification. Please view this email in an HTML-compatible client."

    msg.set_content(plain_body)
    msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(cfg["user"], cfg["password"])
            server.send_message(msg)
        logger.info(f"Email successfully delivered to {to_address} (Subject: {subject})")
        return True
    except Exception as exc:
        logger.error(f"Failed to send email to {to_address}: {exc}")
        raise


def render_digest_template(user_name: str, jobs: List[Dict[str, Any]], date_str: str) -> str:
    """Renders a responsive, modern HTML email template for daily job digest."""
    job_cards_html = ""
    for j in jobs:
        score = j.get("match_score", 0)
        score_color = "#16a34a" if score >= 80 else "#2563eb" if score >= 65 else "#d97706"
        
        reasons_html = ""
        for r in j.get("match_reasons", [])[:3]:
            reasons_html += f'<span style="display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 500; border-radius: 4px; padding: 2px 8px; margin-right: 4px; margin-bottom: 4px;">✓ {r}</span>'

        location_badge = j.get("location_raw") or j.get("city") or "India / Remote"
        work_mode = j.get("work_mode", "").replace("_", " ").title()
        
        job_cards_html += f"""
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #0f172a; font-weight: 600;">{j.get('title', 'Job Opening')}</h3>
                <span style="background-color: {score_color}15; color: {score_color}; font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 12px; border: 1px solid {score_color}30;">
                    {score}% Match
                </span>
            </div>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155; font-weight: 500;">
                🏢 {j.get('company_name', 'Company')} &nbsp;&bull;&nbsp; 📍 {location_badge}
                {f' &nbsp;&bull;&nbsp; 💼 {work_mode}' if work_mode else ''}
            </p>
            <div style="margin: 8px 0;">
                {reasons_html}
            </div>
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #f1f5f9;">
                <a href="{j.get('application_url', '#')}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 6px;">
                    View & Apply &rarr;
                </a>
            </div>
        </div>
        """

    total_count = len(jobs)
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rozgar Radar Daily Digest</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
        <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 28px 24px; text-align: left; border-bottom: 3px solid #2563eb;">
                <div style="display: flex; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 24px; margin-right: 8px;">🎯</span>
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Rozgar Radar</h1>
                </div>
                <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">AI-Powered Job Automation &bull; Daily Matches for {date_str}</p>
            </div>

            <!-- Content -->
            <div style="padding: 24px; background: #f8fafc;">
                <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 4px; margin-bottom: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #1e3a8a;">
                        Hello <strong>{user_name}</strong>! We discovered <strong>{total_count} fresh job openings</strong> matching your preferred roles and target skills.
                    </p>
                </div>

                <div style="margin-top: 16px;">
                    {job_cards_html}
                </div>
            </div>

            <!-- Footer -->
            <div style="padding: 20px 24px; background: #ffffff; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
                <p style="margin: 0 0 6px 0;">You received this email because you enabled Daily Job Automation in Rozgar Radar.</p>
                <p style="margin: 0;">To update your preferences or pause notifications, visit your Rozgar Radar Automation dashboard.</p>
            </div>
        </div>
    </body>
    </html>
    """


def render_alert_template(user_name: str, job: Dict[str, Any]) -> str:
    """Renders a real-time instant job alert email."""
    score = job.get("match_score", 0)
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden;">
            <div style="background: #2563eb; color: #ffffff; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 18px;">🎯 New Job Match Alert!</h2>
                <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Rozgar Radar Instant Notification</p>
            </div>
            <div style="padding: 24px;">
                <p style="font-size: 14px; color: #334155; margin-top: 0;">Hi {user_name}, a new high-priority job opening just matched your profile with a <strong>{score}% match score</strong>:</p>
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; background: #fdfdfd;">
                    <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 17px;">{job.get('title')}</h3>
                    <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;"><strong>{job.get('company_name')}</strong> &bull; {job.get('location_raw', 'India')}</p>
                    <a href="{job.get('application_url')}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px;">
                        Apply Now &rarr;
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
