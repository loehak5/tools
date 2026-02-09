from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    account = relationship("Account", lazy="joined")
    
    batch_id = Column(Integer, ForeignKey("task_batches.id"), nullable=True)
    batch = relationship("TaskBatch", back_populates="tasks")

    @property
    def account_username(self) -> str:
        if self.account:
            return self.account.username
        return "unknown"

    
    task_type = Column(String(50), nullable=False) # post, like, follow, ensure_active
    params = Column(JSON, nullable=True) # e.g. { "media_path": "...", "caption": "..." }
    
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(String(20), default="pending") # pending, running, completed, failed
    error_message = Column(Text, nullable=True)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("User")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
