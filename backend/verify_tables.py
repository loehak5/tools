"""
Verify all backend tables exist in database
"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import dotenv_values

async def verify_tables():
    config = dotenv_values(".env")
    
    if config.get("MYSQL_HOST"):
        db_url = f"mysql+aiomysql://{config['MYSQL_USER']}:{config['MYSQL_PASSWORD']}@{config['MYSQL_HOST']}:{config.get('MYSQL_PORT', '3306')}/{config['MYSQL_DATABASE']}"
    else:
        db_url = "sqlite+aiosqlite:///./backend.db"
    
    engine = create_async_engine(db_url, echo=False)
    
    async with engine.begin() as conn:
        result = await conn.execute(text("SHOW TABLES"))
        tables = result.fetchall()
        
        print("=" * 60)
        print("Backend Tables in Database:")
        print("=" * 60)
        for table in tables:
            print(f"  ✅ {table[0]}")
        
        print(f"\n✅ Total: {len(tables)} tables found")
        print("=" * 60)
    
    await engine.dispose()

asyncio.run(verify_tables())
