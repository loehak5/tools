import asyncio
import os
import sys

# Set environment variables
os.environ['POSTGRES_SERVER'] = 'localhost'
os.environ['POSTGRES_USER'] = 'app_user'
os.environ['POSTGRES_PASSWORD'] = 'app_password'
os.environ['POSTGRES_DB'] = 'ig_automation_db'
os.environ['POSTGRES_PORT'] = '5432'

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import select, text
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from app.models.account import Account

async def find_banned_accounts():
    async with AsyncSessionLocal() as session:
        # Search for error messages containing "can't find an account"
        stmt = text("""
            SELECT DISTINCT a.username, a.id, t.error_message
            FROM tasks t
            JOIN accounts a ON t.account_id = a.id
            WHERE t.error_message ILIKE '%can''t find an account%'
        """)
        
        result = await session.execute(stmt)
        rows = result.all()
        
        print(f"IDENTIFIED BANNED/MISSING ACCOUNTS ({len(rows)} total):")
        print("-" * 50)
        
        if not rows:
            print("No accounts found with 'Not Found' error messages.")
            return

        with open("banned_accounts_list.txt", "w") as f:
            f.write("LIST OF LIKELY BANNED/DELETED ACCOUNTS:\n\n")
            for username, acc_id, error in rows:
                output = f"User: @{username} (ID: {acc_id})\nError: {error}\n"
                print(output)
                f.write(output + "-" * 30 + "\n")
        
        print("-" * 50)
        print("List saved to banned_accounts_list.txt")

if __name__ == "__main__":
    asyncio.run(find_banned_accounts())
