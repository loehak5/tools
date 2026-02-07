import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"

async def audit():
    e_pg = create_async_engine(PG_URL)
    async with e_pg.begin() as c:
        res = await c.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        pg_tables = [r[0] for r in res.fetchall()]
        # Print one by one to avoid truncation issues
        print("PG_TABLES_START")
        for t in pg_tables:
            print(f"TABLE: {t}")
        print("PG_TABLES_END")
    await e_pg.dispose()

if __name__ == "__main__":
    asyncio.run(audit())
