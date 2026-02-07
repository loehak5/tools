from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProxyTemplateBase(BaseModel):
    name: str
    proxy_url: str
    description: Optional[str] = None

class ProxyTemplateCreate(ProxyTemplateBase):
    pass

class ProxyTemplateResponse(ProxyTemplateBase):
    id: int
    accounts_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class AssignProxyRequest(BaseModel):
    proxy_template_id: Optional[int] = None  # If provided, use template's proxy_url
    proxy_url: Optional[str] = None  # If provided directly, use this

class ProxyTestRequest(BaseModel):
    proxy_url: str

class ProxyTestResponse(BaseModel):
    success: bool
    message: str
    latency_ms: Optional[float] = None
    ip: Optional[str] = None
    country: Optional[str] = None

class ProxyDistributionRequest(BaseModel):
    max_accounts_per_proxy: int = 10
    overwrite_existing: bool = False

class ProxyBatchImportRequest(BaseModel):
    raw_data: str  # The multi-line proxy list
