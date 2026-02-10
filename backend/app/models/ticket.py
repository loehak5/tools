from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SqlEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base
from app.core.tz_utils import now_jakarta
import enum

class TicketStatus(str, enum.Enum):
    OPEN = "open"
    ANSWERED = "answered"
    CUSTOMER_REPLY = "customer-reply"
    CLOSED = "closed"
    # Legacy compatibility
    PENDING = "pending"
    RESOLVED = "resolved"

class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subject = Column(String(255), index=True)
    status = Column(String(20), default=TicketStatus.OPEN)
    priority = Column(String(20), default=TicketPriority.MEDIUM)
    created_at = Column(DateTime, default=now_jakarta)
    updated_at = Column(DateTime, default=now_jakarta, onupdate=now_jakarta)

    user = relationship("User", backref="tickets")
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan")

class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String(1000))
    created_at = Column(DateTime, default=now_jakarta)

    ticket = relationship("Ticket", back_populates="messages")
    user = relationship("User")
