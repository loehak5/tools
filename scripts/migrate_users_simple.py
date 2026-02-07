"""
Direct approach - migrate users via backend DB sessions
Clean version with error handling
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# PostgreSQL (local Docker)
PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"

# MySQL (remote)
# Using the host from .env
MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def migrate():
    print("🔍 Connecting to databases...")
    print(f"   PG: {PG_URL.split('@')[1]}")
    print(f"   MySQL: {MYSQL_URL.split('@')[1]}")
    
    pg_engine = create_async_engine(PG_URL)
    mysql_engine = create_async_engine(MYSQL_URL)
    
    try:
        async with pg_engine.begin() as pg_conn:
            # Fetch users from PostgreSQL
            print("📊 Fetching users from PostgreSQL...")
            result = await pg_conn.execute(text("SELECT * FROM users ORDER BY id"))
            users = result.fetchall()
            print(f"   Found {len(users)} users in PostgreSQL")
            
            if not users:
                print("❌ No users found!")
                return
            
            async with mysql_engine.begin() as mysql_conn:
                # Check existing
                print("🔍 Checking existing users in MySQL...")
                existing_result = await mysql_conn.execute(text("SELECT username FROM users"))
                existing = {row[0] for row in existing_result.fetchall()}
                print(f"   Existing in MySQL: {existing}")
                
                migrated = 0
                for user in users:
                    # user is a Row object, can access by index or name
                    # In SQLAlchemy 2.0 Row objects have attributes if generated from model, 
                    # but here we use text() so it's a mapping row.
                    u_dict = user._asdict()
                    username = u_dict['username']
                    
                    if username in existing:
                        print(f"   ⏭️  Skip: {username}")
                        continue
                    
                    # Insert
                    await mysql_conn.execute(
                        text("""
                            INSERT INTO users (id, username, hashed_password, is_active, created_at, updated_at)
                            VALUES (:id, :username, :hashed_password, :is_active, :created_at, :updated_at)
                        """),
                        u_dict
                    )
                    print(f"   ✅ Migrated: {username} (ID: {u_dict['id']})")
                    migrated += 1
                
                print(f"\n✅ Migration complete! Migrated {migrated} users")
    
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await pg_engine.dispose()
        await mysql_engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
