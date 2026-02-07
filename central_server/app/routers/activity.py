from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.models.activity_log import ActivityLog
from app.schemas.activity import ActivityLogCreate, ActivityLogResponse
from app.routers.auth import get_current_client
from app.models.client import Client

router = APIRouter()


@router.post("/report", response_model=ActivityLogResponse)
async def report_activity(
    activity_data: ActivityLogCreate,
    request: Request,
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db)
):
    """
    Client reports an activity to central server.
    Called by client app when important events happen.
    """
    client_ip = request.client.host if request.client else None
    
    activity_log = ActivityLog(
        client_id=current_client.id,
        activity_type=activity_data.activity_type,
        activity_data=activity_data.activity_data,
        total_accounts=activity_data.total_accounts,
        active_accounts=activity_data.active_accounts,
        total_proxies=activity_data.total_proxies,
        ip_address=client_ip
    )
    
    db.add(activity_log)
    await db.commit()
    await db.refresh(activity_log)
    
    return activity_log


@router.get("/client/{client_id}", response_model=List[ActivityLogResponse])
async def get_client_activities(
    client_id: int,
    skip: int = 0,
    limit: int = 100,
    activity_type: str = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get activity logs for a specific client.
    Admin endpoint untuk melihat semua aktivitas satu client.
    """
    query = select(ActivityLog).where(ActivityLog.client_id == client_id)
    
    if activity_type:
        query = query.where(ActivityLog.activity_type == activity_type)
    
    query = query.order_by(ActivityLog.timestamp.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    activities = result.scalars().all()
    
    return activities
