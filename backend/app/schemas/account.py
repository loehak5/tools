from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime

class AccountBase(BaseModel):
    username: str
    proxy: Optional[str] = None
    status: Optional[str] = "offline"
    is_checker: Optional[bool] = False

class AccountCreate(AccountBase):
    password: Optional[str] = None
    seed_2fa: Optional[str] = None
    cookies: Optional[Dict[str, Any]] = None
    login_method: int = 1  # 1=Pass, 2=2FA, 3=Cookies

class AccountUpdate(AccountBase):
    password: Optional[str] = None
    is_active: Optional[bool] = None

class AccountResponse(AccountBase):
    id: int
    login_method: int
    is_active: bool
    is_checker: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    last_error: Optional[str] = None  # Last login error reason
    
    class Config:
        from_attributes = True

class BulkDisconnectRequest(BaseModel):
    activity_types: list[str] = [] # 'like', 'follow', 'view', 'post'
    statuses: list[str] = [] # 'failed', 'expired', 'banned', 'offline'


class BulkAccountItem(BaseModel):
    username: str
    password: Optional[str] = None
    seed_2fa: Optional[str] = None
    cookies: Optional[Dict[str, Any]] = None
    proxy: Optional[str] = None
    login_method: int = 1  # 1=Pass, 2=2FA, 3=Cookies


class BulkAccountCreate(BaseModel):
    accounts: list[BulkAccountItem]
    common_proxy: Optional[str] = None  # Applied if individual/pool not set
    proxy_pool: Optional[list[str]] = None  # Pool for random rotation
    # Staggered login options
    staggered_login: bool = True  # Enable staggered login
    min_delay: int = 30  # Minimum delay between logins (seconds)
    max_delay: int = 120  # Maximum delay between logins (seconds)
    batch_size: int = 10  # Number of concurrent logins per batch


class BulkImportStatus(BaseModel):
    job_id: str
    total: int
    created: int
    failed: int
    pending_login: int
    logged_in: int
    login_failed: int
    status: str  # 'creating', 'logging_in', 'completed'
    results: list[dict]


