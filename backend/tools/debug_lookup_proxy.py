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
    username = "lynesabby"
    async with AsyncSessionLocal() as db:
        stmt = select(Account).where(Account.username == username)
        result = await db.execute(stmt)
        account = result.scalars().first()
        
        if account:
            print(f"Account: {account.username}")
            print(f"Proxy: {account.proxy}")
            print(f"Status: {account.status}")
            print(f"Last Error: {account.last_error}")
        else:
            print(f"Account {username} not found in DB")

if __name__ == "__main__":
    asyncio.run(main())
