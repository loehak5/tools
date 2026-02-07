"""
Verify migrated data in MySQL remote database
Show row counts for all tables
"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import dotenv_values

async def verify_migrated_data():
    config = dotenv_values(".env")
    
    if not config.get("MYSQL_HOST"):
        print("❌ ERROR: MYSQL_HOST not configured")
        return
    
    db_url = f"mysql+aiomysql://{config['MYSQL_USER']}:{config['MYSQL_PASSWORD']}@{config['MYSQL_HOST']}:{config.get('MYSQL_PORT', '3306')}/{config['MYSQL_DATABASE']}"
    
    engine = create_async_engine(db_url, echo=False)
    
    print("=" * 70)
    print(f"MySQL Remote Database: {config['MYSQL_HOST']}/{config['MYSQL_DATABASE']}")
    print("=" * 70)
    
    async with engine.begin() as conn:
        # Get all tables
        result = await conn.execute(text("SHOW TABLES"))
        tables = [row[0] for row in result.fetchall()]
        
        print(f"\n📊 Data Summary:\n")
        total_rows = 0
        
        for table in sorted(tables):
            result = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            total_rows += count
            
            status = "✅" if count > 0 else "  "
            print(f"  {status} {table:20s}: {count:5d} rows")
        
        print(f"\n{'=' * 70}")
        print(f"Total tables: {len(tables)}")
        print(f"Total rows:   {total_rows}")
        print(f"{'=' * 70}")
        
        if total_rows > 0:
            print("\n✅ Migration successful! Database has data.")
        else:
            print("\n⚠️  Database is empty. Run migration script first.")
    
    await engine.dispose()

asyncio.run(verify_migrated_data())
