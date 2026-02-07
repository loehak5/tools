from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime
from typing import Optional

from app.db.session import get_db
from app.models.client import Client
from app.models.activity_log import ActivityLog
from app.schemas.client import ClientLoginRequest, ClientLoginResponse, ClientResponse, HeartbeatRequest
from app.core import verify_password, create_access_token, generate_session_id, decode_access_token

router = APIRouter()


@router.post("/login", response_model=ClientLoginResponse)
async def client_login(
    login_data: ClientLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Client login endpoint.
    
    - Validates credentials
    - Invalidates any existing session (single device enforcement)
    - Creates new session with unique session_id
    - Returns auth token + session_id
    """
    # Find client by client_name
    result = await db.execute(
        select(Client).where(Client.client_name == login_data.client_name)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify password
    if not verify_password(login_data.password, client.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if client is active
    if not client.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Client account is disabled. Please contact administrator."
        )
    
    # Generate new session (this automatically invalidates previous session)
    new_session_id = generate_session_id()
    client_ip = request.client.host if request.client else None
    
    # Update client session info
    client.current_session_id = new_session_id
    client.current_device_info = login_data.device_info
    client.session_started_at = datetime.utcnow()
    client.last_active = datetime.utcnow()
    client.last_ip = client_ip
    
    await db.commit()
    await db.refresh(client)
    
    # Log activity
    activity_log = ActivityLog(
        client_id=client.id,
        activity_type="login",
        activity_data={"device_info": login_data.device_info},
        ip_address=client_ip
    )
    db.add(activity_log)
    await db.commit()
    
    # Generate access token
    access_token = create_access_token(subject=client.client_name)
    
    return ClientLoginResponse(
        access_token=access_token,
        session_id=new_session_id,
        client_info=ClientResponse.model_validate(client)
    )


@router.post("/logout")
async def client_logout(
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db)
):
    """
    Client logout endpoint.
    Clears current session.
    """
    current_client.current_session_id = None
    current_client.current_device_info = None
    current_client.session_started_at = None
    
    await db.commit()
    
    # Log activity
    activity_log = ActivityLog(
        client_id=current_client.id,
        activity_type="logout"
    )
    db.add(activity_log)
    await db.commit()
    
    return {"message": "Logged out successfully"}


@router.post("/check-session")
async def check_session(
    current_client: Client = Depends(get_current_client),
    session_id: str = None
):
    """
    Check if current session is still valid.
    Used by client app to detect if session was invalidated.
    """
    if not current_client.current_session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active session"
        )
    
    if session_id and current_client.current_session_id != session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalidated. Please login again."
        )
    
    return {"status": "valid", "session_id": current_client.current_session_id}


@router.post("/heartbeat")
async def heartbeat(
    heartbeat_data: HeartbeatRequest,
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db)
):
    """
    Client heartbeat endpoint.
    Updates last_active timestamp and optionally logs stats.
    Does NOT validate session - just updates last_active.
    """
    current_client.last_active = datetime.utcnow()
    await db.commit()
    
    # Optionally log heartbeat with stats
    if any([
        heartbeat_data.total_accounts,
        heartbeat_data.active_accounts,
        heartbeat_data.total_proxies,
        heartbeat_data.active_proxies
    ]):
        activity_log = ActivityLog(
            client_id=current_client.id,
            activity_type="heartbeat",
            total_accounts=heartbeat_data.total_accounts,
            active_accounts=heartbeat_data.active_accounts,
            total_proxies=heartbeat_data.total_proxies
        )
        db.add(activity_log)
        await db.commit()
    
    return {"status": "ok", "last_active": current_client.last_active}


# Dependency untuk get current client from token
async def get_current_client(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Client:
    """
    Dependency to get current authenticated client from JWT token.
    Also validates that client is active.
    """
    # Get Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = auth_header.replace("Bearer ", "")
    
    # Decode token
    client_name = decode_access_token(token)
    if not client_name:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    # Get client from database
    result = await db.execute(
        select(Client).where(Client.client_name == client_name)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Client not found"
        )
    
    if not client.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Client account is disabled"
        )
    
    return client
