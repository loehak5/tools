
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.account import Account
from sqlalchemy import select

async def check_accounts():
    async with AsyncSessionLocal() as session:
        usernames = ['GalvionaffViaffValencia', 'FavishaffViaffOphelia', 'QavieraffViaffJulietta', 'CavishaffViaffOphelia', 'ZivishaffViaffTheodora']
        print(f"Checking details for: {usernames}")
        stmt = select(Account).where(Account.username.in_(usernames))
        result = await session.execute(stmt)
        accounts = result.scalars().all()
        for acc in accounts:
            print(f"Username: {acc.username}")
            print(f"  Proxy: {acc.proxy}")
            print(f"  Status: {acc.status}")
            print(f"  Last Error: {acc.last_error}")
            print("-" * 20)

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(check_accounts())
