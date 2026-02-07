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
        stmt = select(Account.username, Account.fingerprint_id)
        result = await db.execute(stmt)
        accounts = result.all()
        print("--- Accounts ---")
        for username, fp_id in accounts:
            print(f"User: {username}, FP_ID: {fp_id}")

if __name__ == "__main__":
    asyncio.run(main())
