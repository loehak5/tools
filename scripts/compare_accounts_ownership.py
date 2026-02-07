import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"
MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def check_comparative():
    pg_engine = create_async_engine(PG_URL)
    mysql_engine = create_async_engine(MYSQL_URL)
    
    try:
        print("--- Account 154 and 158 comparison ---")
        async with pg_engine.begin() as conn:
            res = await conn.execute(text("SELECT id, username, user_id FROM accounts WHERE id IN (154, 158)"))
            for r in res.fetchall():
                print(f"PG: ID {r.id}, Username {r.username}, UserID {r.user_id}")

        async with mysql_engine.begin() as conn:
            res = await conn.execute(text("SELECT id, username, user_id FROM accounts WHERE id IN (154, 158)"))
            for r in res.fetchall():
                print(f"MS: ID {r.id}, Username {r.username}, UserID {r.user_id}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await pg_engine.dispose()
        await mysql_engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_comparative())
