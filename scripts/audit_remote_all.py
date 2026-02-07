import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

async def audit_all():
    e = create_async_engine(MYSQL_URL)
    tables = ['users', 'accounts', 'fingerprints', 'proxy_templates', 'tasks', 'task_batches']
    
    try:
        async with e.begin() as conn:
            with open("mysql_audit.txt", "w") as f:
                for t in tables:
                    f.write(f"\n--- TABLE: {t} ---\n")
                    try:
                        res = await conn.execute(text(f"DESCRIBE `{t}`"))
                        for r in res.fetchall():
                            f.write(f"COL: {r[0]} | TYPE: {r[1]} | NULL: {r[2]} | EXTRA: {r[5]}\n")
                    except Exception as e_table:
                        f.write(f"Error describing {t}: {e_table}\n")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await e.dispose()

if __name__ == "__main__":
    asyncio.run(audit_all())
