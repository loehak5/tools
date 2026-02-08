"""
Create all backend tables in MySQL remote database - Standalone version
Manually defines tables to avoid async import conflicts
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def create_tables():
    print("=" * 60)
    print("Backend - Database Table Creation")
    print("=" * 60)
    
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import MetaData, Table, Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Text, text
        from sqlalchemy.sql import func
        from dotenv import dotenv_values
        
        # Load .env manually
        config = dotenv_values(".env")
        
        # Build database URL
        if config.get("MYSQL_HOST"):
            db_url = f"mysql+aiomysql://{config['MYSQL_USER']}:{config['MYSQL_PASSWORD']}@{config['MYSQL_HOST']}:{config.get('MYSQL_PORT', '3306')}/{config['MYSQL_DATABASE']}"
            db_type = "MySQL"
        elif config.get("POSTGRES_SERVER"):
            db_url = f"postgresql+asyncpg://{config['POSTGRES_USER']}:{config['POSTGRES_PASSWORD']}@{config['POSTGRES_SERVER']}:{config.get('POSTGRES_PORT', '5432')}/{config['POSTGRES_DB']}"
            db_type = "PostgreSQL"
        else:
            print("❌ ERROR: No database configuration found in .env")
            print("Please configure either MYSQL_* or POSTGRES_* variables")
            sys.exit(1)
        
        print(f"Database Type: {db_type}")
        print(f"Database: {db_url.split('@')[-1] if '@' in db_url else db_url}")
        print("=" * 60)
        
        # Create engine
        engine = create_async_engine(db_url, echo=False)
        
        # Define metadata
        metadata = MetaData()
        
        # Define users table
        users = Table(
            'users', metadata,
            Column('id', Integer, primary_key=True),
            Column('username', String(255), unique=True, nullable=False, index=True),
            Column('hashed_password', String(255), nullable=False),
            Column('full_name', String(255)),
            Column('role', String(50), default='operator'),
            Column('is_active', Boolean, default=True),
        )
        
        # Define fingerprints table
        fingerprints = Table(
            'fingerprints', metadata,
            Column('id', Integer, primary_key=True),
            Column('user_agent', String(500), nullable=False),
            Column('browser_version', String(100)),
            Column('os_type', String(100)),
            Column('device_memory', Integer),
            Column('hardware_concurrency', Integer),
            Column('screen_resolution', String(50)),
            Column('timezone', String(100)),
            Column('language', String(50)),
            Column('raw_fingerprint', JSON),
            Column('user_id', Integer, ForeignKey('users.id')),
            Column('created_at', DateTime(timezone=True), server_default=func.now()),
        )
        
        # Define accounts table
        accounts = Table(
            'accounts', metadata,
            Column('id', Integer, primary_key=True),
            Column('username', String(255), unique=True, nullable=False, index=True),
            Column('password_encrypted', String(500)),
            Column('seed_2fa', String(255)),
            Column('proxy', String(500)),
            Column('login_method', Integer, default=1),
            Column('cookies', JSON),
            Column('last_login_state', JSON),
            Column('fingerprint_id', Integer, ForeignKey('fingerprints.id')),
            Column('is_active', Boolean, default=True),
            Column('is_checker', Boolean, default=False),
            Column('status', String(50), default='offline'),
            Column('last_error', String(500)),
            Column('threads_profile_id', String(255)),
            Column('has_threads', Boolean, default=False),
            Column('user_id', Integer, ForeignKey('users.id')),
            Column('created_at', DateTime(timezone=True), server_default=func.now()),
            Column('last_login', DateTime(timezone=True)),
        )
        
        # Define proxy_templates table
        proxy_templates = Table(
            'proxy_templates', metadata,
            Column('id', Integer, primary_key=True),
            Column('name', String(255), nullable=False),
            Column('proxy_string', String(500), nullable=False),
            Column('is_active', Boolean, default=True),
            Column('user_id', Integer, ForeignKey('users.id')),
        )
        
        # Define task_batches table
        task_batches = Table(
            'task_batches', metadata,
            Column('id', Integer, primary_key=True),
            Column('name', String(255)),
            Column('task_type', String(100), nullable=False),
            Column('config', JSON, nullable=False),
            Column('status', String(50), default='pending'),
            Column('total_tasks', Integer, default=0),
            Column('completed_tasks', Integer, default=0),
            Column('failed_tasks', Integer, default=0),
            Column('created_at', DateTime(timezone=True), server_default=func.now()),
            Column('started_at', DateTime(timezone=True)),
            Column('completed_at', DateTime(timezone=True)),
            Column('user_id', Integer, ForeignKey('users.id')),
        )
        
        # Define tasks table
        tasks = Table(
            'tasks', metadata,
            Column('id', Integer, primary_key=True),
            Column('account_id', Integer, ForeignKey('accounts.id'), nullable=False),
            Column('batch_id', Integer, ForeignKey('task_batches.id')),
            Column('task_type', String(100), nullable=False),
            Column('config', JSON, nullable=False),
            Column('status', String(50), default='pending'),
            Column('result', JSON),
            Column('error_message', Text),
            Column('created_at', DateTime(timezone=True), server_default=func.now()),
            Column('started_at', DateTime(timezone=True)),
            Column('completed_at', DateTime(timezone=True)),
            Column('user_id', Integer, ForeignKey('users.id')),
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
        print("  - users")
        print("  - accounts")
        print("  - fingerprints")
        print("  - proxy_templates")
        print("  - tasks")
        print("  - task_batches")
        print("\nNext steps:")
        print("  1. Start backend: uvicorn app.main:app --reload")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(create_tables())
