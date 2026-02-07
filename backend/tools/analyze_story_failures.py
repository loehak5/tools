
import sys
import os
import asyncio

# Set environment variables manually for the script
os.environ["POSTGRES_SERVER"] = "localhost"
os.environ["POSTGRES_USER"] = "app_user"
os.environ["POSTGRES_PASSWORD"] = "app_password"
os.environ["POSTGRES_DB"] = "ig_automation_db"
os.environ["POSTGRES_PORT"] = "5432"

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import AsyncSessionLocal
from app.models.task import Task
from sqlalchemy import select, desc

async def analyze_failed_stories():
    try:
        async with AsyncSessionLocal() as session:
            stmt = select(Task).where(
                Task.task_type == 'story',
                Task.status == 'failed'
            ).order_by(desc(Task.created_at)).limit(20)
            
            result = await session.execute(stmt)
            tasks = result.scalars().all()
            
            with open("story_failure_analysis.txt", "w") as f:
                if not tasks:
                    f.write("No failed story tasks found.\n")
                    return
                
                f.write(f"Found {len(tasks)} failed story tasks.\n\n")
                for task in tasks:
                    f.write(f"--- Task ID: {task.id} ---\n")
                    f.write(f"Account: {task.account_username}\n")
                    # Accessing related object might need to ensures it's loaded
                    if task.account:
                        f.write(f"  Account Status: {task.account.status}\n")
                        f.write(f"  Proxy: {task.account.proxy}\n")
                    f.write(f"Scheduled At: {task.scheduled_at}\n")
                    f.write(f"Executed At: {task.executed_at}\n")
                    f.write(f"Error Message: {task.error_message}\n")
                    f.write(f"Params: {task.params}\n\n")
                    
    except Exception as e:
        with open("story_analysis_error.txt", "w") as f:
            import traceback
            traceback.print_exc(file=f)

if __name__ == "__main__":
    asyncio.run(analyze_failed_stories())
