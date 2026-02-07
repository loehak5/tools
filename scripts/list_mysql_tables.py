import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def list_tables():
    e = create_async_engine(MYSQL_URL)
    async with e.begin() as c:
        res = await c.execute(text("SHOW TABLES"))
        tables = [r[0] for r in res.fetchall()]
        print(f"Tables in MySQL: {tables}")
    await e.dispose()

if __name__ == "__main__":
    asyncio.run(list_tables())
