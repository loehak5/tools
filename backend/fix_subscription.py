"""
Fix subscription status - activate subscription for admin user
"""
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.subscription import Subscription, SubscriptionPlan
from sqlalchemy import select
from datetime import datetime, timezone, timedelta

async def fix_subscription():
    print("=" * 60)
    print("Fixing Subscription Status")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        # Get admin user (usually the first user or user with role 'admin')
        result = await db.execute(select(User).where(User.role == 'admin'))
        admin_user = result.scalars().first()
        
        if not admin_user:
            # Fallback: get first user
            result = await db.execute(select(User))
            admin_user = result.scalars().first()
        
        if not admin_user:
            print("⚠️  No users found in database!")
            return
        
        print(f"\nUser: {admin_user.username} (ID: {admin_user.id})")
        
        # Check if premium plan exists, create if not
        plan_result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == 'premium'))
        plan = plan_result.scalars().first()
        
        if not plan:
            print("  Creating 'premium' subscription plan...")
            plan = SubscriptionPlan(
                id='premium',
                name='Premium Plan',
                price_idr=0,
                duration_days=365,
                ig_account_limit=999999,
                proxy_slot_limit=999999,
                features=["follow", "like", "reels", "story", "post"],
                allow_addons=True,
                is_active=True
            )
            db.add(plan)
            await db.commit()
            print("  ✅ Created premium plan")
        
        # Check existing subscription
        stmt = select(Subscription).where(Subscription.user_id == admin_user.id)
        sub_result = await db.execute(stmt)
        subscription = sub_result.scalars().first()
        
        now = datetime.now(timezone.utc)
        end_date = now + timedelta(days=365)  # 1 year from now
        
        if subscription:
            print(f"  Found existing subscription (status: {subscription.status})")
            # Update existing subscription
            subscription.status = "active"
            subscription.end_date = end_date
            subscription.plan_id = 'premium'
            print(f"  ✅ Updated subscription status to 'active'")
            print(f"  ✅ Extended end_date to: {end_date}")
        else:
            print(f"  No subscription found. Creating new one...")
            # Create new subscription
            new_sub = Subscription(
                user_id=admin_user.id,
                plan_id='premium',
                status="active",
                start_date=now,
                end_date=end_date
            )
            db.add(new_sub)
            print(f"  ✅ Created new 'active' subscription")
            print(f"  ✅ Plan: premium")
            print(f"  ✅ End date: {end_date}")
        
        await db.commit()
        print("\n✅ Subscription fixed successfully!")
        print("\nYou can now use the story automation feature.")
    
    print("=" * 60)

asyncio.run(fix_subscription())
