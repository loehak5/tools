from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import settings

# Get database URI and determine database type
database_uri = settings.SQLALCHEMY_DATABASE_URI
is_mysql = "mysql" in database_uri

# Create async engine with appropriate settings for database type
engine = create_async_engine(
    database_uri,
    future=True,
    echo=True,
    poolclass=NullPool if is_mysql else None,  # Use NullPool for MySQL to avoid connection issues
    pool_pre_ping=not is_mysql if not is_mysql else True,  # Always pre-ping for MySQL
    pool_recycle=3600 if is_mysql else None,  # Recycle MySQL connections every hour
    connect_args={"init_command": "SET time_zone='+07:00'"} if is_mysql else {},
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
