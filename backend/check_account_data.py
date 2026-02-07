import asyncio
from app.db.session import SessionLocal
from app.models.account import Account
from sqlalchemy import select

async def check_accounts():
    async with SessionLocal() as db:
        result = await db.execute(select(Account))
        accounts = result.scalars().all()
        print(f'Total accounts: {len(accounts)}')
        for acc in accounts[:5]:
            print(f'  - {acc.username} (ID: {acc.id})')

asyncio.run(check_accounts())
