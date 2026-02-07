import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from datetime import datetime, timedelta

# Directly using the credentials from .env
DB_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"

async def fix():
    print(f"Connecting to {DB_URL}...")
    engine = create_async_engine(DB_URL)
    async with engine.begin() as conn:
        threshold = datetime.utcnow() - timedelta(minutes=5)
        stmt = text("""
            UPDATE tasks 
            SET status = 'pending', error_message = 'Reset by developer to fix bottleneck' 
            WHERE status = 'running' OR (status = 'pending' AND scheduled_at <= :now)
        """)
        # Actually, let's just reset all 'running' ones. 
        # And let the new worker pick up all 'pending' ones that are due.
        
        stmt = text("UPDATE tasks SET status = 'pending' WHERE status = 'running'")
        result = await conn.execute(stmt)
        print(f"Done. Reset {result.rowcount} tasks from 'running' to 'pending'.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix())
