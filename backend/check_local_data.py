"""
Check if local PostgreSQL database has data to migrate
"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_local_data():
    print("=" * 60)
    print("Checking Local PostgreSQL Database")
    print("=" * 60)
    
    # Try from docker-compose credentials
    db_urls = [
        ("Docker PostgreSQL", "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"),
        ("Docker PostgreSQL (alt)", "postgresql+asyncpg://postgres:postgres@localhost:5432/instagram_automation"),
    ]
    
    for db_name, db_url in db_urls:
        try:
            print(f"\n🔍 Trying: {db_name}")
            engine = create_async_engine(db_url, echo=False)
            
            async with engine.begin() as conn:
                # Test connection
                result = await conn.execute(text("SELECT 1"))
                result.fetchone()
                print(f"  ✅ Connection successful!")
                
                # Check tables
                result = await conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    ORDER BY table_name
                """))
                tables = result.fetchall()
                
                if not tables:
                    print(f"  ⊘ No tables found")
                    await engine.dispose()
                    continue
                
                print(f"\n  📊 Tables found ({len(tables)}):")
                total_rows = 0
                
                for (table_name,) in tables:
                    try:
                        result = await conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                        count = result.scalar()
                        total_rows += count
                        status = "✅" if count > 0 else "  "
                        print(f"    {status} {table_name:20s}: {count:5d} rows")
                    except Exception as e:
                        print(f"       {table_name:20s}: Error - {e}")
                
                print(f"\n  📈 Total rows: {total_rows}")
                
                if total_rows > 0:
                    print(f"\n  ✅ DATABASE HAS DATA!")
                    print(f"     Use this connection for migration:")
                    print(f"     {db_url}")
                else:
                    print(f"\n  ⊘ Database is empty")
                
            await engine.dispose()
            break  # Success, no need to try other URLs
            
        except Exception as e:
            print(f"  ❌ Failed: {e}")
            continue
    
    print("=" * 60)

asyncio.run(check_local_data())
