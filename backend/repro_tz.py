
import sys
import os
import asyncio
from datetime import datetime
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.tz_utils import now_jakarta

def main():
    print(f"Testing now_jakarta...")
    try:
        now = now_jakarta()
        print(f"Success: {now}")
        print(f"Timezone: {now.tzinfo}")
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
