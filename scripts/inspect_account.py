import asyncio
import os
import sys

# Set environment variables
os.environ['POSTGRES_SERVER'] = 'localhost'
os.environ['POSTGRES_USER'] = 'app_user'
os.environ['POSTGRES_PASSWORD'] = 'app_password'
os.environ['POSTGRES_DB'] = 'ig_automation_db'
os.environ['POSTGRES_PORT'] = '5432'

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import select, desc, text
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from app.models.account import Account

async def get_account_detail():
    async with AsyncSessionLocal() as session:
        # Get one account with many "Session invalid" failures
        res = await session.execute(text("""
            SELECT account_id, count(*) as c 
            FROM tasks 
            WHERE error_message = 'Session invalid' 
            GROUP BY account_id 
            ORDER BY c DESC 
            LIMIT 5
        """))
        worst_accounts = res.all()
        
        for acc_id, count in worst_accounts:
            res_acc = await session.execute(select(Account).where(Account.id == acc_id))
            acc = res_acc.scalars().first()
            print(f"\nANALYZING ACCOUNT: @{acc.username} (ID: {acc.id})")
            print(f"Status: {acc.status}")
            print(f"Last Error: {acc.last_error}")
            
            # Get last 5 tasks
            res_tasks = await session.execute(
                select(Task).where(Task.account_id == acc_id).order_by(desc(Task.id)).limit(10)
            )
            tasks = res_tasks.scalars().all()
            print("Last 10 Tasks:")
            for t in tasks:
                print(f"  ID: {t.id} | Type: {t.task_type} | Status: {t.status} | Error: {t.error_message}")

if __name__ == "__main__":
    asyncio.run(get_account_detail())
