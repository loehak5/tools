
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
from app.models.account import Fingerprint
from app.services.instagram_service import InstagramService
from sqlalchemy import select

async def debug_upload():
    log_file = "scripts/manual_debug_log.txt"
    with open(log_file, "w") as f:
        f.write("Starting manual debug...\n")
        
    async with AsyncSessionLocal() as session:
        username = "VelvionaffViaffElvira"
        stmt = select(Account).where(Account.username == username)
        result = await session.execute(stmt)
        account = result.scalars().first()
        
        with open(log_file, "a") as f:
            if not account:
                f.write(f"Account {username} not found\n")
                return
                
            stmt_fp = select(Fingerprint).where(Fingerprint.id == account.fingerprint_id)
            result_fp = await session.execute(stmt_fp)
            fingerprint = result_fp.scalars().first()
            
            f.write(f"Testing story upload for {username}...\n")
            service = InstagramService(account, fingerprint)
            
            f.write("Attempting with existing cookies...\n")
            try:
                from PIL import Image
                img = Image.new('RGB', (100, 100), color = (73, 109, 137))
                img_path = "debug_story.jpg"
                img.save(img_path)
                
                # Check session first
                check = await asyncio.to_thread(service.check_session)
                f.write(f"Session check: {check}\n")
                
                f.write("Attempting upload...\n")
                try:
                    res = await asyncio.to_thread(service.post_story, img_path, "Debug Test")
                    f.write(f"Upload Success: {res}\n")
                except Exception as e:
                    f.write(f"Upload Failed: {e}\n")
                    f.write(f"Attempting full reconnect and login...\n")
                    await asyncio.to_thread(service.reconnect)
                    login_res = await asyncio.to_thread(service.login, force_full_login=True)
                    f.write(f"Login Result: {login_res}\n")
                    
                    f.write("Retrying upload after login...\n")
                    res = await asyncio.to_thread(service.post_story, img_path, "Debug Test (Retried)")
                    f.write(f"Upload Success after login: {res}\n")
                    
            except Exception as e:
                f.write(f"Final Debug Error: {e}\n")
                import traceback
                traceback.print_exc(file=f)
            finally:
                if os.path.exists("debug_story.jpg"):
                    os.remove("debug_story.jpg")

if __name__ == "__main__":
    asyncio.run(debug_upload())
