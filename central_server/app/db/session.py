from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import settings

# Get database URL from settings
database_url = settings.get_database_url()

# Convert to async version based on database type
if database_url.startswith("sqlite"):
    # SQLite: convert to aiosqlite
    database_url = database_url.replace("sqlite:///", "sqlite+aiosqlite:///")
elif database_url.startswith("mysql://"):
    # MySQL: convert to aiomysql (should already be mysql+aiomysql from config)
    database_url = database_url.replace("mysql://", "mysql+aiomysql://")

# Create async engine with appropriate settings
is_sqlite = "sqlite" in database_url
engine = create_async_engine(
    database_url,
    echo=True,  # Set to False in production
    poolclass=NullPool if is_sqlite else None,
    pool_pre_ping=not is_sqlite,  # Enable connection health checks for MySQL
    pool_recycle=3600 if not is_sqlite else None,  # Recycle connections every hour for MySQL
)

# Create session maker
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncSession:
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
