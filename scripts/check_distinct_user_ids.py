import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def check():
    engine = create_async_engine(MYSQL_URL)
    async with engine.begin() as conn:
        print("--- Accounts user_id check in MySQL ---")
        res = await conn.execute(text("SELECT DISTINCT user_id FROM accounts"))
        for r in res.fetchall():
            print(f"UserID in Accounts: {r[0]}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
