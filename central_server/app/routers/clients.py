from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
from datetime import datetime

from app.db.session import get_db
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.core import get_password_hash, generate_api_key

router = APIRouter()


@router.get("/", response_model=List[ClientResponse])
async def list_clients(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    List all clients.
    Admin endpoint untuk melihat semua client/pelanggan.
    """
    result = await db.execute(
        select(Client).offset(skip).limit(limit)
    )
    clients = result.scalars().all()
    return clients


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get client by ID"""
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id {client_id} not found"
        )
    
    return client


@router.post("/", response_model=ClientResponse)
async def create_client(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create new client account.
    Admin endpoint untuk membuat akun pelanggan baru.
    """
    # Check if client_name already exists
    result = await db.execute(
        select(Client).where(Client.client_name == client_data.client_name)
    )
    existing_client = result.scalar_one_or_none()
    
    if existing_client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Client with name '{client_data.client_name}' already exists"
        )
    
    # Create new client
    new_client = Client(
        client_name=client_data.client_name,
        company_name=client_data.company_name,
        email=client_data.email,
        phone=client_data.phone,
        hashed_password=get_password_hash(client_data.password),
        api_key=generate_api_key(),
        license_type=client_data.license_type,
        license_start=datetime.utcnow(),
        max_accounts=client_data.max_accounts,
        max_proxies=client_data.max_proxies,
        notes=client_data.notes,
        is_active=True
    )
    
    db.add(new_client)
    await db.commit()
    await db.refresh(new_client)
    
    return new_client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update client information.
    Admin endpoint untuk update info pelanggan.
    """
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id {client_id} not found"
        )
    
    # Update fields if provided
    update_data = client_data.model_dump(exclude_unset=True)
    
    # Hash password if provided
    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(client, field, value)
    
    await db.commit()
    await db.refresh(client)
    
    return client


@router.put("/{client_id}/activate")
async def activate_client(
    client_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Enable/activate a client account"""
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id {client_id} not found"
        )
    
    client.is_active = True
    await db.commit()
    
    return {"message": f"Client '{client.client_name}' activated successfully"}


@router.put("/{client_id}/deactivate")
async def deactivate_client(
    client_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Disable/deactivate a client account.
    Client akan tidak bisa login sampai di-activate lagi.
    """
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id {client_id} not found"
        )
    
    client.is_active = False
    # Also invalidate current session
    client.current_session_id = None
    
    await db.commit()
    
    return {"message": f"Client '{client.client_name}' deactivated successfully"}


@router.delete("/{client_id}")
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a client account.
    WARNING: This will also delete all associated activity logs and usage stats.
    """
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id {client_id} not found"
        )
    
    client_name = client.client_name
    
    await db.delete(client)
    await db.commit()
    
    return {"message": f"Client '{client_name}' deleted successfully"}
