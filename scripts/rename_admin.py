import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def rename_user():
    engine = create_async_engine(MYSQL_URL)
    async with engine.begin() as conn:
        print("🔍 Renaming user ID 1 to 'Anak ngent' for consistency...")
        await conn.execute(text("UPDATE users SET username = 'Anak ngent' WHERE id = 1"))
        print("✅ Done.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(rename_user())
