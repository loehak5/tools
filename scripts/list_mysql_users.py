import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def list_all_users():
    mysql_engine = create_async_engine(MYSQL_URL)
    try:
        async with mysql_engine.begin() as conn:
            res = await conn.execute(text("SELECT id, username, role FROM users"))
            users = res.fetchall()
            print("--- MYSQL Users ---")
            for u in users:
                # user is a Row object
                # Check if 'role' exists in the schema
                print(f"ID: {u[0]}, Username: {u[1]}, Role: {next(iter(u[2:]), 'unknown')}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await mysql_engine.dispose()

if __name__ == "__main__":
    asyncio.run(list_all_users())
