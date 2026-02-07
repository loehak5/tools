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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reproduce_issue")

async def main():
    username = "EmmelinexGibson"
    async with AsyncSessionLocal() as db:
        stmt = select(Account).where(Account.username == username)
        result = await db.execute(stmt)
        account = result.scalars().first()
        
        if not account:
            logger.error(f"Account {username} not found in DB")
            return

        logger.info(f"Testing login for {username}")
        logger.info(f"Proxy: {account.proxy}")
        
        # 1. Test WITH Proxy
        logger.info("--- Attempt 1: WITH PROXY ---")
        cl = Client()
        if account.proxy:
            cl.set_proxy(account.proxy)
        
        try:
            cl.login(account.username, account.password_encrypted)
            logger.info("Login WITH PROXY successful!")
        except Exception as e:
            logger.error(f"Login WITH PROXY failed: {e}")
            import traceback
            traceback.print_exc()
            
        # 2. Test WITHOUT Proxy
        logger.info("--- Attempt 2: WITHOUT PROXY ---")
        cl_direct = Client()
        # cl_direct.set_proxy('') # ensure no proxy
        
        try:
            cl_direct.login(account.username, account.password_encrypted)
            logger.info("Login WITHOUT PROXY successful!")
        except Exception as e:
            logger.error(f"Login WITHOUT PROXY failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
