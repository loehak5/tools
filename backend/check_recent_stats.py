import asyncio
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone

async def check_stats():
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        ten_mins_ago = now - timedelta(minutes=10)
        
        stmt = select(Task.status, func.count(Task.id)).group_by(Task.status)
        result = await db.execute(stmt)
        stats = result.all()
        
        print("\n" + "="*50)
        print("TASK STATUS OVERALL")
        print("="*50)
        for status, count in stats:
            print(f"{status:15} : {count}")
            
        print("\n" + "="*50)
        print("RECENT ACTIVITY (Last 5 minutes)")
        print("="*50)
        
        # Check active or recently completed/failed tasks
        five_mins_ago = now - timedelta(minutes=5)
        stmt_recent = select(Task).where(Task.created_at >= five_mins_ago).order_by(Task.created_at.desc())
        result_recent = await db.execute(stmt_recent)
        tasks = result_recent.scalars().all()
        
        if not tasks:
            print("No tasks created in the last 5 minutes.")
        else:
            for task in tasks:
                print(f"Task #{task.id} | {task.task_type:10} | {task.status:10} | Err: {task.error_message[:50] if task.error_message else 'None'}")

asyncio.run(check_stats())
