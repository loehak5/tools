import sys
import os
import asyncio
from datetime import datetime, timezone
from sqlalchemy import text

# Ensure backend modules can be imported
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import AsyncSessionLocal

async def check_permissions():
    print(f"DEBUG: Starting simple check at {datetime.now()}")
    
    async with AsyncSessionLocal() as session:
        # Use raw SQL to avoid model import issues if any
        # Assuming table is 'tasks'
        
        # Check current DB time
        res_time = await session.execute(text("SELECT NOW();"))
        db_time = res_time.scalar()
        print(f"DB Time: {db_time}")
        print(f"App UTC Time: {datetime.now(timezone.utc)}")

        # Check pending tasks
        res_tasks = await session.execute(text("SELECT id, scheduled_at, status FROM tasks WHERE status = 'pending'"))
        rows = res_tasks.fetchall()
        
        print(f"\nFound {len(rows)} pending tasks:")
        for row in rows:
            t_id, t_sched, t_stat = row
            # t_sched should be datetime
            is_due = t_sched <= datetime.now(timezone.utc)
            print(f"Task {t_id}: {t_sched} (Due? {is_due})")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_permissions())
