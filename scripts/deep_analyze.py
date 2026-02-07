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

from sqlalchemy import select, desc, text
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from app.models.account import Account

async def deep_analysis():
    with open("deep_analysis_report.txt", "w") as f:
        async with AsyncSessionLocal() as session:
            try:
                # 1. Overall Summary
                res = await session.execute(text("SELECT status, count(*) FROM tasks GROUP BY status"))
                f.write(f"OVERALL TASK SUMMARY: {dict(res.all())}\n\n")

                # 2. Recent Trends (Last 500 tasks)
                f.write("RECENT TRENDS (Last 500 Tasks):\n")
                res_recent = await session.execute(text("""
                    SELECT status, count(*) 
                    FROM (SELECT status FROM tasks ORDER BY id DESC LIMIT 500) as recent 
                    GROUP BY status
                """))
                f.write(f"{dict(res_recent.all())}\n\n")

                # 3. Error Distribution (Recent 500)
                f.write("ERROR DISTRIBUTION (Recent 500):\n")
                res_errors = await session.execute(text("""
                    SELECT error_message, count(*) as count
                    FROM tasks
                    WHERE status = 'failed'
                    AND id IN (SELECT id FROM tasks ORDER BY id DESC LIMIT 500)
                    GROUP BY error_message
                    ORDER BY count DESC
                """))
                for row in res_errors.all():
                    f.write(f"Count: {row[1]} | Error: {row[0]}\n")
                f.write("\n")

                # 4. Proxy Correlation
                f.write("PROXY CORRELATION (Which proxies fail the most?):\n")
                res_proxy = await session.execute(text("""
                    SELECT a.proxy, count(*) as fail_count
                    FROM tasks t
                    JOIN accounts a ON a.id = t.account_id
                    WHERE t.status = 'failed'
                    AND t.id IN (SELECT id FROM tasks ORDER BY id DESC LIMIT 1000)
                    GROUP BY a.proxy
                    ORDER BY fail_count DESC
                    LIMIT 20
                """))
                for row in res_proxy.all():
                    f.write(f"Failures: {row[1]} | Proxy: {row[0]}\n")
                f.write("\n")

                # 5. Account Stability
                f.write("MOST STABLE ACCOUNTS (Success vs Total in last 1000 tasks):\n")
                res_stable = await session.execute(text("""
                    SELECT a.username, 
                           COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as success,
                           COUNT(*) as total
                    FROM tasks t
                    JOIN accounts a ON a.id = t.account_id
                    WHERE t.id IN (SELECT id FROM tasks ORDER BY id DESC LIMIT 1000)
                    GROUP BY a.username
                    HAVING COUNT(*) > 5
                    ORDER BY (CAST(COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS FLOAT) / COUNT(*)) DESC
                    LIMIT 10
                """))
                for row in res_stable.all():
                    f.write(f"User: @{row[0]} | Success: {row[1]}/{row[2]}\n")

            except Exception as e:
                f.write(f"Analysis error: {e}\n")
    print("Deep analysis saved to deep_analysis_report.txt")

if __name__ == "__main__":
    asyncio.run(deep_analysis())
