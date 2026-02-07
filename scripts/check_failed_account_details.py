
import sys
import os
import asyncio

# Set environment variables manually
os.environ["POSTGRES_SERVER"] = "localhost"
os.environ["POSTGRES_USER"] = "app_user"
os.environ["POSTGRES_PASSWORD"] = "app_password"
os.environ["POSTGRES_DB"] = "ig_automation_db"
os.environ["POSTGRES_PORT"] = "5432"

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import AsyncSessionLocal
from app.models.task import Task
from app.models.account import Account
from sqlalchemy import select, desc

async def check_account_details():
    async with AsyncSessionLocal() as session:
        stmt = select(Task, Account).join(Account, Task.account_id == Account.id).where(
            Task.task_type == 'story',
            Task.status == 'failed'
        ).order_by(desc(Task.created_at)).limit(20)
        
        result = await session.execute(stmt)
        rows = result.all()
        
        print(f"Analyzing {len(rows)} failed story tasks...\n")
        
        for task, account in rows:
            print(f"--- Task ID: {task.id} | Account: {account.username} ---")
            print(f"  Status: {account.status}")
            print(f"  Proxy: {account.proxy}")
            print(f"  Has Password: {bool(account.password_encrypted)}")
            print(f"  Has 2FA Seed: {bool(account.seed_2fa)}")
            print(f"  Error: {task.error_message}")
            print("")

if __name__ == "__main__":
    asyncio.run(check_account_details())
