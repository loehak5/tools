import asyncio
import os
import sys

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import AsyncSessionLocal
from app.models.account import Account
from sqlalchemy import select

async def check_last_login():
    async with AsyncSessionLocal() as db:
        stmt = select(Account.username, Account.last_login).order_by(Account.last_login.desc())
        result = await db.execute(stmt)
        accounts = result.all()
        
        print(f"Total Accounts: {len(accounts)}")
        print("-" * 50)
        print(f"{'Username':<30} | {'Last Login (DB Value)'}")
        print("-" * 50)
        for row in accounts:
            print(f"{row.username:<30} | {row.last_login}")

if __name__ == "__main__":
    asyncio.run(check_last_login())
