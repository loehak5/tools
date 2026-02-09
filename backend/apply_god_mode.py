import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.subscription import Subscription
from sqlalchemy import select, update
from datetime import datetime, timedelta, timezone

async def make_god_mode(username: str):
    async with AsyncSessionLocal() as db:
        # 1. Find the user
        stmt = select(User).where(User.username == username)
        result = await db.execute(stmt)
        user = result.scalars().first()
        
        if not user:
            print(f"User {username} not found!")
            return

        print(f"Applying God Mode for {username} (ID: {user.id})...")

        # 2. Upgrade to Admin role
        user.role = "admin"
        
        # 3. Add or Update Subscription to be active for a long time
        stmt_sub = select(Subscription).where(Subscription.user_id == user.id)
        result_sub = await db.execute(stmt_sub)
        sub = result_sub.scalars().first()
        
        now = datetime.now(timezone.utc)
        future_date = now + timedelta(days=3650) # 10 years
        
        if sub:
            sub.status = "active"
            sub.plan_id = "supreme"
            sub.start_date = now
            sub.end_date = future_date
            print(f"Updated existing subscription for {username}")
        else:
            new_sub = Subscription(
                user_id=user.id,
                plan_id="supreme", # Added mandatory field
                start_date=now,    # Added mandatory field
                status="active",
                end_date=future_date
            )
            db.add(new_sub)
            print(f"Created new long-term subscription for {username}")
            
        await db.commit()
        print(f"God Mode successfully applied to {username}!")

if __name__ == "__main__":
    asyncio.run(make_god_mode("Bagong99"))
