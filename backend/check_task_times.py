"""
Check recent tasks in database to see timezone storage
"""
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from sqlalchemy import select
from datetime import datetime, timezone

async def check_recent_tasks():
    print("=" * 60)
    print("Checking Recent Tasks - Timezone Storage")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        # Get 10 most recent tasks
        stmt = select(Task).order_by(Task.id.desc()).limit(10)
        result = await db.execute(stmt)
        tasks = result.scalars().all()
        
        print(f"\nFound {len(tasks)} recent tasks\n")
        
        now_utc = datetime.now(timezone.utc)
        print(f"Current UTC time: {now_utc}")
        print(f"Current WIB time (UTC+7): {datetime.now()}\n")
        
        for task in tasks:
            print(f"Task ID: {task.id}")
            print(f"  Type: {task.task_type}")
            print(f"  Status: {task.status}")
            print(f"  Scheduled at (stored): {task.scheduled_at}")
            print(f"  Scheduled at (type): {type(task.scheduled_at)}")
            
            # Check if it has timezone info
            if hasattr(task.scheduled_at, 'tzinfo'):
                print(f"  Timezone info: {task.scheduled_at.tzinfo}")
            
            print(f"  Created at: {task.created_at}")
            print()
    
    print("=" * 60)

asyncio.run(check_recent_tasks())
