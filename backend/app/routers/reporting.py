from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.models.task_batch import TaskBatch
from app.models.task import Task
from app.schemas.task import TaskBatchResponse, TaskResponse, TaskBatchCreate
from app.services.verification_service import VerificationService

from app.routers.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/batches", response_model=List[TaskBatchResponse])
async def list_batches(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List task batches for reporting."""
    stmt = select(TaskBatch)
    
    if current_user.role != "admin":
        stmt = stmt.where(TaskBatch.user_id == current_user.id)
        
    stmt = stmt.order_by(desc(TaskBatch.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/batches/{batch_id}", response_model=TaskBatchResponse)
async def get_batch(
    batch_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific batch summary."""
    stmt = select(TaskBatch).where(TaskBatch.id == batch_id)
    if current_user.role != "admin":
        stmt = stmt.where(TaskBatch.user_id == current_user.id)
        
    result = await db.execute(stmt)
    batch = result.scalars().first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found or access denied")
    return batch

@router.get("/batches/{batch_id}/tasks", response_model=List[TaskResponse])
async def get_batch_tasks(
    batch_id: int, 
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tasks belonging to a specific batch."""
    # Verify access to batch first
    stmt_batch = select(TaskBatch).where(TaskBatch.id == batch_id)
    if current_user.role != "admin":
        stmt_batch = stmt_batch.where(TaskBatch.user_id == current_user.id)
    
    res_batch = await db.execute(stmt_batch)
    if not res_batch.scalars().first():
        raise HTTPException(status_code=404, detail="Batch not found or access denied")

    stmt = select(Task).where(Task.batch_id == batch_id).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/batches", response_model=TaskBatchResponse)
async def create_batch(
    batch_in: TaskBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new task batch."""
    batch = TaskBatch(
        task_type=batch_in.task_type,
        params=batch_in.params,
        total_count=batch_in.total_count,
        status="pending",
        user_id=current_user.id
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch)
    return batch

@router.post("/batches/{batch_id}/verify")
async def verify_batch_results(
    batch_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trigger verification of batch results using checker account."""
    # Verify access
    stmt = select(TaskBatch).where(TaskBatch.id == batch_id)
    if current_user.role != "admin":
        stmt = stmt.where(TaskBatch.user_id == current_user.id)
        
    result = await db.execute(stmt)
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Batch not found or access denied")

    service = VerificationService(db)
    results = await service.verify_batch(batch_id)
    return results

@router.delete("/batches/{batch_id}")
async def delete_batch(
    batch_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a batch and dissociate its tasks."""
    stmt = select(TaskBatch).where(TaskBatch.id == batch_id)
    if current_user.role != "admin":
        stmt = stmt.where(TaskBatch.user_id == current_user.id)
        
    result = await db.execute(stmt)
    batch = result.scalars().first()
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found or access denied")
    
    # Dissociate tasks
    from sqlalchemy import update
    await db.execute(
        update(Task).where(Task.batch_id == batch_id).values(batch_id=None)
    )
    
    # Delete the batch
    await db.delete(batch)
    await db.commit()
    
    return {"message": "Batch deleted successfully"}
