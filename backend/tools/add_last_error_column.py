"""Migration script to add last_error column to accounts table"""
import asyncio
import os
from dotenv import load_dotenv
import asyncpg

# Load environment variables
load_dotenv()

async def migrate():
    # Get database connection details from environment
    conn = await asyncpg.connect(
        host=os.getenv("POSTGRES_SERVER", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        database=os.getenv("POSTGRES_DB")
    )
    
    try:
        # Check if column exists
        result = await conn.fetch("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'accounts' AND column_name = 'last_error'
        """)
        
        if not result:
            print("Adding last_error column to accounts table...")
            await conn.execute("ALTER TABLE accounts ADD COLUMN last_error VARCHAR")
            print("Column added successfully!")
        else:
            print("Column last_error already exists")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(migrate())
