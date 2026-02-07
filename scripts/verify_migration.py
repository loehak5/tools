import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def verify():
    engine = create_async_engine(MYSQL_URL)
    async with engine.begin() as conn:
        print("🔍 Checking users...")
        res_users = await conn.execute(text("SELECT id, username FROM users"))
        for row in res_users.fetchall():
            print(f"   User: {row[1]} (ID: {row[0]})")
            
        print("\n🔍 Checking accounts ownership...")
        res_counts = await conn.execute(text("SELECT user_id, COUNT(*) FROM accounts GROUP BY user_id"))
        for row in res_counts.fetchall():
            print(f"   User ID {row[0]} owns {row[1]} accounts")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verify())
