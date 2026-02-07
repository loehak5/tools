import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, desc, text
from app.db.session import engine
from app.models.account import Account, Fingerprint
from app.models.task import Task
from app.models.task_batch import TaskBatch
from app.models.base import Base # metadata

async def check_failed_tasks():
    async with engine.connect() as conn:
        # Get status counts
        res = await conn.execute(text("SELECT status, count(*) FROM tasks GROUP BY status"))
        counts = res.all()
        print(f"Task status summary: {dict(counts)}")

        # Get the latest 20 failed tasks
        stmt = select(Task).where(Task.status == 'failed').order_by(desc(Task.executed_at)).limit(20)
        result = await conn.execute(stmt)
        tasks = result.all()
        
        print(f"Latest 20 failed tasks:")
        for t in tasks:
             # id: 0, account_id: 1, batch_id: 2, task_type: 3, params: 4, scheduled_at: 5, executed_at: 6, status: 7, error_message: 8
             print(f"Task ID: {t[0]} | Type: {t[3]} | Error: {t[8]}")

if __name__ == "__main__":
    asyncio.run(check_failed_tasks())
