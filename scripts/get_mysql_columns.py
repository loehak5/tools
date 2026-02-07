import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def check_schema():
    engine = create_async_engine(MYSQL_URL)
    tables = ['users', 'fingerprints', 'accounts', 'proxies', 'tasks']
    
    async with engine.begin() as conn:
        for table in tables:
            print(f"\n--- Columns for {table} ---")
            res = await conn.execute(text(f"SHOW COLUMNS FROM {table}"))
            cols = [r[0] for r in res.fetchall()]
            print(", ".join(cols))
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_schema())
