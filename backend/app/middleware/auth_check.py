from functools import wraps
from fastapi import HTTPException, status, Depends
from datetime import datetime, timezone
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.subscription import Subscription
from app.routers.deps import get_current_user

async def is_subscription_active(user: User) -> bool:
    """
    Check if user has an active subscription in the remote database.
    Trial system removed as per user request.
    """
    # Subscription Check
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        stmt = select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == "active",
            Subscription.end_date > now
        )
        result = await db.execute(stmt)
        sub = result.scalars().first()
        
        if sub:
            return True
            
    return False

def require_active_subscription(func):
    """
    Decorator to protect routes from expired users.
    Rule 5: Immediately revoke access when current_time > subscription_end_date.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # We expect current_user to be passed via Depends in the router
        # If not, we try to find it in kwargs or raise error
        current_user = kwargs.get("current_user")
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Decorator used on route without current_user dependency"
            )

        if not await is_subscription_active(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Subscription expired or trial limit reached. Please visit billing."
            )
            
        return await func(*args, **kwargs)
    return wrapper

async def stop_user_tasks(user_id: int):
    """
    Rule 5.2: Stop ALL running automation tasks immediately upon expiration.
    """
    from app.models.task import Task
    async with AsyncSessionLocal() as db:
        stmt = select(Task).where(
            Task.user_id == user_id,
            Task.status.in_(["pending", "running"])
        )
        result = await db.execute(stmt)
        tasks = result.scalars().all()
        
        for task in tasks:
            task.status = "failed"
            task.error_message = "Subscription expired"
        
        await db.commit()
        print(f"Stopped {len(tasks)} tasks for user {user_id} due to expiry.")
