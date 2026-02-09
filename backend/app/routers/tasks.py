from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional, Dict
from datetime import datetime
import os
import shutil

from app.db.session import get_db, AsyncSessionLocal
from app.models.task import Task
from app.models.account import Account, Fingerprint
from app.schemas.task import TaskResponse, TaskCreatePost, TaskCreateLike, TaskCreateFollow, TaskCreateView, TaskCreateStory, TaskCreateReels, TaskUpdate, TaskBulkDelete
from app.services.instagram_service import InstagramService
from instagrapi.exceptions import LoginRequired
from app.routers.deps import get_current_user
from app.models.user import User
from app.core.config import settings
from app.middleware.auth_check import require_active_subscription

router = APIRouter()

# Media storage will be handled via settings.MEDIA_PATH

@router.get("/stats/by-account")
async def get_task_stats_by_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[int, Dict[str, int]]:
    """Get task counts grouped by account_id and status."""
    # Query to get counts
    stmt = select(
        Task.account_id,
        Task.status,
        func.count(Task.id).label('count')
    )
    if current_user.role != "admin":
        stmt = stmt.where(Task.user_id == current_user.id)
        
    stmt = stmt.group_by(Task.account_id, Task.status)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Build response: { account_id: { pending: X, completed: Y, failed: Z, total: N } }
    stats: Dict[int, Dict[str, int]] = {}
    for row in rows:
        account_id = row.account_id
        status = row.status
        count = row.count
        
        if account_id not in stats:
            stats[account_id] = {"pending": 0, "running": 0, "completed": 0, "failed": 0, "total": 0}
        
        stats[account_id][status] = count
        stats[account_id]["total"] += count
    
    return stats

@router.get("/stats/actions-by-account")
async def get_action_stats_by_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[int, Dict[str, int]]:
    """Get completed action counts grouped by account_id and task_type."""
    # Query to get counts of completed tasks only
    stmt = select(
        Task.account_id,
        Task.task_type,
        func.count(Task.id).label('count')
    ).where(Task.status == "completed")
    
    if current_user.role != "admin":
        stmt = stmt.where(Task.user_id == current_user.id)
        
    stmt = stmt.group_by(Task.account_id, Task.task_type)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Build response: { account_id: { like: X, follow: Y, view: Z, post: W, total: N } }
    stats: Dict[int, Dict[str, int]] = {}
    for row in rows:
        account_id = row.account_id
        task_type = row.task_type
        count = row.count
        
        if account_id not in stats:
            stats[account_id] = {"like": 0, "follow": 0, "view": 0, "post": 0, "total": 0}
        
        stats[account_id][task_type] = count
        stats[account_id]["total"] += count
    
    return stats


from app.services.task_executor import execute_task

async def execute_task_now(task_id: int):
    """Execute a task immediately in the background."""
    await execute_task(task_id)

@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all scheduled tasks."""
    stmt = select(Task)
    
    if current_user.role != "admin":
        stmt = stmt.where(Task.user_id == current_user.id)
        
    stmt = stmt.order_by(Task.scheduled_at.asc())
    if status:
        stmt = stmt.where(Task.status == status)
    if task_type:
        stmt = stmt.where(Task.task_type == task_type)
    else:
        # Exclude internal tasks by default
        stmt = stmt.where(Task.task_type.not_in(['login', 'check_session']))
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/count")
async def count_tasks(
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get total count of tasks matching filters."""
    stmt = select(func.count(Task.id))
    
    if current_user.role != "admin":
        stmt = stmt.where(Task.user_id == current_user.id)
    if status:
        stmt = stmt.where(Task.status == status)
    if task_type:
        stmt = stmt.where(Task.task_type == task_type)
    else:
        # Exclude internal tasks by default
        stmt = stmt.where(Task.task_type.not_in(['login', 'check_session']))
    
    result = await db.execute(stmt)
    return {"count": result.scalar_one()}

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific task by ID."""
    stmt = select(Task).where(Task.id == task_id)
    if current_user.role != "admin":
        stmt = stmt.where(Task.user_id == current_user.id)
        
    result = await db.execute(stmt)
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or access denied")
    return task

@router.post("/post", response_model=TaskResponse)
@require_active_subscription
async def create_post_task(
    background_tasks: BackgroundTasks,
    account_id: int = Form(...),
    scheduled_at: str = Form(...),
    caption: str = Form(""),
    share_to_threads: str = Form("false"),
    execute_now: str = Form("false"),
    batch_id: Optional[int] = Form(None),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Schedule an image post."""
    # Verify account exists and belongs to user
    stmt = select(Account).where(Account.id == account_id)
    if current_user.role != "admin":
        stmt = stmt.where(Account.user_id == current_user.id)
        
    result = await db.execute(stmt)
    account = result.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found or access denied")
    
    # Parse scheduled_at
    try:
        scheduled_datetime = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format")
    
    # Save uploaded image
    filename = f"{account_id}_{int(datetime.now().timestamp())}_{image.filename}"
    file_path = os.path.join(settings.MEDIA_PATH, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
    
    task = Task(
        account_id=account_id,
        task_type="post",
        params={"media_path": filename, "caption": caption, "share_to_threads": share_to_threads.lower() == "true"},
        scheduled_at=scheduled_datetime,
        status="pending",
        batch_id=batch_id,
        user_id=current_user.id
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    # Execute immediately if requested
    if execute_now.lower() == "true":
        background_tasks.add_task(execute_task_now, task.id)
    
    return task

@router.post("/reels", response_model=TaskResponse)
@require_active_subscription
async def create_reels_task(
    background_tasks: BackgroundTasks,
    account_id: int = Form(...),
    scheduled_at: str = Form(...),
    caption: str = Form(""),
    share_to_threads: str = Form("false"),
    execute_now: str = Form("false"),
    batch_id: Optional[int] = Form(None),
    video: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Schedule a Reels post."""
    # Check file size (approximate using Content-Length if available, or seek end)
    # 10MB limit
    # MAX_SIZE = 10 * 1024 * 1024
    # if video.size and video.size > MAX_SIZE:
    #      raise HTTPException(status_code=400, detail="Video file too large (max 10MB)")
    
    # Verify account exists and belongs to user
    stmt = select(Account).where(Account.id == account_id)
    if current_user.role != "admin":
        stmt = stmt.where(Account.user_id == current_user.id)
        
    result = await db.execute(stmt)
    account = result.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found or access denied")
    
    # Parse scheduled_at
    try:
        scheduled_datetime = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format")
    
    # Save uploaded video
    filename = f"reels_{account_id}_{int(datetime.now().timestamp())}_{video.filename}"
    file_path = os.path.join(settings.MEDIA_PATH, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    
    task = Task(
        account_id=account_id,
        task_type="reels",
        params={"media_path": filename, "caption": caption, "share_to_threads": share_to_threads.lower() == "true"},
        scheduled_at=scheduled_datetime,
        status="pending",
        batch_id=batch_id,
        user_id=current_user.id
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    # Execute immediately if requested
    if execute_now.lower() == "true":
        background_tasks.add_task(execute_task_now, task.id)
    
    return task

@router.post("/story", response_model=TaskResponse)
@require_active_subscription
async def create_story_task(
    background_tasks: BackgroundTasks,
    account_id: int = Form(...),
    scheduled_at: str = Form(...),
    caption: str = Form(""),
    link: Optional[str] = Form(None),
    execute_now: str = Form("false"),
    batch_id: Optional[int] = Form(None),
    media: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Schedule a Story post."""
    try:
        # Check file size
        # MAX_SIZE = 10 * 1024 * 1024
        # if media.size and media.size > MAX_SIZE:
        #      raise HTTPException(status_code=400, detail="Media file too large (max 10MB)")

        # Verify account exists and belongs to user
        stmt = select(Account).where(Account.id == account_id)
        if current_user.role != "admin":
            stmt = stmt.where(Account.user_id == current_user.id)
            
        result = await db.execute(stmt)
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found or access denied")
        
        # Parse scheduled_at
        try:
            scheduled_datetime = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format")
        
        # Save uploaded media
        filename = f"story_{account_id}_{int(datetime.now().timestamp())}_{media.filename}"
        from app.core.config import settings
        if not os.path.exists(settings.MEDIA_PATH):
            os.makedirs(settings.MEDIA_PATH, exist_ok=True)
            
        file_path = os.path.join(settings.MEDIA_PATH, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(media.file, buffer)
        
        task = Task(
            account_id=account_id,
            task_type="story",
            params={"media_path": filename, "caption": caption, "link": link},
            scheduled_at=scheduled_datetime,
            status="pending",
            batch_id=batch_id,
            user_id=current_user.id
        )
        
        db.add(task)
        await db.commit()
        await db.refresh(task)
        
        # Execute immediately if requested
        if execute_now.lower() == "true":
            background_tasks.add_task(execute_task_now, task.id)
        
        return task
    except Exception as e:
        import traceback
        with open("error_log_story_task.txt", "a") as f:
            f.write(f"Error creating story task: {str(e)}\n")
            f.write(traceback.format_exc())
            f.write("\n" + "-"*50 + "\n")
        raise e

@router.post("/like", response_model=TaskResponse)
@require_active_subscription
async def create_like_task(
    task_in: TaskCreateLike,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Schedule a like action."""
    # Verify account exists and belongs to user
    stmt = select(Account).where(Account.id == task_in.account_id)
    if current_user.role != "admin":
        stmt = stmt.where(Account.user_id == current_user.id)
        
    result = await db.execute(stmt)
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Account not found or access denied")
    
    task = Task(
        account_id=task_in.account_id,
        task_type="like",
        params={"media_url": task_in.media_url},
        scheduled_at=task_in.scheduled_at,
        status="pending",
        batch_id=getattr(task_in, 'batch_id', None),
        user_id=current_user.id
    )
    
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    # Execute immediately if requested
    if getattr(task_in, 'execute_now', False):
        background_tasks.add_task(execute_task_now, task.id)
    
    return task

@router.post("/follow", response_model=TaskResponse)
@require_active_subscription
async def create_follow_task(
    task_in: TaskCreateFollow,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Schedule a follow action."""
    # Verify account exists and belongs to user
    stmt = select(Account).where(Account.id == task_in.account_id)
    if current_user.role != "admin":
        stmt = stmt.where(Account.user_id == current_user.id)
        
    result = await db.execute(stmt)
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Account not found or access denied")
    
    task = Task(
        account_id=task_in.account_id,
        task_type="follow",
        params={"target_username": task_in.target_username},
        scheduled_at=task_in.scheduled_at,
        status="pending",
        batch_id=getattr(task_in, 'batch_id', None),
        user_id=current_user.id
    )
    
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    # Execute immediately if requested
    if getattr(task_in, 'execute_now', False):
        background_tasks.add_task(execute_task_now, task.id)
    
    return task

@router.post("/view", response_model=TaskResponse)
@require_active_subscription
async def create_view_task(
    task_in: TaskCreateView,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Schedule a view action."""
    # Verify account exists and belongs to user
    stmt = select(Account).where(Account.id == task_in.account_id)
    if current_user.role != "admin":
        stmt = stmt.where(Account.user_id == current_user.id)
        
    result = await db.execute(stmt)
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Account not found or access denied")
    
    task = Task(
        account_id=task_in.account_id,
        task_type="view",
        params={"story_url": task_in.story_url},
        scheduled_at=task_in.scheduled_at,
        status="pending",
        batch_id=getattr(task_in, 'batch_id', None),
        user_id=current_user.id
    )
    
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    # Execute immediately if requested
    if getattr(task_in, 'execute_now', False):
        background_tasks.add_task(execute_task_now, task.id)
    
    return task

# ... endpoints ...

@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a scheduled task."""
    stmt = select(Task).where(Task.id == task_id)
    if current_user.role != "admin":
        stmt = stmt.where(Task.user_id == current_user.id)
        
    result = await db.execute(stmt)
    task = result.scalars().first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status in ["running", "completed"]:
        raise HTTPException(status_code=400, detail=f"Cannot edit {task.status} task")
    
    if task_update.scheduled_at:
        task.scheduled_at = task_update.scheduled_at
    
    if task_update.params:
        task.params = {**(task.params or {}), **task_update.params}
    
    await db.commit()
    await db.refresh(task)
    
    return task

@router.post("/pause-all")
async def pause_all_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Pause all pending tasks."""
    try:
        from sqlalchemy import update
        stmt = update(Task).where(Task.status == "pending")
        if current_user.role != "admin":
            stmt = stmt.where(Task.user_id == current_user.id)
        
        stmt = stmt.values(status="paused")
        result = await db.execute(stmt)
        await db.commit()
        return {"message": f"Paused {result.rowcount} tasks"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/resume-all")
async def resume_all_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resume all paused tasks."""
    try:
        from sqlalchemy import update
        stmt = update(Task).where(Task.status == "paused")
        if current_user.role != "admin":
            stmt = stmt.where(Task.user_id == current_user.id)
        
        stmt = stmt.values(status="pending")
        result = await db.execute(stmt)
        await db.commit()
        return {"message": f"Resumed {result.rowcount} tasks"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{task_id}/pause", response_model=TaskResponse)
async def pause_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Pause a specific pending task."""
    stmt = select(Task).where(Task.id == task_id)
    if current_user.role != "admin":
        stmt = stmt.where(Task.user_id == current_user.id)
        
    result = await db.execute(stmt)
    task = result.scalars().first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot pause task with status: {task.status}")
    
    task.status = "paused"
    await db.commit()
    await db.refresh(task)
    return task

@router.post("/{task_id}/resume", response_model=TaskResponse)
async def resume_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resume a specific paused task."""
    stmt = select(Task).where(Task.id == task_id)
    if current_user.role != "admin":
        stmt = stmt.where(Task.user_id == current_user.id)
        
    result = await db.execute(stmt)
    task = result.scalars().first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status != "paused":
        raise HTTPException(status_code=400, detail=f"Cannot resume task with status: {task.status}")
    
    task.status = "pending"
    await db.commit()
    await db.refresh(task)
    return task

@router.delete("/history")
async def clear_task_history(
    task_type: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear completed and failed tasks."""
    try:
        from sqlalchemy import delete
        
        # We clear statuses that are considered "done"
        done_statuses = ["completed", "failed"]
        
        print(f"DEBUG: Starting clear_history - task_type={task_type}, status={status}")
        
        stmt = delete(Task).where(Task.status.in_(done_statuses))
        if current_user.role != "admin":
            stmt = stmt.where(Task.user_id == current_user.id)
        
        if task_type:
            stmt = stmt.where(Task.task_type == task_type)
        
        if status:
            # If a specific status is requested, we clear only that one
            stmt = stmt.where(Task.status == status)
            
        result = await db.execute(stmt)
        await db.commit()
        
        row_count = result.rowcount
        print(f"DEBUG: clear_history success - deleted {row_count} rows")
        
        return {
            "message": "History cleared successfully",
            "deleted_count": row_count
        }
    except Exception as e:
        print(f"ERROR: clear_history failed: {e}")
        import traceback
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Clear history failed: {str(e)}")

@router.delete("/{task_id}")
async def delete_task(
    task_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete/cancel a scheduled task."""
    stmt = select(Task).where(Task.id == task_id)
    if current_user.role != "admin":
        stmt = stmt.where(Task.user_id == current_user.id)
        
    result = await db.execute(stmt)
    task = result.scalars().first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status == "running":
        raise HTTPException(status_code=400, detail="Cannot delete running task")
    
    await db.delete(task)
    await db.commit()
    
    return {"message": "Task deleted successfully"}

@router.post("/bulk-delete")
async def bulk_delete_tasks(
    body: TaskBulkDelete,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete multiple tasks by ID."""
    if not body.ids:
        return {"message": "No tasks selected"}
        
    # Check if any tasks are running
    stmt = select(Task).where(Task.id.in_(body.ids))
    if current_user.role != "admin":
        stmt = stmt.where(Task.user_id == current_user.id)
        
    result = await db.execute(stmt)
    tasks = result.scalars().all()
    
    deleted_count = 0
    for task in tasks:
        if task.status != "running":
            await db.delete(task)
            deleted_count += 1
            
    await db.commit()
    return {"message": f"Deleted {deleted_count} tasks"}

@router.post("/{task_id}/retry", response_model=TaskResponse)
async def retry_task(
    task_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retry a failed task."""
    stmt = select(Task).where(Task.id == task_id)
    if current_user.role != "admin":
        stmt = stmt.where(Task.user_id == current_user.id)
        
    result = await db.execute(stmt)
    task = result.scalars().first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or access denied")
        
    if task.status == "running":
        raise HTTPException(status_code=400, detail="Cannot retry running task")
        
    # Reset task
    task.status = "pending"
    task.error_message = None
    task.executed_at = None
    
    await db.commit()
    await db.refresh(task)
    
    # Execute immediately
    background_tasks.add_task(execute_task_now, task.id)
    
    return task

@router.get("/expired-sessions", response_model=List[TaskResponse])
async def list_expired_session_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List failed tasks that are retryable (excluding permanent bans/blocks)."""
    exclude_errors = [
        "banned",
        "IP blacklist",
        "blacklist",
        "challenge",
        "checkpoint"
    ]
    
    stmt = select(Task).where(Task.status == "failed")
    
    # Exclude tasks with permanent error messages
    # Exclude tasks with permanent error messages
    from sqlalchemy import not_, or_
    conditions = [Task.error_message.ilike(f"%{err}%") for err in exclude_errors]
    stmt = stmt.where(not_(or_(*conditions)))
    
    if current_user.role != "admin":
        stmt = stmt.where(Task.user_id == current_user.id)
        
    stmt = stmt.order_by(Task.created_at.desc())
    
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/bulk-retry")
async def bulk_retry_tasks(
    body: TaskBulkDelete, # Reusing schema with list of IDs
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk retry/reschedule failing tasks."""
    if not body.ids:
        return {"message": "No tasks selected"}
        
    # Check tasks and ownership
    stmt = select(Task).where(Task.id.in_(body.ids))
    if current_user.role != "admin":
        stmt = stmt.where(Task.user_id == current_user.id)
        
    result = await db.execute(stmt)
    tasks = result.scalars().all()
    
    retried_count = 0
    for task in tasks:
        if task.status != "running":
            task.status = "pending"
            task.error_message = None
            task.executed_at = None
            # Update scheduled_at to current time to trigger execution
            task.scheduled_at = datetime.utcnow()
            
            background_tasks.add_task(execute_task_now, task.id)
            retried_count += 1
            
    await db.commit()
    return {"message": f"Retried {retried_count} tasks"}

