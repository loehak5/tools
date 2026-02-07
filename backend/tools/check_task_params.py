
import asyncio
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from app.db.session import AsyncSessionLocal
from app.models.task import Task
from sqlalchemy import select, desc

async def check_task_params():
    async with AsyncSessionLocal() as session:
        stmt = select(Task).where(Task.status == 'failed').order_by(desc(Task.created_at)).limit(1)
        result = await session.execute(stmt)
        task = result.scalars().first()
        
        if task:
            print(f"Task ID: {task.id}")
            print(f"Task Type: {task.task_type}")
            print(f"Params: {task.params}")
            print(f"Error: {task.error_message}")
            
            # Check if media path exists
            if task.params and 'media_path' in task.params:
                media_path = task.params['media_path']
                print(f"Media Path: {media_path}")
                print(f"File Exists: {os.path.exists(media_path)}")
                print(f"CWD: {os.getcwd()}")
        else:
            print("No failed task found")

if __name__ == "__main__":
    asyncio.run(check_task_params())
