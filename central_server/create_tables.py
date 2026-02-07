"""
Direct database table creation - bypassing all app imports to avoid event loop conflicts
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def create_tables():
    print("=" * 60)
    print("Central Server - Database Table Creation")
    print("=" * 60)
    
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import MetaData, Table, Column, Integer, String, Boolean, DateTime, JSON, Date, ForeignKey, text
        from sqlalchemy.sql import func
        from dotenv import dotenv_values
        
        # Load .env manually
        config = dotenv_values(".env")
        
        # Build database URL
        if config.get("MYSQL_HOST"):
            db_url = f"mysql+aiomysql://{config['MYSQL_USER']}:{config['MYSQL_PASSWORD']}@{config['MYSQL_HOST']}:{config.get('MYSQL_PORT', '3306')}/{config['MYSQL_DATABASE']}"
        else:
            db_url = "sqlite+aiosqlite:///./central_server.db"
        
        print(f"Database: {db_url.split('@')[-1] if '@' in db_url else db_url}")
        print("=" * 60)
        
        # Create engine
        engine = create_async_engine(db_url, echo=False)
        
        # Define metadata
        metadata = MetaData()
        
        # Define clients table
        clients = Table(
            'clients', metadata,
            Column('id', Integer, primary_key=True),
            Column('client_name', String(255), unique=True, nullable=False, index=True),
            Column('company_name', String(255)),
            Column('email', String(255)),
            Column('phone', String(50)),
            Column('hashed_password', String(255), nullable=False),
            Column('api_key', String(255), unique=True, nullable=False, index=True),
            Column('current_session_id', String(255), index=True),
            Column('current_device_info', JSON),
            Column('session_started_at', DateTime(timezone=True)),
            Column('is_active', Boolean, default=True, index=True),
            Column('license_type', String(50)),
            Column('license_start', DateTime(timezone=True)),
            Column('license_end', DateTime(timezone=True)),
            Column('max_accounts', Integer, default=100),
            Column('max_proxies', Integer, default=50),
            Column('created_at', DateTime(timezone=True), server_default=func.now()),
            Column('last_active', DateTime(timezone=True)),
            Column('last_ip', String(50)),
            Column('notes', String(500)),
        )
        
        # Define activity_logs table
        activity_logs = Table(
            'activity_logs', metadata,
            Column('id', Integer, primary_key=True),
            Column('client_id', Integer, ForeignKey('clients.id'), nullable=False, index=True),
            Column('activity_type', String(100), nullable=False, index=True),
            Column('activity_data', JSON),
            Column('total_accounts', Integer),
            Column('active_accounts', Integer),
            Column('total_proxies', Integer),
            Column('timestamp', DateTime(timezone=True), server_default=func.now(), index=True),
            Column('ip_address', String(50)),
        )
        
        # Define usage_stats table
        usage_stats = Table(
            'usage_stats', metadata,
            Column('id', Integer, primary_key=True),
            Column('client_id', Integer, ForeignKey('clients.id'), nullable=False, index=True),
            Column('date', Date, nullable=False, index=True),
            Column('total_accounts', Integer, default=0),
            Column('active_accounts', Integer, default=0),
            Column('banned_accounts', Integer, default=0),
            Column('challenge_accounts', Integer, default=0),
            Column('total_proxies', Integer, default=0),
            Column('active_proxies', Integer, default=0),
            Column('tasks_created', Integer, default=0),
            Column('tasks_completed', Integer, default=0),
            Column('tasks_failed', Integer, default=0),
            Column('task_stats', JSON),
            Column('updated_at', DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
        )
        
        print("\n🔍 Testing database connection...")
        async with engine.begin() as conn:
            # Test connection
            result = await conn.execute(text("SELECT 1"))
            result.fetchone()
            print("✅ Database connection successful!\n")
            
            print("🔨 Creating tables...")
            await conn.run_sync(metadata.create_all)
            print("✅ All tables created successfully!\n")
            
        await engine.dispose()
        
        print("=" * 60)
        print("✅ Database setup completed!")
        print("=" * 60)
        print("\nTables created:")
        print("  - clients")
        print("  - activity_logs")
        print("  - usage_stats")
        print("\nNext steps:")
        print("  1. Start central server:")
        print("     uvicorn app.main:app --host 0.0.0.0 --port 8001")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    # Install python-dotenv if needed
    try:
        import dotenv
    except ImportError:
        print("Installing python-dotenv...")
        os.system("python -m pip install python-dotenv -q")
    
    asyncio.run(create_tables())
