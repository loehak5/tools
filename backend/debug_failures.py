import asyncio
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from app.models.account import Account
from sqlalchemy import select

async def check_failures():
    async with AsyncSessionLocal() as db:
        # Get recent failed tasks
        stmt = select(Task).where(Task.status == "failed").order_by(Task.created_at.desc()).limit(10)
        result = await db.execute(stmt)
        tasks = result.scalars().all()
        
        print("\n" + "="*80)
        print("ANALYSIS OF RECENT FAILED TASKS")
        print("="*80 + "\n")
        
        if not tasks:
            print("No failed tasks found.")
            return

        for i, task in enumerate(tasks, 1):
            # Try to get account info manually to be safe
            acc_stmt = select(Account).where(Account.id == task.account_id)
            acc_result = await db.execute(acc_stmt)
            account = acc_result.scalar_one_or_none()
            username = account.username if account else "Unknown"
            acc_status = account.status if account else "Unknown"

            print(f"[{i}] Task ID: {task.id} | Type: {task.task_type}")
            print(f"    Account: @{username} (Status: {acc_status})")
            print(f"    Created: {task.created_at}")
            print(f"    Scheduled: {task.scheduled_at}")
            print(f"    Error Message:")
            print(f"    ---")
            print(f"    {task.error_message or 'EMPTY ERROR MESSAGE'}")
            print(f"    ---")
            print("-" * 40)

asyncio.run(check_failures())
