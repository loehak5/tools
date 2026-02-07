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
            with open("tasks_cols.txt", "w") as f:
                for c in cols:
                    f.write(f"COL: {c[0]} | TYPE: {c[1]}\n")
            
            res_create = await conn.execute(text("SHOW CREATE TABLE tasks"))
            row = res_create.fetchone()
            if row:
                with open("tasks_schema.txt", "w") as f:
                    f.write(row[1])
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_cols())
