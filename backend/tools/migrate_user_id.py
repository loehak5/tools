import asyncio
import os
from dotenv import load_dotenv
import asyncpg

# Load environment variables
base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base_dir, ".env"))

async def migrate():
    print("Starting migration...")
    
    # Get database connection details from environment
    try:
        conn = await asyncpg.connect(
            host=os.getenv("POSTGRES_SERVER", "localhost"),
            port=int(os.getenv("POSTGRES_PORT", "5432")),
            user=os.getenv("POSTGRES_USER"),
            password=os.getenv("POSTGRES_PASSWORD"),
            database=os.getenv("POSTGRES_DB")
        )
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        return

    tables = ['accounts', 'tasks', 'proxy_templates', 'fingerprints', 'task_batches']
    
    try:
        for table in tables:
            # Check if column exists
            result = await conn.fetch(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '{table}' AND column_name = 'user_id'
            """)
            
            if not result:
                print(f"Adding user_id column to {table} table...")
                # First add column nullable
                await conn.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER REFERENCES users(id)")
                print(f"Column added to {table} successfully!")
            else:
                print(f"Column user_id already exists in {table}")

        # Optional: Set existing data to the first admin user if available
        # Find first admin or first user
        users = await conn.fetch("SELECT id FROM users ORDER BY id LIMIT 1")
        if users:
            first_user_id = users[0]['id']
            for table in tables:
                print(f"Assigning existing {table} current data to user_id {first_user_id}...")
                await conn.execute(f"UPDATE {table} SET user_id = {first_user_id} WHERE user_id IS NULL")
        
        print("Migration completed successfully!")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(migrate())
