import asyncio
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.account import Account
from sqlalchemy import select, update

async def main():
    print("Connecting to DB...")
    async with AsyncSessionLocal() as db:
        print("Connected. Checking for stuck accounts...")
        stmt = select(Account).where(Account.status.in_(["authenticating", "logging_in"])) 
        # Note: Frontend displays "Logging in..." for status="authenticating" usually, 
        # but let's check what the actual string is. 
        # In accounts.py perform_login, it doesn't set status to "logging_in" explicitly before "Calling service.login".
        # It relies on the API setting it?
        
        # Let's check ALL accounts.
        stmt = select(Account)
        result = await db.execute(stmt)
        accounts = result.scalars().all()
        
        for acc in accounts:
            print(f"Account {acc.username} status: {acc.status}")
            if acc.status in ["authenticating", "logging_in", "processing"]: # Add typical "stuck" statuses
                print(f"Resetting {acc.username} to failed...")
                acc.status = "failed"
                acc.last_error = "Login process stuck/reset by admin."
                db.add(acc)
        
        await db.commit()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(main())
