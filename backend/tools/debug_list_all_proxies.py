
import asyncio
import os
import sys

# Add the current directory to sys.path to ensure 'app' can be imported
sys.path.append(os.getcwd())

from app.db.session import AsyncSessionLocal
from app.models.account import Account
from sqlalchemy import select

async def list_proxies():
    async with AsyncSessionLocal() as session:
        print("Listing accounts and proxies:")
        stmt = select(Account)
        result = await session.execute(stmt)
        accounts = result.scalars().all()
        for acc in accounts:
            print(f"ID: {acc.id} | User: {acc.username} | Proxy: {acc.proxy} | Status: {acc.status}")

if __name__ == "__main__":
    asyncio.run(list_proxies())
