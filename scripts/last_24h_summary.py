import asyncio
import os
import sys
import logging

# Disable SQLAlchemy logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# Set environment variables
os.environ['POSTGRES_SERVER'] = 'localhost'
os.environ['POSTGRES_USER'] = 'app_user'
os.environ['POSTGRES_PASSWORD'] = 'app_password'
os.environ['POSTGRES_DB'] = 'ig_automation_db'
os.environ['POSTGRES_PORT'] = '5432'

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def simple_summary():
    async with AsyncSessionLocal() as session:
        print("\n=== TOTAL TASKS (HISTORICAL) ===")
        res_total = await session.execute(text("SELECT status, count(*) FROM tasks GROUP BY status"))
        print(dict(res_total.all()))

        print("\n=== TASKS IN LAST 24 HOURS ===")
        res_24h = await session.execute(text("""
            SELECT status, count(*) 
            FROM tasks 
            WHERE executed_at > now() - interval '24 hours'
            GROUP BY status
        """))
        print(dict(res_24h.all()))

        print("\n=== TOP 5 ERROR MESSAGES (LAST 24 HOURS) ===")
        res_errors = await session.execute(text("""
            SELECT error_message, count(*) as c
            FROM tasks
            WHERE status = 'failed'
            AND executed_at > now() - interval '24 hours'
            GROUP BY error_message
            ORDER BY c DESC
            LIMIT 5
        """))
        for row in res_errors.all():
            print(f"[{row[1]}] {row[0]}")

if __name__ == "__main__":
    asyncio.run(simple_summary())
