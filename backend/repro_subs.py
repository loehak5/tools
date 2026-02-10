import sys
import os
import asyncio
from dotenv import dotenv_values
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

# Add parent dir to path (assuming this script is in backend/)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.user import User
from app.models.subscription import Subscription, SubscriptionPlan
from app.core.tz_utils import now_jakarta

async def main():
    config = dotenv_values(".env")
    if not config.get("MYSQL_HOST"):
        print("Error: MYSQL_HOST not set")
        return

    db_url = f"mysql+aiomysql://{config['MYSQL_USER']}:{config['MYSQL_PASSWORD']}@{config['MYSQL_HOST']}:{config.get('MYSQL_PORT', '3306')}/{config['MYSQL_DATABASE']}"
    # Remove aiomysql warning relative to echo if needed, just kept echo=False
    engine = create_async_engine(db_url, echo=False)

    print(f"Connecting to {db_url.split('@')[-1]}")

    async with AsyncSession(engine) as session:
        # 1. Find User by username or full_name
        print("\n--- Users (Searching for 'Anak') ---")
        stmt = select(User).where(
            (User.username.ilike("%anak%")) | 
            (User.full_name.ilike("%anak%"))
        )
        result = await session.execute(stmt)
        users = result.scalars().all()
        for u in users:
            print(f"User ID: {u.id}, Username: {u.username}, Full Name: {u.full_name}, Role: {u.role}")

        if not users:
            print("User 'Anak' not found. Listing ALL users...")
            stmt = select(User)
            users = (await session.execute(stmt)).scalars().all()
            for u in users:
                print(f"User ID: {u.id}, Username: {u.username}, Full Name: {u.full_name}")

        target_user = users[0] if users else None
        if not target_user:
            return

        print(f"\n--- Subscriptions for {target_user.username} (ID: {target_user.id}) ---")
        stmt = select(Subscription).options(selectinload(Subscription.plan)).where(Subscription.user_id == target_user.id)
        result = await session.execute(stmt)
        subs = result.scalars().all()
        
        for sub in subs:
            print(f"Sub ID: {sub.id}, Plan: {sub.plan.name} (ID: {sub.plan_id}), Status: {sub.status}, End: {sub.end_date}")

        # Reproduce _get_subscription_query logic
        print("\n--- Active Subscription Query Result (Current Logic) ---")
        now = now_jakarta()
        stmt = (
            select(Subscription)
            .options(selectinload(Subscription.plan))
            .join(SubscriptionPlan)
            .where(
                Subscription.user_id == target_user.id,
                Subscription.status == "active",
                Subscription.end_date > now
            )
        )
        result = await session.execute(stmt)
        active_sub = result.scalars().first()
        
        if active_sub:
            print(f"FOUND: Plan {active_sub.plan.name} (ID: {active_sub.plan_id})")
        else:
            print("NONE FOUND")

        # 2. Check Plans
        print("\n--- All Plans ---")
        stmt = select(SubscriptionPlan)
        plans = (await session.execute(stmt)).scalars().all()
        for p in plans:
            print(f"Plan ID: {p.id}, Name: {p.name}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
