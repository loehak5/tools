import asyncio
import sys
import os
# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.account import Account
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        stmt = select(Account).where(Account.username == "matildaxjones")
        result = await db.execute(stmt)
        account = result.scalars().first()
        if account:
            print(f"ID: {account.id}")
        else:
            print("Account not found")

if __name__ == "__main__":
    asyncio.run(main())
