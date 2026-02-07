import asyncio
from app.db.session import AsyncSessionLocal
from app.models.account import Account
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Account).where(Account.username == 'Amandine.Manoury').order_by(Account.id.desc()))
        account = res.scalars().first()
        with open("proxy_status.txt", "w") as f:
            if account:
                f.write(f"ID: {account.id} | User: '{account.username}' | Proxy: '{account.proxy}' | Status: '{account.status}'\n")
            else:
                f.write("User not found\n")

if __name__ == "__main__":
    asyncio.run(check())
