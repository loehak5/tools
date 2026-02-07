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

async def generate_proxy_report():
    async with AsyncSessionLocal() as session:
        # Query to get completed and failed counts per proxy
        stmt = text("""
            SELECT 
                a.proxy,
                COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed,
                COUNT(*) as total
            FROM tasks t
            JOIN accounts a ON t.account_id = a.id
            GROUP BY a.proxy
            ORDER BY failed DESC
        """)
        
        result = await session.execute(stmt)
        rows = result.all()
        
        print(f"{'PROXY IP':<50} | {'SUCCESS':<8} | {'FAILED':<8} | {'RATE (%)':<10}")
        print("-" * 85)
        
        report_data = []
        for row in rows:
            proxy = row[0] if row[0] else "No Proxy"
            completed = row[1]
            failed = row[2]
            total = row[3]
            rate = round((completed / total * 100), 2) if total > 0 else 0
            
            # Clean up proxy string for display (remove auth if present)
            display_proxy = proxy
            if "@" in proxy:
                display_proxy = proxy.split("@")[-1]
            
            print(f"{display_proxy:<50} | {completed:<8} | {failed:<8} | {rate:<10}%")
            report_data.append({
                "proxy": display_proxy,
                "completed": completed,
                "failed": failed,
                "rate": rate
            })
        
        # Save to file as well
        with open("proxy_performance_report.txt", "w") as f:
            f.write(f"{'PROXY IP':<50} | {'SUCCESS':<8} | {'FAILED':<8} | {'RATE (%)':<10}\n")
            f.write("-" * 85 + "\n")
            for item in report_data:
                f.write(f"{item['proxy']:<50} | {item['completed']:<8} | {item['failed']:<8} | {item['rate']:<10}%\n")

if __name__ == "__main__":
    asyncio.run(generate_proxy_report())
