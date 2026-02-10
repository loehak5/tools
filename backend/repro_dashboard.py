import sys
import os
import asyncio
from dotenv import dotenv_values
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.user import User
from app.models.account import Account
from app.models.task import Task
from app.models.proxy import ProxyTemplate
from app.models.subscription import Subscription, SubscriptionPlan, SubscriptionAddon
from app.middleware.auth_check import get_user_subscription
from app.core.tz_utils import now_jakarta

async def main():
    config = dotenv_values(".env")
    db_url = f"mysql+aiomysql://{config['MYSQL_USER']}:{config['MYSQL_PASSWORD']}@{config['MYSQL_HOST']}:{config.get('MYSQL_PORT', '3306')}/{config['MYSQL_DATABASE']}"
    engine = create_async_engine(db_url, echo=False)

    print(f"Connecting to {db_url.split('@')[-1]}")

    async with AsyncSession(engine) as db:
        # Find user
        stmt = select(User).where(User.username.ilike("%anak%"))
        user = (await db.execute(stmt)).scalars().first()
        if not user:
            # Fallback to finding by full name
            # Note: ilike might process spaces differently depending on DB collation but usually ok
            stmt = select(User).where(User.full_name.ilike("%anak%"))
            user = (await db.execute(stmt)).scalars().first()
            
        if not user:
            # Try finding Bagong99 directly as found in previous step
            stmt = select(User).where(User.username == "Bagong99")
            user = (await db.execute(stmt)).scalars().first()

        if not user:
            print("User not found")
            return

        print(f"Testing dashboard stats for user: {user.username} (ID: {user.id})")
        
        try:
            # Replicate dashboard logic
            period = "today"
            now = now_jakarta()
            today_jakarta = now.date()
            period_start = datetime.combine(today_jakarta, datetime.min.time()).replace(tzinfo=now.tzinfo)
            period_end = now

            print("1. Account Stats...")
            stmt_total_acc = select(func.count(Account.id)).where(Account.user_id == user.id)
            total_accounts = (await db.execute(stmt_total_acc)).scalar_one()
            print(f"Total Accounts: {total_accounts}")

            print("2. Task Stats...")
            stmt_tasks = select(func.count(Task.id)).where(and_(Task.created_at >= period_start, Task.user_id == user.id))
            tasks_period = (await db.execute(stmt_tasks)).scalar_one()
            print(f"Tasks Today: {tasks_period}")

            print("8. Subscription (via middleware)...")
            sub = await get_user_subscription(user, db)
            if sub:
                print(f"Subscription Found: {sub.id}, Plan: {sub.plan.name}, End: {sub.end_date}")
                # Check for serialization issues (e.g. Decimal)
                price = sub.plan.price_idr
                print(f"Plan Price Type: {type(price)}")
                print(f"Plan Price Value: {price}")
            else:
                print("Subscription NOT found via get_user_subscription")

            # Check for addons
            print("Checking Addons...")
            stmt_addons = select(SubscriptionAddon).where(SubscriptionAddon.user_id == user.id, SubscriptionAddon.is_active == True)
            addons = (await db.execute(stmt_addons)).scalars().all()
            print(f"Addons count: {len(addons)}")
            for addon in addons:
                print(f"Addon: {addon.addon_type}, Qty: {addon.quantity}, Price: {addon.price_paid} (Type: {type(addon.price_paid)})")

            print("SUCCESS - Data extraction complete")
            
            # Construct partial response to test serialization
            ig_limit = 0
            if sub:
                 ig_limit = sub.plan.ig_account_limit

            # --- STRESS TEST: Validate fields and timezone logic ---
            if sub:
                print(f"Plan IG Limit: {sub.plan.ig_account_limit} (Type: {type(sub.plan.ig_account_limit)})")
                # Test int cast
                ig_limit = int(sub.plan.ig_account_limit) if sub.plan.ig_account_limit is not None else 0
                
                # Test Timezone Subtraction (SAFE VERSION)
                if sub.end_date:
                    print(f"End Date: {sub.end_date} (tzinfo: {sub.end_date.tzinfo})")
                    now_tz = now_jakarta()
                    print(f"Now Jakarta: {now_tz} (tzinfo: {now_tz.tzinfo})")
                    
                    try:
                        end_date_safe = sub.end_date
                        if end_date_safe.tzinfo is None:
                            print("Detecting Naive End Date - Applying Fix")
                            end_date_safe = end_date_safe.replace(tzinfo=now_tz.tzinfo)
                            
                        remaining = end_date_safe - now_tz
                        print(f"Subtraction Success. Remaining: {remaining}")
                    except TypeError as e:
                        print(f"CRASH: Timezone Subtraction Failed: {e}")
                        raise e

            response_data = {
                 "accounts": {
                      "total": 123, # dummy
                      "limit": ig_limit
                 },
                 "subscription": {
                      "plan": sub.plan.name if sub else "FREE",
                      "expiry": sub.end_date.isoformat() if sub and sub.end_date else None,
                      "status": "active" if sub else "inactive"
                 }
            }
            
            import json
            print("Attempting JSON serialization...")
            json_str = json.dumps(response_data)
            print("JSON Serialization SUCCESS")
            
        except TypeError as te:
            print(f"SERIALIZATION/TYPE CRASH: {te}")
            import traceback
            traceback.print_exc()
        except Exception as e:
            print(f"CRASHED: {e}")
            import traceback
            traceback.print_exc()

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
