from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Project Info
    PROJECT_NAME: str = "Instagram Tools Central Server"
    API_V1_STR: str = "/api/v1"
    
    # Database - Option 1: Set DATABASE_URL directly (SQLite or full connection string)
    DATABASE_URL: Optional[str] = None
    
    # Database - Option 2: Set MySQL parameters individually (will auto-generate DATABASE_URL)
    MYSQL_HOST: Optional[str] = None
    MYSQL_PORT: int = 3306
    MYSQL_USER: Optional[str] = None
    MYSQL_PASSWORD: Optional[str] = None
    MYSQL_DATABASE: Optional[str] = None
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["*"]  # In production, specify exact origins
    
    # Admin credentials (for first time setup)
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"  # Change this in production!
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def get_database_url(self) -> str:
        """
        Get database URL. Priority:
        1. If DATABASE_URL is set explicitly, use it
        2. If MYSQL_HOST is set, construct MySQL URL
        3. Default to SQLite
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL
        
        if self.MYSQL_HOST and self.MYSQL_USER and self.MYSQL_PASSWORD and self.MYSQL_DATABASE:
            # Construct MySQL connection URL
            return f"mysql+aiomysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
        
        # Default to SQLite
        return "sqlite:///./central_server.db"


settings = Settings()
