import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"
MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def audit():
    e_pg = create_async_engine(PG_URL)
    e_ms = create_async_engine(MYSQL_URL)
    
    async with e_pg.begin() as c:
        res = await c.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        pg_tables = [r[0] for r in res.fetchall()]
        print(f"PG Tables: {pg_tables}")

    async with e_ms.begin() as c:
        res = await c.execute(text("SHOW TABLES"))
        ms_tables = [r[0] for r in res.fetchall()]
        print(f"MySQL Tables: {ms_tables}")
        
    await e_pg.dispose()
    await e_ms.dispose()

if __name__ == "__main__":
    asyncio.run(audit())
