from functools import wraps
from fastapi import HTTPException, status, Depends
from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.subscription import Subscription, SubscriptionPlan
import json

from sqlalchemy.ext.asyncio import AsyncSession

async def get_user_subscription(user: User, db: AsyncSession = None) -> Subscription:
    """Get user's active subscription with plan details."""
    if db:
        return await _get_subscription_query(db, user)
    
    async with AsyncSessionLocal() as session:
        return await _get_subscription_query(session, user)

async def _get_subscription_query(db: AsyncSession, user: User) -> Subscription:
    now = datetime.now(timezone.utc)
    stmt = (
        select(Subscription)
        .options(selectinload(Subscription.plan))
        .join(SubscriptionPlan)
        .where(
            Subscription.user_id == user.id,
            Subscription.status == "active",
            Subscription.end_date > now
        )
    )
    result = await db.execute(stmt)
    return result.scalars().first()

async def check_user_limits(user: User, resource_type: str = "account") -> bool:
    """Check if user has reached their subscription limits."""
    sub = await get_user_subscription(user)
    if not sub:
        return False
        
    async with AsyncSessionLocal() as db:
        if resource_type == "account":
            from app.models.account import Account
            from app.models.subscription import SubscriptionAddon
            
            # Get current account count
            stmt = select(func.count(Account.id)).where(Account.user_id == user.id)
            result = await db.execute(stmt)
            count = result.scalar()
            
            # Get base limit from plan
            limit = sub.plan.ig_account_limit
            
            # Add quota from active addons (sub_type='account')
            addon_stmt = select(func.sum(SubscriptionAddon.quantity)).where(
                SubscriptionAddon.user_id == user.id,
                SubscriptionAddon.addon_type == 'quota',
                SubscriptionAddon.sub_type == 'account',
                SubscriptionAddon.is_active == True
            )
            addon_result = await db.execute(addon_stmt)
            addon_quota = addon_result.scalar() or 0
            
            total_limit = limit + addon_quota
            return count < total_limit
            
        elif resource_type == "proxy":
            from app.models.proxy import ProxyTemplate
            from app.models.subscription import SubscriptionAddon
            
            # Get current proxy count
            stmt = select(func.count(ProxyTemplate.id)).where(ProxyTemplate.user_id == user.id)
            result = await db.execute(stmt)
            count = result.scalar()
            
            # Get base limit from plan
            limit = sub.plan.proxy_slot_limit
            
            # Add quota from active addons (sub_type='proxy')
            addon_stmt = select(func.sum(SubscriptionAddon.quantity)).where(
                SubscriptionAddon.user_id == user.id,
                SubscriptionAddon.addon_type == 'quota',
                SubscriptionAddon.sub_type == 'proxy',
                SubscriptionAddon.is_active == True
            )
            addon_result = await db.execute(addon_stmt)
            addon_quota = addon_result.scalar() or 0
            
            total_limit = limit + addon_quota
            # If Supreme (proxy_slot_limit=999999), limit is practically unlimited
            return count < total_limit
            
    return False

async def has_feature(user: User, feature_name: str) -> bool:
    """Check if user's current plan allows a specific feature."""
    sub = await get_user_subscription(user)
    if not sub:
        return False
        
    features = sub.plan.features
    if isinstance(features, str):
        try:
            features = json.loads(features)
        except:
            features = []
            
    return feature_name in features

async def stop_user_tasks(user_id: int):
    """Stop ALL running automation tasks and release proxies immediately upon expiration."""
    from app.models.task import Task
    from app.models.proxy import ProxyTemplate
    
    async with AsyncSessionLocal() as db:
        # 1. Stop all pending/running tasks
        stmt = select(Task).where(
            Task.user_id == user_id,
            Task.status.in_(["pending", "running"])
        )
        result = await db.execute(stmt)
        tasks = result.scalars().all()
        
        for task in tasks:
            task.status = "failed"
            task.error_message = "Subscription expired"
        
        # 2. Release/Freeze Proxy assignments
        proxy_stmt = select(ProxyTemplate).where(ProxyTemplate.user_id == user_id)
        proxy_result = await db.execute(proxy_stmt)
        proxies = proxy_result.scalars().all()
        
        for proxy in proxies:
            proxy.user_id = None # Release the proxy from user
            
        await db.commit()

async def is_subscription_active(user: User) -> bool:
    """Check if user has any active subscription. If expired, triggers auto-stop."""
    sub = await get_user_subscription(user)
    if not sub:
        # If user existed but sub vanished or expired, stop tasks
        await stop_user_tasks(user.id)
        return False
    return True

def require_active_subscription(func):
    """Decorator to protect routes from expired users."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        current_user = kwargs.get("current_user")
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Decorator used on route without current_user dependency"
            )

        if not await is_subscription_active(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Subscription expired. Access restricted to Billing only."
            )
            
        return await func(*args, **kwargs)
    return wrapper

def require_feature(feature_name: str):
    """Decorator to enforce plan-specific feature access."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Decorator used on route without current_user dependency"
                )

            # First check if subscription is even active
            if not await is_subscription_active(current_user):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Subscription expired."
                )

            # Then check for specific feature
            if not await has_feature(current_user, feature_name):
                # 402 Payment Required or 403 Forbidden with custom detail for Frontend to catch
                raise HTTPException(
                    status_code=403,
                    detail=f"FEATURE_RESTRICTED:{feature_name}"
                )
                
            return await func(*args, **kwargs)
        return wrapper
    return decorator
