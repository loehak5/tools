import asyncio
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import AsyncSessionLocal
from app.models.account import Account
from app.models.user import User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        stmt = select(Account).where(Account.username == "matildaxjones")
        result = await db.execute(stmt)
        acc = result.scalars().first()
        if acc:
            print(f"Username: {acc.username}")
            print(f"Status: '{acc.status}'") # Quotes to see whitespace
            print(f"Last Error: {acc.last_error}")
            print(f"Login Method: {acc.login_method}")
        else:
            print("Account not found")

if __name__ == "__main__":
    asyncio.run(main())
