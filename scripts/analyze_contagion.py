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

async def analyze_contagion():
    async with AsyncSessionLocal() as session:
        # 1. Total Failures vs Success in last 24 hours
        print("SUMMARY (LAST 24 HOURS):")
        res_24h = await session.execute(text("""
            SELECT status, count(*) 
            FROM tasks 
            WHERE executed_at > now() - interval '24 hours'
            GROUP BY status
        """))
        print(dict(res_24h.all()))
        print("-" * 30)

        # 2. Proxy Failure Rate (Percentage)
        print("PROXY FAILURE RATE (Last 1000 tasks):")
        res_proxy_rate = await session.execute(text("""
            SELECT a.proxy, 
                   COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as fails,
                   COUNT(*) as total,
                   ROUND(CAST(COUNT(CASE WHEN t.status = 'failed' THEN 1 END) AS NUMERIC) / COUNT(*) * 100, 2) as rate
            FROM tasks t
            JOIN accounts a ON t.account_id = a.id
            WHERE t.id IN (SELECT id FROM tasks ORDER BY id DESC LIMIT 1000)
            GROUP BY a.proxy
            HAVING COUNT(*) > 5
            ORDER BY rate DESC
            LIMIT 15
        """))
        for row in res_proxy_rate.all():
            print(f"IP: {row[0]} | Rate: {row[3]}% ({row[1]}/{row[2]})")
        print("-" * 30)

        # 3. Contagion Check: Are all accounts on a bad proxy failing?
        print("CONTAGION CHECK (Bad Proxies and their Accounts):")
        # Get proxies with > 80% failure rate
        res_contagion = await session.execute(text("""
            WITH ProxyStats AS (
                SELECT a.proxy, 
                       COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as fails,
                       COUNT(*) as total
                FROM tasks t
                JOIN accounts a ON t.account_id = a.id
                WHERE t.id IN (SELECT id FROM tasks ORDER BY id DESC LIMIT 2000)
                GROUP BY a.proxy
                HAVING COUNT(*) > 10
            )
            SELECT ps.proxy, a.username, t.status, t.error_message
            FROM ProxyStats ps
            JOIN accounts a ON a.proxy = ps.proxy
            JOIN tasks t ON t.account_id = a.id
            WHERE (CAST(ps.fails AS FLOAT) / ps.total) > 0.7
            AND t.id IN (SELECT id FROM tasks ORDER BY id DESC LIMIT 2000)
            ORDER BY ps.proxy, a.username, t.id DESC
        """))
        
        current_proxy = None
        for row in res_contagion.all():
            if row[0] != current_proxy:
                current_proxy = row[0]
                print(f"\nTAINTED PROXY: {current_proxy}")
            print(f"  Account: @{row[1]} | Status: {row[2]} | Error: {row[3]}")

if __name__ == "__main__":
    asyncio.run(analyze_contagion())
