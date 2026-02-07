from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class UsageStats(Base):
    """
    Agregasi statistik harian per client.
    Digunakan untuk analytics dashboard dan trending.
    """
    __tablename__ = "usage_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)  # Daily stats
    
    # Account stats
    total_accounts = Column(Integer, default=0)
    active_accounts = Column(Integer, default=0)  # Status = "active"
    banned_accounts = Column(Integer, default=0)  # Status = "banned"
    challenge_accounts = Column(Integer, default=0)  # Status = "challenge"
    
    # Proxy stats
    total_proxies = Column(Integer, default=0)
    active_proxies = Column(Integer, default=0)
    
    # Task stats
    tasks_created = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    tasks_failed = Column(Integer, default=0)
    
    # Task breakdown by type (JSON untuk flexibility)
    task_stats = Column(JSON, nullable=True)  # {"follow": 100, "like": 200, "post": 50, ...}
    
    # Metadata
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship
    # client = relationship("Client", back_populates="usage_stats")
