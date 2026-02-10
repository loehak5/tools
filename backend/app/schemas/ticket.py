from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from app.models.ticket import TicketStatus, TicketPriority

class TicketMessageBase(BaseModel):
    message: str

class TicketMessageCreate(TicketMessageBase):
    pass

class TicketMessage(TicketMessageBase):
    id: int
    ticket_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TicketBase(BaseModel):
    subject: str
    priority: TicketPriority = TicketPriority.MEDIUM

class TicketCreate(TicketBase):
    message: str  # Initial message for the ticket

class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None

class Ticket(TicketBase):
    id: int
    user_id: int
    status: TicketStatus
    created_at: datetime
    updated_at: datetime
    messages: List[TicketMessage] = []

    class Config:
        from_attributes = True

class TicketList(BaseModel):
    id: int
    user_id: int
    subject: str
    status: TicketStatus
    priority: TicketPriority
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
