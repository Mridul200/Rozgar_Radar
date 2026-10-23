import os
import sys
import logging
import html as _html
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


# ---------------------------------------------------------------------------
# Brevo (Sendinblue) configuration helpers
# ---------------------------------------------------------------------------

def get_brevo_config() -> Optional[dict]:
    """Retrieve and validate Brevo API configuration from environment or settings."""
    api_key = os.getenv("BREVO_API_KEY") or (getattr(settings, "BREVO_API_KEY", None) if settings else None)
    api_key = (api_key or "").strip()

    sender_email = os.getenv("BREVO_SENDER_EMAIL") or (getattr(settings, "BREVO_SENDER_EMAIL", None) if settings else None)
    sender_email = (sender_email or "").strip()

    sender_name = os.getenv("BREVO_SENDER_NAME") or (getattr(settings, "BREVO_SENDER_NAME", None) if settings else "Rozgar Radar")
    sender_name = (sender_name or "Rozgar Radar").strip()

    if not api_key or not sender_email or "your_brevo_api_key" in api_key.lower():
        return None

    return {
        "api_key": api_key,
        "sender_email": sender_email,
        "sender_name": sender_name,
    }


def is_smtp_configured() -> bool:
    """Check if Brevo email credentials are set (kept as is_smtp_configured for API compatibility)."""
    return get_brevo_config() is not None


# Keep this alias so automation.py import doesn't break
def get_smtp_config() -> Optional[dict]:
    """Alias for get_brevo_config() — retained for backward compatibility."""
    cfg = get_brevo_config()
    if cfg is None:
        return None
    # Return a dict with shape that automation.py uses for display purposes
    return {
        "host": "api.brevo.com (HTTP)",
        "port": 443,
        "user": cfg["sender_email"],
        "password": "***",
        "sender": cfg["sender_email"],
    }


# ---------------------------------------------------------------------------
# Core email sender using Brevo Transactional Email API (HTTPS, no SMTP)
# ---------------------------------------------------------------------------

def send_email(to_address: str, subject: str, html_body: str, plain_body: Optional[str] = None) -> bool:
    """Send an email via the Brevo Transactional Email REST API.

    Uses HTTPS (port 443) — works on Render free tier without any SMTP restrictions.
    """
    cfg = get_brevo_config()
    if not cfg:
        raise RuntimeError(
            "Brevo configuration is incomplete. "
            "Please set BREVO_API_KEY and BREVO_SENDER_EMAIL in your environment variables."
        )

    if not plain_body:
        plain_body = "Rozgar Radar Job Notification. Please view this email in an HTML-compatible client."

    try:
        import httpx
    except ImportError:
        raise RuntimeError("httpx is required. Add 'httpx>=0.27.0' to requirements.txt.")

    payload = {
        "sender": {
            "name": cfg["sender_name"],
            "email": cfg["sender_email"],
        },
        "to": [{"email": to_address}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": plain_body,
    }

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": cfg["api_key"],
    }

    response = httpx.post(
        "https://api.brevo.com/v3/smtp/email",
        json=payload,
        headers=headers,
        timeout=20,
    )

    if response.status_code in (200, 201):
        logger.info(f"Email successfully delivered to {to_address} via Brevo (Subject: {subject})")
        return True
    else:
        error_detail = response.text
        logger.error(f"Brevo API error {response.status_code}: {error_detail}")
        raise RuntimeError(f"Brevo API error {response.status_code}: {error_detail}")


# ---------------------------------------------------------------------------
# Email HTML Templates (unchanged)
# ---------------------------------------------------------------------------

def render_digest_template(user_name: str, jobs: List[Dict[str, Any]], date_str: str) -> str:
    """Renders a responsive, modern HTML email template for daily job digest."""
    job_cards_html = ""
    for j in jobs:
        score = j.get("match_score", 0)
        score_color = "#16a34a" if score >= 80 else "#2563eb" if score >= 65 else "#d97706"

        reasons_html = ""
        for r in j.get("match_reasons", [])[:3]:
            reasons_html += f'<span style="display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 500; border-radius: 4px; padding: 2px 8px; margin-right: 4px; margin-bottom: 4px;">✓ {_html.escape(str(r), quote=True)}</span>'

        # HTML escape fields
        location_badge = _html.escape(str(j.get("location_raw") or j.get("city") or "India / Remote"), quote=True)
        work_mode = _html.escape(str((j.get("work_mode") or "").replace("_", " ").title()), quote=True)
        safe_title = _html.escape(str(j.get("title", "Job Opening")), quote=True)
        safe_company = _html.escape(str(j.get("company_name", "Company")), quote=True)
        raw_url = str(j.get("application_url", "#")).strip()
        safe_url = _html.escape(raw_url, quote=True) if raw_url.startswith(("http://", "https://")) else "#"

        job_cards_html += f"""
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #0f172a; font-weight: 600;">{safe_title}</h3>
                <span style="background-color: {score_color}15; color: {score_color}; font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 12px; border: 1px solid {score_color}30;">
                    {score}% Match
                </span>
            </div>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155; font-weight: 500;">
                🏢 {safe_company} &nbsp;&bull;&nbsp; 📍 {location_badge}
                {f' &nbsp;&bull;&nbsp; 💼 {work_mode}' if work_mode else ''}
            </p>
            <div style="margin: 8px 0;">
                {reasons_html}
            </div>
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #f1f5f9;">
                <a href="{safe_url}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 6px;">
                    View &amp; Apply &rarr;
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
                        Hello <strong>{_html.escape(user_name)}</strong>! We discovered <strong>{total_count} fresh job openings</strong> matching your preferred roles and target skills.
                    </p>
                </div>

                <div style="margin-top: 16px;">
                    {job_cards_html}
                </div>
            </div>

            <!-- Footer -->
            <div style="padding: 20px 24px; background: #ffffff; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
                <p style="margin: 0 0 6px 0;">You received this email because you enabled Daily Job Automation in HirePulse.</p>
                <p style="margin: 0;">To update your preferences or pause notifications, visit your Rozgar Radar Automation dashboard.</p>
            </div>
        </div>
    </body>
    </html>
    """


def render_alert_template(user_name: str, job: Dict[str, Any]) -> str:
    """Renders a real-time instant job alert email."""
    score = job.get("match_score", 0)
    safe_user = _html.escape(str(user_name), quote=True)
    safe_title = _html.escape(str(job.get("title", "Job Opening")), quote=True)
    safe_company = _html.escape(str(job.get("company_name", "Company")), quote=True)
    safe_loc = _html.escape(str(job.get("location_raw", "India")), quote=True)
    raw_url = str(job.get("application_url", "#")).strip()
    safe_url = _html.escape(raw_url, quote=True) if raw_url.startswith(("http://", "https://")) else "#"
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
                <p style="font-size: 14px; color: #334155; margin-top: 0;">Hi {safe_user}, a new high-priority job opening just matched your profile with a <strong>{score}% match score</strong>:</p>
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; background: #fdfdfd;">
                    <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 17px;">{safe_title}</h3>
                    <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;"><strong>{safe_company}</strong> &bull; {safe_loc}</p>
                    <a href="{safe_url}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px;">
                        Apply Now &rarr;
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
