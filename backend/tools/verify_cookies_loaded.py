
import sys
import os
import asyncio
import json

# Add backend to path
# strict absolute path to backend
backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from app.db.session import AsyncSessionLocal
from app.models.account import Account, Fingerprint
from app.services.instagram_service import InstagramService
from sqlalchemy import select, desc

async def verify_cookies_loading():
    print("Starting verification...")
    async with AsyncSessionLocal() as session:
        # Get an account that has cookies
        stmt = select(Account).where(Account.cookies.isnot(None)).limit(1)
        result = await session.execute(stmt)
        account = result.scalars().first()
        
        if not account:
            print("No account with cookies found in DB. Cannot verify.")
            return

        print(f"Testing with account: {account.username}")
        
        # Get fingerprint
        stmt_fp = select(Fingerprint).where(Fingerprint.id == account.fingerprint_id)
        result_fp = await session.execute(stmt_fp)
        fingerprint = result_fp.scalars().first()
        
        if not fingerprint:
            print("Fingerprint not found for account.")
            return

        # Initialize service
        print("Initializing InstagramService...")
        service = InstagramService(account, fingerprint)
        
        # Check if settings are loaded
        client_settings = service.client.get_settings()
        
        # We can check specific keys, e.g., sessionid
        if "sessionid" in client_settings and client_settings["sessionid"] == account.cookies.get("sessionid"):
             print("SUCCESS: Session cookies were loaded into the client.")
        else:
             print("FAILURE: Session cookies were NOT loaded into the client.")
             print(f"Client settings keys: {client_settings.keys()}")
             print(f"Account cookies keys: {account.cookies.keys()}")

if __name__ == "__main__":
    try:
        asyncio.run(verify_cookies_loading())
    except Exception as e:
        with open("error.log", "w") as f:
            import traceback
            traceback.print_exc(file=f)
        print("Error occurred. Check error.log")
