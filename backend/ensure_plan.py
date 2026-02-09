import asyncio
from app.db.session import AsyncSessionLocal
from app.models.subscription import SubscriptionPlan
from sqlalchemy import select
import decimal

async def ensure_supreme_plan():
    async with AsyncSessionLocal() as db:
        stmt = select(SubscriptionPlan).where(SubscriptionPlan.id == "supreme")
        result = await db.execute(stmt)
        plan = result.scalars().first()
        
        if not plan:
            print("Creating 'supreme' plan...")
            new_plan = SubscriptionPlan(
                id="supreme",
                name="Supreme Plan (God Mode)",
                price_idr=decimal.Decimal("0"),
                duration_days=3650,
                ig_account_limit=1000,
                proxy_slot_limit=1000,
                features=["all"],
                allow_addons=True,
                is_active=True
            )
            db.add(new_plan)
            await db.commit()
            print("'supreme' plan created successfully.")
        else:
            print("'supreme' plan already exists.")

if __name__ == "__main__":
    asyncio.run(ensure_supreme_plan())
