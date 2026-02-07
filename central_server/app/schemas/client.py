from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ClientBase(BaseModel):
    client_name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    license_type: Optional[str] = None
    max_accounts: int = 100
    max_proxies: int = 50
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    password: str  # Will be hashed


class ClientUpdate(BaseModel):
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    license_type: Optional[str] = None
    max_accounts: Optional[int] = None
    max_proxies: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class ClientResponse(ClientBase):
    id: int
    api_key: str
    is_active: bool
    license_start: Optional[datetime] = None
    license_end: Optional[datetime] = None
    created_at: datetime
    last_active: Optional[datetime] = None
    last_ip: Optional[str] = None
    current_device_info: Optional[dict] = None
    session_started_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ClientLoginRequest(BaseModel):
    client_name: str
    password: str
    device_info: Optional[dict] = None  # OS, hostname, MAC address, etc.


class ClientLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    session_id: str
    client_info: ClientResponse


class HeartbeatRequest(BaseModel):
    total_accounts: Optional[int] = None
    active_accounts: Optional[int] = None
    total_proxies: Optional[int] = None
    active_proxies: Optional[int] = None
