from datetime import datetime
from zoneinfo import ZoneInfo

def now_jakarta() -> datetime:
    """Returns the current datetime in Asia/Jakarta timezone."""
    return datetime.now(ZoneInfo("Asia/Jakarta"))

def to_jakarta(dt: datetime) -> datetime:
    """Converts a naive or aware datetime to Asia/Jakarta."""
    if dt.tzinfo is None:
        # Assume naive is UTC
        return dt.replace(tzinfo=ZoneInfo("UTC")).astimezone(ZoneInfo("Asia/Jakarta"))
    return dt.astimezone(ZoneInfo("Asia/Jakarta"))
