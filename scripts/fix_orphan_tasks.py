import sys
import os
import asyncio

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.db.session import AsyncSessionLocal
from app.models.task import Task
from app.models.task_batch import TaskBatch
from sqlalchemy import select, update
from datetime import datetime

async def fix_orphans():
    async with AsyncSessionLocal() as session:
        # 1. Get all orphan tasks
        stmt = select(Task).where(Task.batch_id == None)
        result = await session.execute(stmt)
        orphans = result.scalars().all()
        
        print(f"Found {len(orphans)} orphan tasks.")
        
        if not orphans:
            return

        # 2. Group by type and created_at hour
        groups = {}
        for t in orphans:
            key = (t.task_type, t.created_at.strftime("%Y-%m-%d %H"))
            if key not in groups:
                groups[key] = []
            groups[key].append(t)
            
        print(f"Formed {len(groups)} retroactive batches.")

        for (t_type, date_hour), g_tasks in groups.items():
            print(f"Processing Batch: {t_type} at {date_hour} ({len(g_tasks)} tasks)")
            
            success_count = len([t for t in g_tasks if t.status == 'completed'])
            failed_count = len([t for t in g_tasks if t.status == 'failed'])
            
            # Create Batch
            batch = TaskBatch(
                task_type=t_type,
                total_count=len(g_tasks),
                success_count=success_count,
                failed_count=failed_count,
                status="completed", # Assume completed if they are old
                created_at=g_tasks[0].created_at,
                started_at=g_tasks[0].created_at,
                completed_at=g_tasks[-1].executed_at or g_tasks[-1].created_at,
                params={"retroactive": True}
            )
            session.add(batch)
            await session.flush() # Get ID
            
            # Link tasks
            batch_id = batch.id
            for t in g_tasks:
                t.batch_id = batch_id
            
            print(f"  -> Created Batch ID {batch_id} with {success_count} success, {failed_count} failed.")

        await session.commit()
        print("\nRetroactive batching completed successfully!")

if __name__ == "__main__":
    asyncio.run(fix_orphans())
