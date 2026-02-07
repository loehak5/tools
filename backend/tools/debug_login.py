import sys
import os
import asyncio
from sqlalchemy import select

sys.path.append("/app")
from app.db.session import AsyncSessionLocal
from app.models.account import Account, Fingerprint
from app.services.instagram_service import InstagramService

async def debug_login():
    async with AsyncSessionLocal() as session:
        print("\n--- Direct Login Debug ---")
        # Get first active account
        stmt = select(Account).limit(1)
        result = await session.execute(stmt)
        account = result.scalars().first()
        
        if not account:
            print("No accounts found.")
            return

        print(f"Testing account: {account.username} (ID: {account.id})")
        
        # Get fingerprint
        stmt_fp = select(Fingerprint).where(Fingerprint.id == account.fingerprint_id)
        result_fp = await session.execute(stmt_fp)
        fingerprint = result_fp.scalars().first()
        
        if not fingerprint:
            print("Fingerprint not found.")
            return
            
        service = InstagramService(account, fingerprint)
        
        try:
            print("Attempting login...")
            result = await asyncio.to_thread(service.login)
            print("Login Result:", result)
        except Exception as e:
            print(f"LOGIN FAILED: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_login())
