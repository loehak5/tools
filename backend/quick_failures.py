"""
Quick check of recent failed tasks
"""
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from sqlalchemy import select

async def check_failures():
    async with AsyncSessionLocal() as db:
        # Get recent failed tasks
        stmt = select(Task).where(Task.status == "failed").order_by(Task.created_at.desc()).limit(10)
        result = await db.execute(stmt)
        tasks = result.scalars().all()
        
        print(f"\n{'='*80}")
        print(f"Last {len(tasks)} Failed Tasks")
        print(f"{'='*80}\n")
        
        for i, task in enumerate(tasks, 1):
            print(f"[{i}] Task #{task.id} - {task.task_type}")
            print(f"    Account: {task.account_id}")
            print(f"    Scheduled: {task.scheduled_at}")
            print(f"    Error: {task.error_message[:150] if task.error_message else 'No error message'}")
            print()

asyncio.run(check_failures())
