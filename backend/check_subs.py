import asyncio
import sys
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.subscription import Subscription
from app.models.account import Account
from sqlalchemy import select
from datetime import datetime, timezone

async def check_user_and_subs():
    output = []
    async with AsyncSessionLocal() as db:
        try:
            # Check users
            output.append("--- USERS ---")
            stmt_u = select(User)
            result_u = await db.execute(stmt_u)
            users = result_u.scalars().all()
            for u in users:
                username = getattr(u, "username", "N/A")
                role = getattr(u, "role", "N/A")
                output.append(f"ID: {u.id} | Username: {username} | Role: {role}")
            
            # Check subscriptions
            output.append("\n--- SUBSCRIPTIONS ---")
            now = datetime.now(timezone.utc)
            stmt_s = select(Subscription)
            result_s = await db.execute(stmt_s)
            subs = result_s.scalars().all()
            for s in subs:
                end_date = getattr(s, "end_date", None)
                if end_date and end_date.tzinfo is None:
                    end_date = end_date.replace(tzinfo=timezone.utc)
                is_active = s.status == "active" and (end_date > now if end_date else False)
                output.append(f"User ID: {s.user_id} | Status: {s.status} | Ends: {end_date} | Active: {is_active}")

            # Check accounts distribution
            output.append("\n--- ACCOUNTS OWNERSHIP ---")
            stmt_a = select(Account)
            result_a = await db.execute(stmt_a)
            accounts = result_a.scalars().all()
            ownership = {}
            for a in accounts:
                uid = a.user_id
                ownership[uid] = ownership.get(uid, 0) + 1
            for uid, count in ownership.items():
                output.append(f"User ID: {uid} | Account Count: {count}")

            # Check first 5 accounts in detail
            output.append("\n--- DETAIL FIRST 5 ACCOUNTS ---")
            for a in accounts[:5]:
                output.append(f"ID: {a.id} | User ID: {a.user_id} | Username: {a.username} | Status: {a.status}")

        except Exception as e:
            output.append(f"Error: {e}")
            import traceback
            output.append(traceback.format_exc())

    with open("check_subs_final.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(output))

if __name__ == "__main__":
    asyncio.run(check_user_and_subs())
