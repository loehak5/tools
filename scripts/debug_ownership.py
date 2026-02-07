import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"
MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def debug_ownership():
    pg_engine = create_async_engine(PG_URL)
    mysql_engine = create_async_engine(MYSQL_URL)
    
    try:
        print("--- POSTGRESQL (Local) ---")
        async with pg_engine.begin() as conn:
            # Users
            res = await conn.execute(text("SELECT id, username FROM users"))
            pg_users = res.fetchall()
            for u in pg_users:
                # Accounts count for this user
                cnt = await conn.execute(text(f"SELECT COUNT(*) FROM accounts WHERE user_id = {u.id}"))
                print(f"User: {u.username} (ID: {u.id}) owns {cnt.scalar()} accounts")

        print("\n--- MYSQL (Remote) ---")
        async with mysql_engine.begin() as conn:
            # Users
            res = await conn.execute(text("SELECT id, username FROM users"))
            ms_users = res.fetchall()
            for u in ms_users:
                # Accounts count for this user
                cnt = await conn.execute(text(f"SELECT COUNT(*) FROM accounts WHERE user_id = {u.id}"))
                print(f"User: {u.username} (ID: {u.id}) owns {cnt.scalar()} accounts")
            
            # Check for accounts with NO user_id or non-existent user_id
            cnt_none = await conn.execute(text("SELECT COUNT(*) FROM accounts WHERE user_id IS NULL"))
            print(f"Accounts with NULL user_id: {cnt_none.scalar()}")
            
            # Check for any logged in user that isn't Bagong99
            # The user screenshot showed "Anak ngent"
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await pg_engine.dispose()
        await mysql_engine.dispose()

if __name__ == "__main__":
    asyncio.run(debug_ownership())
