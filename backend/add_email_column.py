import asyncio
from sqlalchemy import text
from app.db.session import engine

async def add_email_google_columns():
    async with engine.begin() as conn:
        print("Checking for email and google_id columns in users table...")
        
        # Check if columns exist
        result = await conn.execute(text("SHOW COLUMNS FROM users LIKE 'email'"))
        if not result.first():
            print("Adding 'email' column...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE DEFAULT NULL"))
        else:
            print("'email' column already exists.")

        result = await conn.execute(text("SHOW COLUMNS FROM users LIKE 'google_id'"))
        if not result.first():
            print("Adding 'google_id' column...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE DEFAULT NULL"))
        else:
            print("'google_id' column already exists.")

        print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(add_email_google_columns())
