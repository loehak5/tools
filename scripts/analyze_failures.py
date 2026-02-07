import asyncio
import os
import sys

# Set environment variables manually
os.environ['POSTGRES_SERVER'] = 'localhost'
os.environ['POSTGRES_USER'] = 'app_user'
os.environ['POSTGRES_PASSWORD'] = 'app_password'
os.environ['POSTGRES_DB'] = 'ig_automation_db'
os.environ['POSTGRES_PORT'] = '5432'
os.environ['REDIS_HOST'] = 'localhost'

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import select, desc, text
from app.db.session import AsyncSessionLocal
from app.models.task import Task

async def check_failed_tasks():
    with open("analysis_report.txt", "w") as f:
        async with AsyncSessionLocal() as session:
            try:
                # Get status counts
                res = await session.execute(text("SELECT status, count(*) FROM tasks GROUP BY status"))
                counts = res.all()
                f.write(f"Task status summary: {dict(counts)}\n")

                # Get the latest 100 failed tasks
                stmt = select(Task).where(Task.status == 'failed').order_by(desc(Task.id)).limit(100)
                result = await session.execute(stmt)
                tasks = result.scalars().all()
                
                f.write(f"\nLatest failed task distribution:\n")
                errors = {}
                for t in tasks:
                     err = str(t.error_message)
                     errors[err] = errors.get(err, 0) + 1
                
                for err, count in sorted(errors.items(), key=lambda x: x[1], reverse=True):
                    f.write(f"Count: {count} | Error: {err}\n")

                # Check accounts with many failed tasks
                f.write("\nAccounts with most failures (top 10):\n")
                res_acc_fail = await session.execute(text("""
                    SELECT account_id, count(*) as fail_count 
                    FROM tasks 
                    WHERE status = 'failed' 
                    GROUP BY account_id 
                    ORDER BY fail_count DESC 
                    LIMIT 10
                """))
                for row in res_acc_fail.all():
                    f.write(f"Account ID: {row[0]} | Failures: {row[1]}\n")

                # Check specific account stats vs tasks
                f.write("\nComparing Action Stats vs Task Table (Sample):\n")
                res_comp = await session.execute(text("""
                    SELECT t.account_id, a.username, t.task_type, count(*) as task_count
                    FROM tasks t
                    JOIN accounts a ON a.id = t.account_id
                    WHERE t.status = 'completed'
                    GROUP BY t.account_id, a.username, t.task_type
                    ORDER BY task_count DESC
                    LIMIT 10
                """))
                for row in res_comp.all():
                    f.write(f"Account: @{row[1]} (ID: {row[0]}) | Type: {row[2]} | Completed Tasks: {row[3]}\n")

            except Exception as e:
                f.write(f"Database error: {e}\n")
    print("Analysis saved to analysis_report.txt")

if __name__ == "__main__":
    asyncio.run(check_failed_tasks())
