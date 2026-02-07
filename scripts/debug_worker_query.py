import sys
import os
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select

# Ensure backend modules can be imported
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import AsyncSessionLocal
from app.models.task import Task

async def debug_worker_query():
    print(f"DEBUG: Simulation started at {datetime.now()}")
    
    async with AsyncSessionLocal() as session:
        # 1. Check current time in UTC
        now_utc = datetime.now(timezone.utc)
        print(f"DEBUG: Current UTC time (timezone-aware): {now_utc}")
        
        # 2. Check all pending tasks without filter
        print("\n--- All Pending Tasks ---")
        stmt_all = select(Task).where(Task.status == "pending")
        result_all = await session.execute(stmt_all)
        all_pending = result_all.scalars().all()
        print(f"Total pending tasks found: {len(all_pending)}")
        
        for t in all_pending:
            scheduled_aware = t.scheduled_at.replace(tzinfo=timezone.utc) if t.scheduled_at.tzinfo is None else t.scheduled_at
            is_due = scheduled_aware <= now_utc
            print(f"ID: {t.id} | Scheduled: {t.scheduled_at} (TzInfo: {t.scheduled_at.tzinfo}) | Is Due? {is_due}")

        # 3. Simulate Worker Query Exactly
        print("\n--- Worker Query Simulation ---")
        # Simulating the exact query from worker.py
        stmt_worker = select(Task).where(
            Task.status == "pending",
            Task.scheduled_at <= now_utc
        )
        try:
            result_worker = await session.execute(stmt_worker)
            tasks_worker = result_worker.scalars().all()
            print(f"Tasks matched by worker query: {len(tasks_worker)}")
            for t in tasks_worker:
                print(f"MATCH: Task {t.id} scheduled at {t.scheduled_at}")
        except Exception as e:
            print(f"ERROR executing worker query: {e}")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(debug_worker_query())
