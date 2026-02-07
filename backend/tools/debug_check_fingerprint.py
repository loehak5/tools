import asyncio
import sys
import os
import json

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.account import Account, Fingerprint
from sqlalchemy import select

async def main():
    username = "ClodaghxGaffney"
    async with AsyncSessionLocal() as db:
        # Get Account
        stmt = select(Account).where(Account.username == username)
        result = await db.execute(stmt)
        account = result.scalars().first()
        
        with open("fingerprint_info.txt", "w") as f:
            if not account:
                f.write(f"Account {username} not found\n")
                return

            f.write(f"Account: {account.username}\n")
            f.write(f"Fingerprint ID: {account.fingerprint_id}\n")
            
            if account.fingerprint_id:
                # Get Fingerprint
                stmt_fp = select(Fingerprint).where(Fingerprint.id == account.fingerprint_id)
                res_fp = await db.execute(stmt_fp)
                fp = res_fp.scalars().first()
                
                if fp:
                    f.write(f"Fingerprint Created At: {fp.created_at}\n")
                    f.write(f"User Agent: {fp.user_agent}\n")
                    f.write(f"Details: {json.dumps(fp.raw_fingerprint, indent=2)}\n")
                else:
                    f.write("Fingerprint ID set but record not found!\n")
            else:
                f.write("No Fingerprint assigned!\n")

if __name__ == "__main__":
    asyncio.run(main())
