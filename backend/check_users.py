"""
Test login endpoint
"""
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

async def check_users():
    print("=" * 60)
    print("Checking Users in MySQL Remote Database")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        print(f"\nTotal users: {len(users)}\n")
        
        if users:
            for user in users:
                print(f"Username: {user.username}")
                print(f"  Role: {user.role}")
                print(f"  Full Name: {user.full_name}")
                print(f"  Active: {user.is_active}")
                print(f"  Has password: {'Yes' if user.hashed_password else 'No'}")
                print()
        else:
            print("⚠️  No users found in database!")
            print("You need to create a user first.")
    
    print("=" * 60)

asyncio.run(check_users())
