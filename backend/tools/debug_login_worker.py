
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.account import Account, Fingerprint
from app.services.instagram_service import InstagramService
from sqlalchemy import select

async def test_login(account_id):
    async with AsyncSessionLocal() as session:
        print(f"Searching for Account ID {account_id}...")
        stmt = select(Account).where(Account.id == int(account_id))
        result = await session.execute(stmt)
        account = result.scalars().first()
        
        if not account:
            print("Account not found in DB")
            return

        stmt_fp = select(Fingerprint).where(Fingerprint.id == account.fingerprint_id)
        result_fp = await session.execute(stmt_fp)
        fingerprint = result_fp.scalars().first()

        print(f"Found account {account.username} (ID: {account.id}) with proxy {account.proxy}")
        
        service = InstagramService(account, fingerprint)
        try:
            print("Attempting login...")
            res = service.login()
            print("Login result:", res)
        except Exception as e:
            print(f"Login ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    import sys
    acc_id = sys.argv[1]
    loop = asyncio.get_event_loop()
    loop.run_until_complete(test_login(acc_id))
