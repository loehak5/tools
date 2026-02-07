import asyncio
import os
import sys

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

async def analyze_failures():
    async with AsyncSessionLocal() as session:
        print("\n=== ERROR DISTRIBUTION (LAST 24 HOURS) ===")
        res_errors = await session.execute(text("""
            SELECT error_message, count(*) as c
            FROM tasks
            WHERE status = 'failed'
            AND executed_at > now() - interval '24 hours'
            GROUP BY error_message
            ORDER BY c DESC
        """))
        for row in res_errors.all():
            print(f"[{row[1]}] {row[0]}")

        print("\n=== PROXY FAILURE DISTRIBUTION (LAST 24 HOURS) ===")
        res_proxy = await session.execute(text("""
            SELECT a.proxy, count(*) as c
            FROM tasks t
            JOIN accounts a ON t.account_id = a.id
            WHERE t.status = 'failed'
            AND t.executed_at > now() - interval '24 hours'
            GROUP BY a.proxy
            ORDER BY c DESC
            LIMIT 10
        """))
        for row in res_proxy.all():
            print(f"[{row[1]}] {row[0]}")

if __name__ == "__main__":
    asyncio.run(analyze_failures())
