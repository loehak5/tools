import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def check_tasks_schema():
    engine = create_async_engine(MYSQL_URL)
    try:
        async with engine.begin() as conn:
            print("\n--- Detailed Columns for tasks ---")
            res = await conn.execute(text("SHOW FULL COLUMNS FROM tasks"))
            for col in res.fetchall():
                print(col)
                
            print("\n--- Create Table for tasks ---")
            res = await conn.execute(text("SHOW CREATE TABLE tasks"))
            print(res.fetchone()[1])
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_tasks_schema())
