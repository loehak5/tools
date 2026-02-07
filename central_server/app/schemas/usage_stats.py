from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class UsageStatsUpdate(BaseModel):
    total_accounts: int = 0
    active_accounts: int = 0
    banned_accounts: int = 0
    challenge_accounts: int = 0
    total_proxies: int = 0
    active_proxies: int = 0
    tasks_created: int = 0
    tasks_completed: int = 0
    tasks_failed: int = 0
    task_stats: Optional[dict] = None


class UsageStatsResponse(UsageStatsUpdate):
    id: int
    client_id: int
    date: date
    updated_at: datetime
    
    class Config:
        from_attributes = True
