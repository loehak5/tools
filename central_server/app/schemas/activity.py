from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ActivityLogCreate(BaseModel):
    activity_type: str
    activity_data: Optional[dict] = None
    total_accounts: Optional[int] = None
    active_accounts: Optional[int] = None
    total_proxies: Optional[int] = None


class ActivityLogResponse(BaseModel):
    id: int
    client_id: int
    activity_type: str
    activity_data: Optional[dict] = None
    total_accounts: Optional[int] = None
    active_accounts: Optional[int] = None
    total_proxies: Optional[int] = None
    timestamp: datetime
    ip_address: Optional[str] = None
    
    class Config:
        from_attributes = True
