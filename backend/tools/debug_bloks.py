import asyncio
import sys
import os
import logging
from instagrapi import Client

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.account import Account
from sqlalchemy import select

# Configure verbose logging for instagrapi
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("debug_bloks")

async def main():
    username = "EmmelinexGibson"
    async with AsyncSessionLocal() as db:
        stmt = select(Account).where(Account.username == username)
        result = await db.execute(stmt)
        account = result.scalars().first()
        
        if not account:
            logger.error(f"Account {username} not found")
            return

        logger.info(f"debug_bloks: Testing login for {username}")
        
        cl = Client()
        if account.proxy:
            cl.set_proxy(account.proxy)
            logger.info(f"Proxy set: {account.proxy}")
            
        try:
            logger.info("Attempting login...")
            cl.login(account.username, account.password_encrypted)
            logger.info("Login SUCCESS")
        except Exception as e:
            logger.error(f"Login FAILED: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
