from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime


class AccountMetadata(BaseModel):
    """Instagram account metadata from cookie export"""
    username: str
    full_name: str
    user_id: str
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    profile_pic_url: Optional[str] = None
    bio: Optional[str] = None
    is_verified: bool = False
    is_private: bool = False


class CookieImportSchema(BaseModel):
    """Schema for importing a single Instagram account via cookies"""
    version: str = Field(..., description="Export format version")
    exported_at: datetime = Field(..., description="When cookies were exported")
    account: AccountMetadata
    cookies: Dict[str, str] = Field(..., description="Instagram cookies as key-value pairs")
    user_agent: str = Field(..., description="Browser user agent")
    proxy: Optional[str] = Field(None, description="Optional proxy for this account")
    notes: Optional[str] = Field(None, description="Optional notes about the account")


class BatchCookieImportSchema(BaseModel):
    """Schema for batch importing multiple accounts"""
    version: str = "1.0"
    exported_at: Optional[datetime] = None
    accounts: List[CookieImportSchema]


class CookieImportResponse(BaseModel):
    """Response after importing cookies"""
    success: bool
    account_id: Optional[int] = None
    username: str
    message: str
    skipped: bool = False


class BatchImportResponse(BaseModel):
    """Response after batch import"""
    total: int
    imported: int
    skipped: int
    failed: int
    results: List[CookieImportResponse]
