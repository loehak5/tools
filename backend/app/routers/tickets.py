from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from app.db.session import AsyncSessionLocal
from app.routers.deps import get_current_user
from app.models.user import User
from app.models.ticket import Ticket, TicketMessage, TicketStatus
from app.schemas import ticket as schemas

router = APIRouter()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/", response_model=schemas.Ticket)
async def create_ticket(
    ticket_in: schemas.TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = Ticket(
        user_id=current_user.id,
        subject=ticket_in.subject,
        priority=ticket_in.priority,
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    await db.flush()  # To get ticket ID

    initial_message = TicketMessage(
        ticket_id=ticket.id,
        user_id=current_user.id,
        message=ticket_in.message
    )
    db.add(initial_message)
    await db.commit()
    await db.refresh(ticket)
    
    # Reload with messages
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket.id)
    )
    return result.scalar_one()

@router.get("/", response_model=List[schemas.TicketList])
async def list_tickets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "admin":
        query = select(Ticket).order_by(desc(Ticket.updated_at))
    else:
        query = select(Ticket).where(Ticket.user_id == current_user.id).order_by(desc(Ticket.updated_at))
    
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{ticket_id}", response_model=schemas.Ticket)
async def get_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if current_user.role != "admin" and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return ticket

@router.post("/{ticket_id}/messages", response_model=schemas.TicketMessage)
async def add_message(
    ticket_id: int,
    message_in: schemas.TicketMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if ticket exists and user has access
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if current_user.role != "admin" and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    message = TicketMessage(
        ticket_id=ticket_id,
        user_id=current_user.id,
        message=message_in.message
    )
    db.add(message)
    
    # Update ticket timestamp
    ticket.updated_at = datetime.utcnow()
    # If admin replies, status might change to pending
    if current_user.role == "admin":
        ticket.status = TicketStatus.PENDING
    else:
        ticket.status = TicketStatus.OPEN

    await db.commit()
    await db.refresh(message)
    return message

@router.patch("/{ticket_id}", response_model=schemas.Ticket)
async def update_ticket(
    ticket_id: int,
    ticket_update: schemas.TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update ticket status")
    
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket_update.status:
        ticket.status = ticket_update.status
    if ticket_update.priority:
        ticket.priority = ticket_update.priority
        
    ticket.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(ticket)
    return ticket
