import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from datetime import datetime

async def check_pending_tasks():
    async with AsyncSessionLocal() as session:
        stmt = select(Task).where(Task.status == "pending")
        result = await session.execute(stmt)
        tasks = result.scalars().all()
        
        print(f"Current UTC time: {datetime.utcnow()}")
        print(f"Found {len(tasks)} pending tasks:")
        for task in tasks:
            print(f"ID: {task.id}, Type: {task.task_type}, Scheduled At: {task.scheduled_at} (UTC?)")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(check_pending_tasks())
