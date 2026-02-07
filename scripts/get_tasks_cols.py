import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def check_cols():
    engine = create_async_engine(MYSQL_URL)
    try:
        async with engine.begin() as conn:
            res = await conn.execute(text("DESCRIBE tasks"))
            cols = res.fetchall()
            print("COLUMNS_START")
            for c in cols:
                print(f"COL: {c[0]} | TYPE: {c[1]}")
            print("COLUMNS_END")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_cols())
