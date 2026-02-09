import asyncio
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from sqlalchemy import select

async def check_failed_tasks():
    async with AsyncSessionLocal() as db:
        stmt = select(Task).where(Task.status == "failed").limit(5)
        result = await db.execute(stmt)
        tasks = result.scalars().all()
        print("--- FAILED TASKS ---")
        for t in tasks:
            print(f"ID: {t.id} | Type: {t.task_type} | Error: {t.error_message}")

if __name__ == "__main__":
    asyncio.run(check_failed_tasks())
