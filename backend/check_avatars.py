import asyncio
from sqlalchemy import text
from app.db.session import engine

async def check_avatars():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT username, avatar, LENGTH(avatar) as len FROM users WHERE avatar IS NOT NULL"))
        for row in result:
            print(f"User: {row[0]}, Len: {row[2]}, Avatar: {row[1]}")

if __name__ == "__main__":
    asyncio.run(check_avatars())
