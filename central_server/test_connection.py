import asyncio
import sys

async def test_connection():
    try:
        # Import INSIDE async function to avoid event loop issues
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        from app.core.config import settings
        
        database_url = settings.get_database_url()
        
        # Convert to async version
        if database_url.startswith("sqlite"):
            database_url = database_url.replace("sqlite:///", "sqlite+aiosqlite:///")
        elif database_url.startswith("mysql://"):
            database_url = database_url.replace("mysql://", "mysql+aiomysql://")
        
        print(f"Testing connection to: {database_url.split('@')[-1] if '@' in database_url else database_url}")
        
        engine = create_async_engine(database_url, echo=False)
        
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            row = result.fetchone()
            print("✅ Connection successful!")
            print(f"Result: {row}")
            
        await engine.dispose()
        
    except Exception as e:
        print(f"❌ Connection failed!")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_connection())
