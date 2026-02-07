import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"
MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def test():
    print("🔍 Testing PG...")
    try:
        e1 = create_async_engine(PG_URL)
        async with e1.begin() as c:
            await c.execute(text("SELECT 1"))
        print("✅ PG OK")
        await e1.dispose()
    except Exception as e:
        print(f"❌ PG Failed: {e}")

    print("\n🔍 Testing MySQL...")
    try:
        e2 = create_async_engine(MYSQL_URL)
        async with e2.begin() as c:
            await c.execute(text("SELECT 1"))
        print("✅ MySQL OK")
        await e2.dispose()
    except Exception as e:
        print(f"❌ MySQL Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test())
