from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class ProxyTemplate(Base):
    __tablename__ = "proxy_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)  # Friendly name for the proxy
    proxy_url = Column(String, nullable=False)  # The actual proxy URL
    description = Column(String, nullable=True)  # Optional description
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("User")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
