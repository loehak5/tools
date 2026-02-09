"""
Check if there are pending tasks that should have been executed
"""
import asyncio
from datetime import datetime, timezone
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from sqlalchemy import select

async def check_pending_tasks():
    print("=" * 60)
    print("Checking Pending Tasks vs Current Time")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        print(f"\nCurrent UTC time: {now}")
        print(f"Current WIB time (UTC+7): ~{now.hour + 7}:{now.minute:02d}\n")
        
        # Get all pending tasks
        stmt = select(Task).where(Task.status == "pending").order_by(Task.scheduled_at)
        result = await db.execute(stmt)
        tasks = result.scalars().all()
        
        print(f"Found {len(tasks)} PENDING tasks\n")
        
        overdue_count = 0
        for task in tasks[:20]:  # Show first 20
            scheduled_utc = task.scheduled_at
            # Ensure scheduled_utc is timezone-aware
            if scheduled_utc.tzinfo is None:
                from zoneinfo import ZoneInfo
                scheduled_utc = scheduled_utc.replace(tzinfo=timezone.utc)
            
            is_overdue = scheduled_utc <= now
            
            if is_overdue:
                overdue_count += 1
                
            print(f"Task ID: {task.id}")
            print(f"  Type: {task.task_type}")
            print(f"  Account: {task.account_id}")
            print(f"  Scheduled (UTC): {scheduled_utc}")
            print(f"  Overdue: {'YES ⚠️' if is_overdue else 'NO'}")
            print(f"  Time diff: {(now - scheduled_utc).total_seconds():.0f} seconds")
            print()
        
        print(f"\n{'='*60}")
        print(f"Summary: {overdue_count} tasks are OVERDUE and should have executed!")
        print(f"{'='*60}")

asyncio.run(check_pending_tasks())
