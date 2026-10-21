"""
Shared delivery-schedule helpers for the email automation.

Used by both the digest scheduler and the automation API so that
`delivery_time`, `timezone`, and `delivery_frequency` are honored in one
place instead of being decorative fields.
"""
from datetime import date, datetime, timedelta, timezone
from typing import Optional, Tuple

try:
    from zoneinfo import ZoneInfo  # Python 3.9+
except ImportError:  # pragma: no cover - fallback for very old interpreters
    ZoneInfo = None

# Supported delivery cadences (value -> period length in days)
FREQUENCY_DAYS = {"daily": 1, "weekly": 7}

# Stable anchor (a Monday) used to snap multi-day frequencies to fixed weekdays
_EPOCH = date(2000, 1, 3)


def normalize_frequency(frequency: Optional[str]) -> str:
    """Return a supported frequency, defaulting to 'daily'."""
    freq = (frequency or "daily").strip().lower()
    return freq if freq in FREQUENCY_DAYS else "daily"


def parse_delivery_time(delivery_time: Optional[str], default: Tuple[int, int] = (9, 0)) -> Tuple[int, int]:
    """Parse an 'HH:MM' string into (hour, minute); falls back to the default."""
    try:
        hour_str, minute_str = str(delivery_time or "").strip().split(":")
        hour, minute = int(hour_str), int(minute_str)
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return hour, minute
    except (ValueError, TypeError):
        pass
    return default


def delivery_timezone(tz_name: Optional[str]):
    """Resolve an IANA timezone name; falls back to UTC when unavailable."""
    if ZoneInfo is not None:
        try:
            return ZoneInfo(tz_name or "Asia/Kolkata")
        except Exception:
            pass
    return timezone.utc


def last_delivery_moment(
    now_utc: datetime,
    delivery_time: Optional[str],
    tz_name: Optional[str],
    frequency: Optional[str] = None,
) -> datetime:
    """
    Most recent scheduled delivery moment at or before `now_utc`, returned in UTC.
    Daily: today's (or yesterday's) delivery time in the user's timezone.
    Weekly: snapped back to the same weekday as the epoch anchor.
    """
    tz = delivery_timezone(tz_name)
    local_now = now_utc.astimezone(tz)
    hour, minute = parse_delivery_time(delivery_time)
    period_days = FREQUENCY_DAYS[normalize_frequency(frequency)]

    moment = local_now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if moment > local_now:
        moment -= timedelta(days=1)

    if period_days > 1:
        steps_back = (moment.date() - _EPOCH).days % period_days
        moment -= timedelta(days=steps_back)

    return moment.astimezone(timezone.utc)


def next_delivery_moment(
    now_utc: datetime,
    delivery_time: Optional[str],
    tz_name: Optional[str],
    frequency: Optional[str] = None,
) -> datetime:
    """Next scheduled delivery moment strictly after `now_utc`, returned in UTC."""
    period_days = FREQUENCY_DAYS[normalize_frequency(frequency)]
    return last_delivery_moment(now_utc, delivery_time, tz_name, frequency) + timedelta(days=period_days)


def is_digest_due(
    last_run_at: Optional[datetime],
    now_utc: datetime,
    delivery_time: Optional[str],
    tz_name: Optional[str],
    frequency: Optional[str] = None,
) -> bool:
    """
    A digest is due when the config has never run, or when the last run
    happened before the most recent scheduled delivery moment.
    """
    if last_run_at is None:
        return True
    if last_run_at.tzinfo is None:
        last_run_at = last_run_at.replace(tzinfo=timezone.utc)
    return last_run_at < last_delivery_moment(now_utc, delivery_time, tz_name, frequency)
