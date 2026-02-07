
import sys
import os
import asyncio

# Set environment variables manually
os.environ["POSTGRES_SERVER"] = "localhost"
os.environ["POSTGRES_USER"] = "app_user"
os.environ["POSTGRES_PASSWORD"] = "app_password"
os.environ["POSTGRES_DB"] = "ig_automation_db"
os.environ["POSTGRES_PORT"] = "5432"

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import AsyncSessionLocal
from app.models.account import Account
from sqlalchemy import select, func

async def analyze_accounts():
    try:
        async with AsyncSessionLocal() as session:
            # Group by status
            stmt = select(Account.status, func.count(Account.id)).group_by(Account.status)
            result = await session.execute(stmt)
            status_counts = result.all()
            
            with open("account_analysis.txt", "w") as f:
                f.write("Account Status Counts:\n")
                for status, count in status_counts:
                    f.write(f"  {status}: {count}\n")
                
                # Proxy distribution for ALL status
                f.write("\nProxy Distribution by Status:\n")
                stmt_proxy_status = select(Account.status, Account.proxy, func.count(Account.id)).group_by(Account.status, Account.proxy).order_by(Account.status, func.count(Account.id).desc())
                res_proxy_status = await session.execute(stmt_proxy_status)
                proxy_statuses = res_proxy_status.all()
                for status, proxy, count in proxy_statuses:
                    f.write(f"  Status: {status}, Proxy: {proxy}, Count: {count}\n")

                f.write("\nInactive Accounts Details (last 10):\n")
                stmt_inactive = select(Account).where(Account.status == 'inactive').limit(10)
                res_inactive = await session.execute(stmt_inactive)
                inactives = res_inactive.scalars().all()
                for acc in inactives:
                    f.write(f"  - Username: {acc.username}, Proxy: {acc.proxy}\n")

    except Exception as e:
        with open("account_analysis_error.txt", "w") as f:
            import traceback
            traceback.print_exc(file=f)

if __name__ == "__main__":
    asyncio.run(analyze_accounts())
