"""
Check subscription status for current user
"""
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.subscription import Subscription
from sqlalchemy import select
from datetime import datetime, timezone

async def check_subscription():
    print("=" * 60)
    print("Checking Subscription Status")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        # Get all users
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        print(f"\nTotal users: {len(users)}\n")
        
        now = datetime.now(timezone.utc)
        
        for user in users:
            print(f"User: {user.username} (ID: {user.id})")
            print(f"  Role: {user.role}")
            
            # Check subscription
            stmt = select(Subscription).where(Subscription.user_id == user.id)
            sub_result = await db.execute(stmt)
            subscriptions = sub_result.scalars().all()
            
            if subscriptions:
                for sub in subscriptions:
                    print(f"  Subscription:")
                    print(f"    Status: {sub.status}")
                    print(f"    Plan: {sub.plan}")
                    print(f"    Start: {sub.start_date}")
                    print(f"    End: {sub.end_date}")
                    print(f"    Current time: {now}")
                    print(f"    Is Active: {sub.status == 'active' and sub.end_date > now}")
            else:
                print(f"  ⚠️  NO SUBSCRIPTION FOUND!")
            
            print()
    
    print("=" * 60)

asyncio.run(check_subscription())
