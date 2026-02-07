
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.account import Account, Fingerprint
from app.services.instagram_service import InstagramService
from sqlalchemy import select

async def check_session_validity(username):
    async with AsyncSessionLocal() as session:
        print(f"Checking session for {username}...")
        stmt = select(Account).where(Account.username == username)
        result = await session.execute(stmt)
        account = result.scalars().first()
        
        if not account:
            print("Account not found in DB")
            return

        stmt_fp = select(Fingerprint).where(Fingerprint.id == account.fingerprint_id)
        result_fp = await session.execute(stmt_fp)
        fingerprint = result_fp.scalars().first()

        print(f"Account Status in DB: {account.status}")
        
        if not account.cookies:
            print("No cookies stored in DB.")
            return

        service = InstagramService(account, fingerprint)
        try:
            print("Verifying session with Instagram...")
            # We manually set cookies from DB then check
            service.client.set_settings(account.cookies)
            
            # This triggers a request to IG (e.g. get_timeline_feed)
            updates = service.check_session()
            print(f"Session Check Result: {updates}")
            
            if updates.get("status") == "active":
                print("SUCCESS: Session is VALID and ACTIVE.")
            else:
                print("FAILURE: Session is INVALID or EXPIRED.")
                
        except Exception as e:
            print(f"Session Check ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    import sys
    username = sys.argv[1] if len(sys.argv) > 1 else "bonnieaurorra"
    loop = asyncio.get_event_loop()
    loop.run_until_complete(check_session_validity(username))
