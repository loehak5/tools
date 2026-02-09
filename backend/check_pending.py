import asyncio
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from sqlalchemy import select
from datetime import datetime, timezone

async def check_pending():
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        stmt = select(Task).where(Task.status == "pending").order_by(Task.scheduled_at.asc())
        result = await db.execute(stmt)
        tasks = result.scalars().all()
        
        print("\n" + "="*50)
        print("NEXT 10 PENDING TASKS")
        print("="*50)
        
        if not tasks:
            print("No pending tasks.")
        else:
            for task in tasks[:10]:
                # Ensure scheduled_at is aware for comparison
                sched_at = task.scheduled_at
                if sched_at.tzinfo is None:
                    sched_at = sched_at.replace(tzinfo=timezone.utc)
                    
                is_due = sched_at <= now
                due_str = "DUE NOW/OVERDUE" if is_due else f"Future (at {task.scheduled_at})"
                print(f"Task #{task.id} | {task.task_type:10} | {due_str}")

asyncio.run(check_pending())
