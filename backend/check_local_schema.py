import asyncio
from sqlalchemy import text
from app.db.session import engine

async def check_schema():
    async with engine.connect() as conn:
        result = await conn.execute(text("DESCRIBE users"))
        for row in result:
            print(row)

if __name__ == "__main__":
    asyncio.run(check_schema())
