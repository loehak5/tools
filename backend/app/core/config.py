import os
from typing import List, Union, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, field_validator

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "IG Automation Tools"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Database - Option 1: PostgreSQL (Legacy)
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    POSTGRES_PORT: str = "5432"
    
    # Database - Option 2: MySQL Remote (New)
    MYSQL_HOST: Optional[str] = None
    MYSQL_PORT: int = 3306
    MYSQL_USER: Optional[str] = None
    MYSQL_PASSWORD: Optional[str] = None
    MYSQL_DATABASE: Optional[str] = None
    
    WORKER_CONCURRENCY: int = 20
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        """
        Get database URL. Priority:
        1. If MYSQL_HOST is set, use MySQL remote
        2. If POSTGRES_SERVER is set, use PostgreSQL
        3. Default to PostgreSQL localhost
        """
        if self.MYSQL_HOST and self.MYSQL_USER and self.MYSQL_PASSWORD and self.MYSQL_DATABASE:
            # Use MySQL remote database
            return f"mysql+aiomysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
        
        if self.POSTGRES_SERVER and self.POSTGRES_USER and self.POSTGRES_PASSWORD and self.POSTGRES_DB:
            # Use PostgreSQL (legacy)
            return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        
        # Default fallback
        return "postgresql+asyncpg://postgres:postgres@db:5432/instagram_automation"

    # Redis / Celery
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    
    @property
    def CELERY_BROKER_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    @property
    def MEDIA_PATH(self) -> str:
        # Resolves to backend/media/scheduled
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        path = os.path.join(base_dir, "media", "scheduled")
        os.makedirs(path, exist_ok=True)
        return path

    # Central Server (Multi-Tenant License Management)
    CENTRAL_SERVER_ENABLED: bool = False  # Set to True to enable
    CENTRAL_SERVER_URL: str = ""  # e.g. "http://your-server.com"
    CLIENT_NAME: str = ""  # Your client name from admin
    CLIENT_PASSWORD: str = ""  # Your client password from admin
    HEARTBEAT_INTERVAL: int = 900  # 15 minutes (optional)

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
