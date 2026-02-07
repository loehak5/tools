import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"
MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def sync_ownership():
    pg_engine = create_async_engine(PG_URL)
    mysql_engine = create_async_engine(MYSQL_URL)
    
    try:
        print("🔍 Reading correct ownership from PostgreSQL...")
        pg_ownership = {}
        async with pg_engine.begin() as conn:
            # We use username as the key because IDs might have shifted if not handled carefully, 
            # though here IDs seem consistent. Let's use username + id for safety.
            res = await conn.execute(text("SELECT id, username, user_id FROM accounts"))
            for r in res.fetchall():
                pg_ownership[r.username] = r.user_id
        
        print(f"📊 Found mapping for {len(pg_ownership)} accounts.")

        print("\n🔍 Updating ownership in MySQL...")
        async with mysql_engine.begin() as conn:
            # First, get current mapping in MySQL to avoid redundant updates
            res = await conn.execute(text("SELECT username, user_id FROM accounts"))
            mysql_current = {r.username: r.user_id for r in res.fetchall()}
            
            updated = 0
            for username, correct_user_id in pg_ownership.items():
                if username in mysql_current and mysql_current[username] != correct_user_id:
                    # Update MySQL
                    await conn.execute(
                        text("UPDATE accounts SET user_id = :user_id WHERE username = :username"),
                        {"user_id": correct_user_id, "username": username}
                    )
                    print(f"   ✅ Fixed: {username} -> UserID {correct_user_id}")
                    updated += 1
            
            print(f"\n✅ Finished! Updated {updated} accounts.")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await pg_engine.dispose()
        await mysql_engine.dispose()

if __name__ == "__main__":
    asyncio.run(sync_ownership())
