import asyncio
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from app.db.session import AsyncSessionLocal
from app.models.task import Task
from sqlalchemy import select, desc

async def check():
    async with AsyncSessionLocal() as session:
        stmt = select(Task).order_by(desc(Task.created_at)).limit(1)
        result = await session.execute(stmt)
        task = result.scalars().first()
        
        if task:
            with open("task_info.txt", "w", encoding="utf-8") as f:
                f.write(f"Task ID: {task.id}\n")
                f.write(f"Status: {task.status}\n")
                f.write(f"Error: {task.error_message}\n")
                f.write(f"Params: {task.params}\n")
                if task.params and 'media_path' in task.params:
                    mp = task.params['media_path']
                    f.write(f"Media Path: {mp}\n")
                    f.write(f"Exists: {os.path.exists(mp)}\n")
                    f.write(f"CWD: {os.getcwd()}\n")

if __name__ == "__main__":
    asyncio.run(check())
    print("Done. Check task_info.txt")
