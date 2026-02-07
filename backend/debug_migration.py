"""
Debug migration - check what went wrong
"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import dotenv_values

async def debug_migration():
    print("=" * 70)
    print("Debug: Checking Migration Status")
    print("=" * 70)
    
    config = dotenv_values(".env")
    
    # Source PostgreSQL
    source_url = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"
    
    # Target MySQL
    target_url = f"mysql+aiomysql://{config['MYSQL_USER']}:{config['MYSQL_PASSWORD']}@{config['MYSQL_HOST']}:{config.get('MYSQL_PORT', '3306')}/{config['MYSQL_DATABASE']}"
    
    print("\n🔍 Checking source (PostgreSQL)...")
    source_engine = create_async_engine(source_url, echo=False)
    
    async with source_engine.begin() as conn:
        tables = ["users", "fingerprints", "accounts", "proxy_templates", "task_batches", "tasks"]
        
        for table in tables:
            try:
                result = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                print(f"  {table:20s}: {count:5d} rows")
            except Exception as e:
                print(f"  {table:20s}: ERROR - {e}")
    
    await source_engine.dispose()
    
    print("\n🔍 Checking target (MySQL)...")
    target_engine = create_async_engine(target_url, echo=False)
    
    async with target_engine.begin() as conn:
        tables = ["users", "fingerprints", "accounts", "proxy_templates", "task_batches", "tasks"]
        
        for table in tables:
            try:
                result = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                status = "✅" if count > 0 else "❌"
                print(f"  {status} {table:20s}: {count:5d} rows")
            except Exception as e:
                print(f"  ❌ {table:20s}: ERROR - {e}")
    
    await target_engine.dispose()
    
    print("\n" + "=" * 70)

asyncio.run(debug_migration())
