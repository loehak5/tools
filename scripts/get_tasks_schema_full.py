import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def check_tasks_schema():
    engine = create_async_engine(MYSQL_URL)
    try:
        async with engine.begin() as conn:
            res = await conn.execute(text("SHOW CREATE TABLE tasks"))
            row = res.fetchone()
            if row:
                create_stmt = row[1]
                print("--- START SCHEMA ---")
                print(create_stmt)
                print("--- END SCHEMA ---")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_tasks_schema())
