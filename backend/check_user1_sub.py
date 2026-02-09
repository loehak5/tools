import asyncio
from app.db.session import AsyncSessionLocal
from app.models.subscription import Subscription
from sqlalchemy import select

async def check_user1_sub():
    async with AsyncSessionLocal() as db:
        stmt = select(Subscription).where(Subscription.user_id == 1)
        result = await db.execute(stmt)
        sub = result.scalars().first()
        with open("user1_sub_debug.txt", "w") as f:
            if sub:
                f.write(f"plan_id: {sub.plan_id}\n")
                f.write(f"status: {sub.status}\n")
                f.write(f"start: {sub.start_date}\n")
                f.write(f"end: {sub.end_date}\n")
            else:
                f.write("No sub found for User 1\n")

if __name__ == "__main__":
    asyncio.run(check_user1_sub())
