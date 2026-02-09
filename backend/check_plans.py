import asyncio
from app.db.session import AsyncSessionLocal
from app.models.subscription import SubscriptionPlan
from sqlalchemy import select

async def check_plans():
    async with AsyncSessionLocal() as db:
        stmt = select(SubscriptionPlan)
        result = await db.execute(stmt)
        plans = result.scalars().all()
        print("--- PLANS ---")
        for p in plans:
            print(f"ID: {p.id} | Name: {p.name}")

if __name__ == "__main__":
    asyncio.run(check_plans())
