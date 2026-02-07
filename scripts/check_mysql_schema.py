import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def check_schema():
    engine = create_async_engine(MYSQL_URL)
    tables = ['users', 'fingerprints', 'accounts', 'proxies', 'tasks']
    
    try:
        async with engine.begin() as conn:
            for table in tables:
                print(f"\n--- Table: {table} ---")
                res = await conn.execute(text(f"DESCRIBE {table}"))
                for col in res.fetchall():
                    print(f"Col: {col[0]}, Type: {col[1]}, Null: {col[2]}, Key: {col[3]}, Default: {col[4]}, Extra: {col[5]}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_schema())
