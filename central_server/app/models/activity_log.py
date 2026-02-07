from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class ActivityLog(Base):
    """
    Log semua aktivitas yang dilakukan oleh client.
    Digunakan untuk tracking dan monitoring aktivitas pelanggan.
    """
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    # Activity details
    activity_type = Column(String, nullable=False, index=True)  # "login", "account_created", "task_completed", etc.
    activity_data = Column(JSON, nullable=True)  # Additional context/metadata
    
    # Stats snapshot at time of activity (optional - for quick queries)
    total_accounts = Column(Integer, nullable=True)
    active_accounts = Column(Integer, nullable=True)
    total_proxies = Column(Integer, nullable=True)
    
    # Metadata
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    ip_address = Column(String, nullable=True)
    
    # Relationship
    # client = relationship("Client", back_populates="activities")
