"""
Migrate users from PostgreSQL (local Docker) to MySQL (remote)
"""
import asyncio
import asyncpg
import aiomysql
from datetime import datetime

# PostgreSQL (source - local Docker)
PG_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'ig_automation_db',
   'user': 'postgres',
    'password': 'app_password'
}

# MySQL (target - remote)
MYSQL_CONFIG = {
    'host': 'insta-manager.mysql.database.azure.com',
    'port': 3306,
    'db': 'insta-manager',
    'user': 'insta-manager',
    'password': 'XLph5w84m4eBB6Te'
}

async def migrate_users():
    print("🔍 Connecting to PostgreSQL (source)...")
    pg_conn = await asyncpg.connect(**PG_CONFIG)
    
    print("🔍 Connecting to MySQL (target)...")
    mysql_conn = await aiomysql.connect(**MYSQL_CONFIG)
    mysql_cursor = mysql_conn.cursor()
    
    try:
        # Fetch all users from PostgreSQL
        print("\n📊 Fetching users from PostgreSQL...")
        users = await pg_conn.fetch("SELECT * FROM users ORDER BY id")
        print(f"   Found {len(users)} users")
        
        # Check existing users in MySQL
        await mysql_cursor.execute("SELECT username FROM users")
        existing_users = {row[0] for row in await mysql_cursor.fetchall()}
        print(f"   Existing users in MySQL: {existing_users}")
        
        # Migrate each user
        migrated = 0
        skipped = 0
        
        for user in users:
            username = user['username']
            
            if username in existing_users:
                print(f"   ⏭️  Skipping {username} (already exists)")
                skipped += 1
                continue
            
            # Insert user into MySQL
            query = """
                INSERT INTO users (
                    id, username, hashed_password, is_active, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """
            
            values = (
                user['id'],
                user['username'],
                user['hashed_password'],
                user['is_active'],
                user['created_at'],
                user['updated_at']
            )
            
            await mysql_cursor.execute(query, values)
            print(f"   ✅ Migrated user: {username} (ID: {user['id']})")
            migrated += 1
        
        # Commit transaction
        await mysql_conn.commit()
        
        print(f"\n✅ Migration complete!")
        print(f"   Migrated: {migrated} users")
        print(f"   Skipped: {skipped} users")
        
    finally:
        await pg_conn.close()
        await mysql_cursor.close()
        mysql_conn.close()

if __name__ == "__main__":
    asyncio.run(migrate_users())
