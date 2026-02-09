import asyncio
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from sqlalchemy import select, func

async def check_recent_tasks():
    async with AsyncSessionLocal() as db:
        # Count tasks per user and status
        stmt = select(Task.user_id, Task.status, func.count(Task.id)).group_by(Task.user_id, Task.status)
        result = await db.execute(stmt)
        stats = result.all()
        print("--- TASK STATS BY USER ---")
        for user_id, status, count in stats:
            print(f"User ID: {user_id} | Status: {status} | Count: {count}")

        # Check most recent tasks
        print("\n--- RECENT TASKS (Last 10) ---")
        stmt_recent = select(Task).order_by(Task.created_at.desc()).limit(10)
        result_recent = await db.execute(stmt_recent)
        tasks = result_recent.scalars().all()
        for t in tasks:
            print(f"ID: {t.id} | User ID: {t.user_id} | Account ID: {t.account_id} | Type: {t.task_type} | Created: {t.created_at}")

asyncio.run(check_recent_tasks())
