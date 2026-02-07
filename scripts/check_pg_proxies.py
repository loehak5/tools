import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"

async def check_proxies():
    e = create_async_engine(PG_URL)
    async with e.begin() as c:
        res = await c.execute(text("SELECT * FROM proxies LIMIT 1"))
        print(f"Columns in PG 'proxies': {res.keys()}")
    await e.dispose()

if __name__ == "__main__":
    asyncio.run(check_proxies())
