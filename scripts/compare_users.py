import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"
MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def list_users_both():
    pg_engine = create_async_engine(PG_URL)
    mysql_engine = create_async_engine(MYSQL_URL)
    
    try:
        print("\n--- POSTGRESQL (Local) Users ---")
        async with pg_engine.begin() as conn:
            res = await conn.execute(text("SELECT id, username, role FROM users ORDER BY id"))
            for r in res.fetchall():
                print(f"PG:  {r[1]} (ID: {r[0]}, Role: {r[2]})")

        print("\n--- MYSQL (Remote) Users ---")
        async with mysql_engine.begin() as conn:
            res = await conn.execute(text("SELECT id, username, role FROM users ORDER BY id"))
            for r in res.fetchall():
                print(f"MS:  {r[1]} (ID: {r[0]}, Role: {r[2]})")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await pg_engine.dispose()
        await mysql_engine.dispose()

if __name__ == "__main__":
    asyncio.run(list_users_both())
