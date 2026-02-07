import asyncio
import os
from dotenv import load_dotenv

# Load environment variables from .env file
base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base_dir, ".env"))

from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy.future import select

async def init_admin():
    async with AsyncSessionLocal() as db:
        # Check if admin already exists
        result = await db.execute(select(User).where(User.username == "admin"))
        user = result.scalars().first()
        
        if user:
            print("Updating admin user password with new hashing scheme...")
            user.hashed_password = get_password_hash("admin123")
        else:
            # Create admin user
            user = User(
                username="admin",
                hashed_password=get_password_hash("admin123"), # Default password
                role="admin",
                full_name="Administrator",
                is_active=True
            )
            db.add(user)
        
        await db.commit()
        print("Admin user initialized successfully!")
        print("Username: admin")
        print("Password: admin123")
        print("Please change your password after logging in.")

if __name__ == "__main__":
    asyncio.run(init_admin())
