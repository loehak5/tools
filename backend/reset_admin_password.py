"""
Reset admin password to "admin"
"""
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy import select

async def reset_admin_password():
    print("=" * 60)
    print("Resetting Admin Password")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        # Find admin user
        result = await db.execute(select(User).where(User.username == "admin"))
        admin = result.scalars().first()
        
        if not admin:
            print("❌ Admin user not found!")
            print("Creating new admin user...")
            
            # Create new admin user
            new_admin = User(
                username="admin",
                hashed_password=get_password_hash("admin"),
                full_name="Administrator",
                role="admin",
                is_active=True
            )
            db.add(new_admin)
            await db.commit()
            print("✅ Created new admin user")
        else:
            # Reset password
            admin.hashed_password = get_password_hash("admin")
            await db.commit()
            print(f"✅ Password reset for user: {admin.username}")
        
        print("\nLogin credentials:")
        print("  Username: admin")
        print("  Password: admin")
    
    print("=" * 60)

asyncio.run(reset_admin_password())
