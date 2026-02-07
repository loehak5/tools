from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any
from datetime import date, datetime, timedelta

from app.db.session import get_db
from app.models.client import Client
from app.models.activity_log import ActivityLog
from app.models.usage_stats import UsageStats
from app.schemas.usage_stats import UsageStatsUpdate, UsageStatsResponse

router = APIRouter()


@router.get("/clients", response_model=List[Dict[str, Any]])
async def get_clients_overview(
    db: AsyncSession = Depends(get_db)
):
    """
    Get overview of all clients with their latest stats.
    Admin dashboard endpoint.
    """
    result = await db.execute(select(Client))
    clients = result.scalars().all()
    
    clients_overview = []
    for client in clients:
        # Get latest usage stats
        stats_result = await db.execute(
            select(UsageStats)
            .where(UsageStats.client_id == client.id)
            .order_by(UsageStats.date.desc())
            .limit(1)
        )
        latest_stats = stats_result.scalar_one_or_none()
        
        # Count total activities
        activities_count = await db.execute(
            select(func.count(ActivityLog.id))
            .where(ActivityLog.client_id == client.id)
        )
        total_activities = activities_count.scalar()
        
        clients_overview.append({
            "id": client.id,
            "client_name": client.client_name,
            "company_name": client.company_name,
            "is_active": client.is_active,
            "license_type": client.license_type,
            "last_active": client.last_active,
            "session_active": client.current_session_id is not None,
            "total_activities": total_activities,
            "latest_stats": UsageStatsResponse.model_validate(latest_stats) if latest_stats else None
        })
    
    return clients_overview


@router.get("/clients/{client_id}", response_model=Dict[str, Any])
async def get_client_analytics(
    client_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed analytics for a specific client.
    """
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id {client_id} not found"
        )
    
    # Get all usage stats (last 30 days)
    thirty_days_ago = date.today() - timedelta(days=30)
    stats_result = await db.execute(
        select(UsageStats)
        .where(
            UsageStats.client_id == client_id,
            UsageStats.date >= thirty_days_ago
        )
        .order_by(UsageStats.date.desc())
    )
    usage_stats = stats_result.scalars().all()
    
    # Get recent activities (last 50)
    activities_result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.client_id == client_id)
        .order_by(ActivityLog.timestamp.desc())
        .limit(50)
    )
    recent_activities = activities_result.scalars().all()
    
    # Activity type breakdown
    activity_breakdown_result = await db.execute(
        select(
            ActivityLog.activity_type,
            func.count(ActivityLog.id).label("count")
        )
        .where(ActivityLog.client_id == client_id)
        .group_by(ActivityLog.activity_type)
    )
    activity_breakdown = {row[0]: row[1] for row in activity_breakdown_result.all()}
    
    return {
        "client_info": {
            "id": client.id,
            "client_name": client.client_name,
            "company_name": client.company_name,
            "email": client.email,
            "phone": client.phone,
            "is_active": client.is_active,
            "license_type": client.license_type,
            "license_start": client.license_start,
            "license_end": client.license_end,
            "created_at": client.created_at,
            "last_active": client.last_active,
            "session_active": client.current_session_id is not None,
            "current_device_info": client.current_device_info
        },
        "usage_stats": [UsageStatsResponse.model_validate(stat) for stat in usage_stats],
        "recent_activities": recent_activities,
        "activity_breakdown": activity_breakdown
    }


@router.post("/clients/{client_id}/stats", response_model=UsageStatsResponse)
async def update_client_stats(
    client_id: int,
    stats_data: UsageStatsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update or create usage stats for a client.
    Called by client app to report daily stats.
    """
    today = date.today()
    
    # Check if stats for today already exist
    result = await db.execute(
        select(UsageStats).where(
            UsageStats.client_id == client_id,
            UsageStats.date == today
        )
    )
    existing_stats = result.scalar_one_or_none()
    
    if existing_stats:
        # Update existing stats
        update_data = stats_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(existing_stats, field, value)
        existing_stats.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(existing_stats)
        return existing_stats
    else:
        # Create new stats
        new_stats = UsageStats(
            client_id=client_id,
            date=today,
            **stats_data.model_dump()
        )
        db.add(new_stats)
        await db.commit()
        await db.refresh(new_stats)
        return new_stats


@router.get("/clients/{client_id}/usage-trend")
async def get_usage_trend(
    client_id: int,
    days: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """
    Get usage trend for a client over specified number of days.
    Returns daily task completion rates, account growth, etc.
    """
start_date = date.today() - timedelta(days=days)
    
    result = await db.execute(
        select(UsageStats)
        .where(
            UsageStats.client_id == client_id,
            UsageStats.date >= start_date
        )
        .order_by(UsageStats.date.asc())
    )
    stats = result.scalars().all()
    
    trend_data = {
        "dates": [stat.date.isoformat() for stat in stats],
        "total_accounts": [stat.total_accounts for stat in stats],
        "active_accounts": [stat.active_accounts for stat in stats],
        "tasks_completed": [stat.tasks_completed for stat in stats],
        "tasks_failed": [stat.tasks_failed for stat in stats],
        "success_rate": [
            (stat.tasks_completed / (stat.tasks_completed + stat.tasks_failed) * 100)
            if (stat.tasks_completed + stat.tasks_failed) > 0 else 0
            for stat in stats
        ]
    }
    
    return trend_data
