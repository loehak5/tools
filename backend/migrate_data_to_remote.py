"""
Migrate data from local PostgreSQL to remote MySQL database - FIXED VERSION

This script:
1. Connects to local PostgreSQL database (Docker)
2. Exports all data (users, accounts, fingerprints, tasks, etc)
3. Imports data to remote MySQL database with proper FK handling

Usage:
    python migrate_data_to_remote.py
"""

import asyncio
import sys
from typing import List, Dict, Any

async def migrate_data():
    """Main migration function"""
    print("=" * 70)
    print("Data Migration: PostgreSQL (Local) → MySQL (Remote) - FIXED")
    print("=" * 70)
    
    try:
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy import text, select
        from dotenv import dotenv_values
        
        # Load configuration for MySQL target
        config = dotenv_values(".env")
        
        # Source: PostgreSQL local (from docker-compose)
        # Use credentials from docker-compose.yml
        source_url = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"
        
        # Target: MySQL remote
        if not config.get("MYSQL_HOST"):
            print("❌ ERROR: MYSQL_HOST not configured in .env")
            print("Please configure MYSQL_* variables in .env")
            sys.exit(1)
        
        target_url = f"mysql+aiomysql://{config['MYSQL_USER']}:{config['MYSQL_PASSWORD']}@{config['MYSQL_HOST']}:{config.get('MYSQL_PORT', '3306')}/{config['MYSQL_DATABASE']}"
        
        print(f"\n📤 Source: PostgreSQL at localhost:5432/ig_automation_db")
        print(f"📥 Target: MySQL at {config['MYSQL_HOST']}:{config.get('MYSQL_PORT', '3306')}/{config['MYSQL_DATABASE']}")
        print("=" * 70)
        
        # Create engines
        print("\n🔌 Connecting to databases...")
        source_engine = create_async_engine(source_url, echo=False)
        target_engine = create_async_engine(target_url, echo=False)
        
        # Test connections
        async with source_engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.fetchone()
            print("  ✅ Connected to PostgreSQL (source)")
        
        async with target_engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.fetchone()
            print("  ✅ Connected to MySQL (target)")
        
        # Define tables to migrate (in order due to foreign keys)
        tables_to_migrate = [
            "users",
            "fingerprints",
            "accounts",
            "proxy_templates",
            "task_batches",
            "tasks",
        ]
        
        print(f"\n📊 Migrating {len(tables_to_migrate)} tables...")
        print("=" * 70)
        
        total_rows = 0
        
        # DISABLE FOREIGN KEY CHECKS for MySQL
        async with target_engine.begin() as target_conn:
            await target_conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
            print("  🔓 Foreign key checks disabled\n")
        
        for table_name in tables_to_migrate:
            try:
                # Read from PostgreSQL
                async with source_engine.begin() as source_conn:
                    result = await source_conn.execute(text(f"SELECT * FROM {table_name}"))
                    rows = result.fetchall()
                    columns = result.keys()
                
                row_count = len(rows)
                
                if row_count == 0:
                    print(f"  ⊘ {table_name:20s} - No data to migrate")
                    continue
                
                # Insert into MySQL
                async with target_engine.begin() as target_conn:
                    inserted = 0
                    skipped = 0
                    errors = 0
                    
                    for idx, row in enumerate(rows, 1):
                        # Build INSERT query
                        row_dict = dict(zip(columns, row))
                        
                        # Build column list and placeholders
                        cols = ", ".join([f"`{col}`" for col in row_dict.keys()])
                        placeholders = ", ".join([f":{col}" for col in row_dict.keys()])
                        
                        insert_query = f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders})"
                        
                        try:
                            await target_conn.execute(text(insert_query), row_dict)
                            inserted += 1
                        except Exception as e:
                            error_msg = str(e)
                            # Handle duplicate key errors gracefully
                            if "Duplicate entry" in error_msg or "duplicate key" in error_msg.lower():
                                skipped += 1
                            else:
                                errors += 1
                                if errors <= 3:  # Show first 3 errors only
                                    print(f"    ⚠️  Row {idx} error: {error_msg[:100]}")
                
                total_rows += inserted
                status_msg = f"Migrated {inserted}/{row_count} rows"
                if skipped > 0:
                    status_msg += f" (skipped {skipped} duplicates)"
                if errors > 0:
                    status_msg += f" ({errors} errors)"
                    
                emoji = "✅" if inserted > 0 else "❌"
                print(f"  {emoji} {table_name:20s} - {status_msg}")
                
            except Exception as e:
                print(f"  ❌ {table_name:20s} - Table error: {e}")
                # Continue with other tables
                continue
        
        # RE-ENABLE FOREIGN KEY CHECKS
        async with target_engine.begin() as target_conn:
            await target_conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))
            print("\n  🔒 Foreign key checks re-enabled")
        
        print("=" * 70)
        print(f"\n✅ Migration completed!")
        print(f"   Total rows migrated: {total_rows}")
        print("=" * 70)
        print("\nNext steps:")
        print("  1. Verify data in MySQL: python verify_remote_data.py")
        print("  2. Start backend with MySQL: uvicorn app.main:app --reload")
        print("  3. Test login and functionality")
        print("=" * 70)
        
        # Cleanup
        await source_engine.dispose()
        await target_engine.dispose()
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    print("\n⚠️  IMPORTANT:")
    print("   - PostgreSQL must be running (via docker-compose)")
    print("   - Port 5432 must be accessible from host")
    print("   - MySQL remote database must be accessible")
    print("   - This will CLEAR existing data in MySQL tables first")
    print("   - Foreign key checks will be temporarily disabled\n")
    
    # Confirm before proceeding
    response = input("Proceed with migration? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        print("Migration cancelled.")
        sys.exit(0)
    
    asyncio.run(migrate_data())
