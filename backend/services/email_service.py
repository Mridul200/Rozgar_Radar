import os
import sys
import logging
import html as _html
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
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

# In-memory test store for automated testing assertions
_test_sent_emails: List[Dict[str, Any]] = []

def get_test_sent_emails() -> List[Dict[str, Any]]:
    return _test_sent_emails

def clear_test_sent_emails() -> None:
    _test_sent_emails.clear()


# ---------------------------------------------------------------------------
# Provider Configuration Helpers
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


def get_resend_config() -> Optional[dict]:
    """Retrieve and validate Resend API configuration from environment."""
    api_key = os.getenv("RESEND_API_KEY") or (getattr(settings, "RESEND_API_KEY", None) if settings else None)
    api_key = (api_key or "").strip()

    sender_email = os.getenv("RESEND_SENDER_EMAIL") or (getattr(settings, "RESEND_SENDER_EMAIL", None) if settings else None)
    sender_email = (sender_email or "Rozgar Radar <onboarding@resend.dev>").strip()

    if not api_key or "your_resend_api_key" in api_key.lower():
        return None

    return {
        "api_key": api_key,
        "sender_email": sender_email,
    }


def get_smtp_config() -> Optional[dict]:
    """Retrieve standard SMTP configuration from environment or settings."""
    host = os.getenv("SMTP_HOST") or (getattr(settings, "SMTP_HOST", None) if settings else None)
    host = (host or "").strip()

    user = os.getenv("SMTP_USER") or (getattr(settings, "SMTP_USER", None) if settings else None)
    user = (user or "").strip()

    password = os.getenv("SMTP_PASSWORD") or (getattr(settings, "SMTP_PASSWORD", None) if settings else None)
    password = (password or "").strip()

    sender = os.getenv("SMTP_SENDER") or user or "noreply@rozgar-radar.com"
    sender_name = os.getenv("SMTP_SENDER_NAME") or "Rozgar Radar"

    port_raw = os.getenv("SMTP_PORT") or (getattr(settings, "SMTP_PORT", None) if settings else "587")
    try:
        port = int(port_raw)
    except (ValueError, TypeError):
        port = 587

    if not host or not user or not password or "your_email" in user.lower():
        # Fallback to Brevo shape if Brevo is configured
        brevo = get_brevo_config()
        if brevo:
            return {
                "host": "api.brevo.com (HTTP)",
                "port": 443,
                "user": brevo["sender_email"],
                "password": "***",
                "sender": brevo["sender_email"],
                "sender_name": brevo["sender_name"],
            }
        return None

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "sender": sender,
        "sender_name": sender_name,
    }


def is_smtp_configured() -> bool:
    """Check if any supported email delivery service (Brevo, Resend, or SMTP) is configured."""
    return bool(get_brevo_config() or get_resend_config() or get_smtp_config())


# ---------------------------------------------------------------------------
# Core Email Delivery (Brevo HTTP, Resend HTTP, SMTP, or Test Mock)
# ---------------------------------------------------------------------------

def send_email(to_address: str, subject: str, html_body: str, plain_body: Optional[str] = None) -> bool:
    """Send an email using configured provider (Brevo -> Resend -> SMTP -> Test Mock)."""
    to_address = to_address.strip()
    if not plain_body:
        plain_body = "Rozgar Radar Notification. Please view this email in an HTML-compatible client."

    # 1. Test / Mock environment support
    is_test_env = (
        os.getenv("TESTING", "").lower() in ("true", "1") or
        os.getenv("MOCK_EMAIL", "").lower() in ("true", "1") or
        "pytest" in sys.modules
    )

    if is_test_env:
        _test_sent_emails.append({
            "to": to_address,
            "subject": subject,
            "html": html_body,
            "plain": plain_body,
            "timestamp": datetime.now(timezone.utc),
        })

    brevo = get_brevo_config()
    resend = get_resend_config()
    smtp = get_smtp_config()

    if is_test_env and not (brevo or resend or (smtp and smtp.get("host") != "api.brevo.com (HTTP)")):
        logger.info(f"[TEST MOCK] Email delivered to {to_address} (Subject: {subject})")
        return True

    # 2. Try Brevo REST API (HTTPS port 443)
    if brevo:
        try:
            import httpx
            payload = {
                "sender": {
                    "name": brevo["sender_name"],
                    "email": brevo["sender_email"],
                },
                "to": [{"email": to_address}],
                "subject": subject,
                "htmlContent": html_body,
                "textContent": plain_body,
            }
            headers = {
                "accept": "application/json",
                "content-type": "application/json",
                "api-key": brevo["api_key"],
            }
            resp = httpx.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers, timeout=20)
            if resp.status_code in (200, 201):
                logger.info(f"Email delivered to {to_address} via Brevo API")
                return True
            else:
                logger.error(f"Brevo API error {resp.status_code}: {resp.text}")
                raise RuntimeError(f"Brevo API error {resp.status_code}: {resp.text}")
        except Exception as e:
            if not (resend or smtp):
                raise

    # 3. Try Resend REST API (HTTPS port 443)
    if resend:
        try:
            import httpx
            payload = {
                "from": resend["sender_email"],
                "to": [to_address],
                "subject": subject,
                "html": html_body,
                "text": plain_body,
            }
            headers = {
                "Authorization": f"Bearer {resend['api_key']}",
                "Content-Type": "application/json",
            }
            resp = httpx.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=20)
            if resp.status_code in (200, 201):
                logger.info(f"Email delivered to {to_address} via Resend API")
                return True
            else:
                logger.error(f"Resend API error {resp.status_code}: {resp.text}")
                raise RuntimeError(f"Resend API error {resp.status_code}: {resp.text}")
        except Exception as e:
            if not smtp:
                raise

    # 4. Try standard SMTP
    if smtp and smtp.get("host") != "api.brevo.com (HTTP)":
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            sender_name = smtp.get("sender_name", "Rozgar Radar")
            sender_email = smtp.get("sender", smtp.get("user", ""))
            msg["From"] = f"{sender_name} <{sender_email}>"
            msg["To"] = to_address
            msg.attach(MIMEText(plain_body, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            host = smtp["host"]
            port = int(smtp.get("port", 587))
            if port == 465:
                with smtplib.SMTP_SSL(host, port, timeout=20) as server:
                    if smtp.get("user") and smtp.get("password"):
                        server.login(smtp["user"], smtp["password"])
                    server.send_message(msg)
            else:
                with smtplib.SMTP(host, port, timeout=20) as server:
                    server.ehlo()
                    if server.has_extn("STARTTLS"):
                        server.starttls()
                        server.ehlo()
                    if smtp.get("user") and smtp.get("password"):
                        server.login(smtp["user"], smtp["password"])
                    server.send_message(msg)
            logger.info(f"Email delivered to {to_address} via SMTP ({host})")
            return True
        except Exception as e:
            logger.error(f"SMTP error delivering to {to_address}: {e}")
            raise RuntimeError(f"SMTP error: {e}")

    # No email provider configured
    raise RuntimeError(
        "Email delivery service is not configured. Please set BREVO_API_KEY, RESEND_API_KEY, "
        "or SMTP credentials (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD) in environment variables."
    )


# ---------------------------------------------------------------------------
# Email HTML Templates
# ---------------------------------------------------------------------------

def render_otp_template(user_name: str, otp_code: str) -> str:
    """Renders a responsive, modern HTML email template for 6-digit email OTP verification."""
    safe_name = _html.escape(user_name.strip() if user_name else "Candidate")
    current_year = datetime.now(timezone.utc).year

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rozgar Radar Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9f7; margin: 0; padding: 32px 16px;">
    <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #07120F 0%, #0D2620 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #087F68;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: rgba(8, 127, 104, 0.25); margin-bottom: 12px;">
                <span style="font-size: 24px;">🎯</span>
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Rozgar Radar</h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">AI-Powered Job Platform &bull; Email Verification</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 28px; background: #ffffff;">
            <h2 style="margin: 0 0 12px 0; color: #172B36; font-size: 18px; font-weight: 700;">Verify Your Email Address</h2>
            <p style="margin: 0 0 24px 0; font-size: 14px; color: #657580; line-height: 1.6;">
                Hello <strong>{safe_name}</strong>, thank you for signing up for Rozgar Radar. To activate your account and access verified job openings, enter the 6-digit verification code below:
            </p>

            <!-- OTP Card -->
            <div style="background: #F7F9F7; border: 2px dashed #087F68; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 700; color: #087F68; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                    Your 6-Digit Verification Code
                </div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 14px; color: #087F68; padding: 6px 0;">
                    {otp_code}
                </div>
                <div style="font-size: 12px; color: #657580; margin-top: 10px;">
                    ⏱️ Code expires in <strong>5 minutes</strong>
                </div>
            </div>

            <p style="margin: 20px 0 0 0; font-size: 13px; color: #657580; line-height: 1.5;">
                If you did not request this verification, please safely ignore this email. Do not share this code with anyone.
            </p>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0 0 4px 0;">&copy; {current_year} Rozgar Radar. All rights reserved.</p>
            <p style="margin: 0;">Securing your career journey with verified jobs and AI tools.</p>
        </div>
    </div>
</body>
</html>
"""


def send_verification_otp_email(to_address: str, user_name: str, otp_code: str) -> bool:
    """Delivers a 6-digit email OTP verification email to the user."""
    subject = f"Your Rozgar Radar Verification Code: {otp_code}"
    html_body = render_otp_template(user_name, otp_code)
    plain_body = (
        f"Hello {user_name},\n\n"
        f"Your Rozgar Radar 6-digit verification code is: {otp_code}\n\n"
        "This code will expire in 5 minutes.\n"
        "If you did not request this code, please safely ignore this email.\n\n"
        "— The Rozgar Radar Team"
    )
    return send_email(to_address=to_address, subject=subject, html_body=html_body, plain_body=plain_body)


def render_digest_template(user_name: str, jobs: List[Dict[str, Any]], date_str: str) -> str:
    """Renders a responsive, modern HTML email template for daily job digest."""
    job_cards_html = ""
    for j in jobs:
        score = j.get("match_score", 0)
        score_color = "#16a34a" if score >= 80 else "#2563eb" if score >= 65 else "#d97706"

        reasons_html = ""
        for r in j.get("match_reasons", [])[:3]:
            reasons_html += f'<span style="display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 500; border-radius: 4px; padding: 2px 8px; margin-right: 4px; margin-bottom: 4px;">✓ {_html.escape(str(r), quote=True)}</span>'

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
                <a href="{safe_url}" target="_blank" style="display: inline-block; background: #087F68; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 6px;">
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
            <div style="background: linear-gradient(135deg, #07120F 0%, #0D2620 100%); padding: 28px 24px; text-align: left; border-bottom: 3px solid #087F68;">
                <div style="display: flex; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 24px; margin-right: 8px;">🎯</span>
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Rozgar Radar</h1>
                </div>
                <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">AI-Powered Job Automation &bull; Daily Matches for {date_str}</p>
            </div>

            <!-- Content -->
            <div style="padding: 24px; background: #f8fafc;">
                <div style="background: #eff6ff; border-left: 4px solid #087F68; padding: 14px 16px; border-radius: 4px; margin-bottom: 20px;">
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
            <div style="background: #087F68; color: #ffffff; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 18px;">🎯 New Job Match Alert!</h2>
                <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Rozgar Radar Instant Notification</p>
            </div>
            <div style="padding: 24px;">
                <p style="font-size: 14px; color: #334155; margin-top: 0;">Hi {safe_user}, a new high-priority job opening just matched your profile with a <strong>{score}% match score</strong>:</p>
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; background: #fdfdfd;">
                    <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 17px;">{safe_title}</h3>
                    <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;"><strong>{safe_company}</strong> &bull; {safe_loc}</p>
                    <a href="{safe_url}" target="_blank" style="display: inline-block; background: #087F68; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px;">
                        Apply Now &rarr;
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
