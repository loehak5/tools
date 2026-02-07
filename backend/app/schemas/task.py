from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class TaskBase(BaseModel):
    account_id: int
    task_type: str  # post, like, follow, view
    scheduled_at: datetime

class TaskCreate(TaskBase):
    params: Optional[Dict[str, Any]] = None
    execute_now: bool = False
    batch_id: Optional[int] = None

class TaskCreatePost(BaseModel):
    account_id: int
    scheduled_at: datetime
    caption: str = ""
    execute_now: bool = False
    batch_id: Optional[int] = None

class TaskCreateLike(BaseModel):
    account_id: int
    scheduled_at: datetime
    media_url: str  # URL or media_id
    execute_now: bool = False
    batch_id: Optional[int] = None

class TaskCreateFollow(BaseModel):
    account_id: int
    scheduled_at: datetime
    target_username: str
    execute_now: bool = False
    batch_id: Optional[int] = None

class TaskCreateView(BaseModel):
    account_id: int
    scheduled_at: datetime
    story_url: str  # URL of story or reel
    execute_now: bool = False
    batch_id: Optional[int] = None

class TaskCreateStory(BaseModel):
    account_id: int
    scheduled_at: datetime
    caption: str = ""
    link: Optional[str] = None
    execute_now: bool = False
    batch_id: Optional[int] = None

class TaskCreateReels(BaseModel):
    account_id: int
    scheduled_at: datetime
    caption: str = ""
    execute_now: bool = False
    batch_id: Optional[int] = None

class TaskUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    params: Optional[Dict[str, Any]] = None

class TaskBulkDelete(BaseModel):
    ids: List[int]

class TaskResponse(TaskBase):
    id: int
    account_username: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    status: str
    error_message: Optional[str] = None
    executed_at: Optional[datetime] = None
    created_at: datetime
    batch_id: Optional[int] = None

    class Config:
        from_attributes = True

class TaskBatchBase(BaseModel):
    task_type: str
    params: Optional[Dict[str, Any]] = None
    total_count: int = 0

class TaskBatchCreate(TaskBatchBase):
    pass

class TaskBatchResponse(TaskBatchBase):
    id: int
    status: str
    total_count: int
    success_count: int
    failed_count: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
