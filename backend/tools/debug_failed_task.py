
import sys
import os
import asyncio

# Add backend to path
# strict absolute path to backend
backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from app.db.session import AsyncSessionLocal
from app.models.task import Task
from sqlalchemy import select, desc

async def get_failed_task():
    try:
        async with AsyncSessionLocal() as session:
            stmt = select(Task).where(Task.status == 'failed').order_by(desc(Task.created_at)).limit(1)
            result = await session.execute(stmt)
            task = result.scalars().first()
            
            with open("task_details.txt", "w") as f:
                if task:
                    f.write(f"Task ID: {task.id}\n")
                    f.write(f"Status: {task.status}\n")
                    f.write(f"Error Message: {task.error_message}\n")
                    f.write(f"Scheduled At: {task.scheduled_at}\n")
                    f.write(f"Executed At: {task.executed_at}\n")
                else:
                    f.write("No failed tasks found.\n")
    except Exception as e:
        with open("task_error.txt", "w") as f:
            import traceback
            traceback.print_exc(file=f)

if __name__ == "__main__":
    asyncio.run(get_failed_task())
