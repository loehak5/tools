import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import datetime
import json
import traceback

PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"
MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

TABLES = ['users', 'fingerprints', 'accounts', 'proxies', 'tasks']

def format_mysql_val(val):
    if val is None:
        return "NULL"
    if isinstance(val, (dict, list)):
        json_str = json.dumps(val)
        return "'" + json_str.replace("'", "''") + "'"
    if isinstance(val, (datetime.datetime, datetime.date)):
        # MySQL standard format
        return "'" + val.strftime('%Y-%m-%d %H:%M:%S') + "'"
    if isinstance(val, str):
        return "'" + val.replace("'", "''") + "'"
    if isinstance(val, bool):
        return "1" if val else "0"
    return str(val)

    try:
        pg_engine = create_async_engine(PG_URL)
        mysql_engine = create_async_engine(MYSQL_URL)
        
        async with pg_engine.begin() as pg_conn:
            async with mysql_engine.begin() as ms_conn:
                with open(output_file, "w", encoding="utf-8") as f:
                    # ... rest of the file ...
                    pass
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

                with open(output_file, "w", encoding="utf-8") as f:
                    f.write("-- Robust MySQL Compatible Export\n")
                    f.write("SET FOREIGN_KEY_CHECKS = 0;\n")
                    f.write("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n")
                    
                    for table in TABLES:
                        print(f"📊 Processing {table}...")
                        
                        # Get MySQL Columns
                        ms_res = await ms_conn.execute(text(f"SHOW COLUMNS FROM {table}"))
                        ms_cols = {r[0] for r in ms_res.fetchall()}
                        
                        # Get PG Columns and Data
                        pg_res = await pg_conn.execute(text(f"SELECT * FROM {table}"))
                        pg_cols = pg_res.keys()
                        
                        # Only export common columns
                        common_cols = [c for c in pg_cols if c in ms_cols]
                        
                        f.write(f"-- Table: {table}\n")
                        
                        rows = pg_res.fetchall()
                        if not rows:
                            f.write(f"-- No data found for {table}\n\n")
                            continue
                        
                        col_list = ", ".join(["`" + c + "`" for c in common_cols])
                        
                        for row in rows:
                            r_dict = row._asdict()
                            val_list = [format_mysql_val(r_dict[c]) for c in common_cols]
                            f.write(f"REPLACE INTO `{table}` ({col_list}) VALUES ({', '.join(val_list)});\n")
                        
                        f.write("\n")
                        
                    f.write("SET FOREIGN_KEY_CHECKS = 1;\n")
        
        print(f"\n✅ Success! File saved to: {output_file}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        traceback.print_exc()
    finally:
        await pg_engine.dispose()
        await mysql_engine.dispose()

if __name__ == "__main__":
    asyncio.run(generate_perfect_sql())
