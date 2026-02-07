import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import datetime
import json
import traceback
import sys

# Force encoding to utf-8 for prints if needed
# sys.stdout.reconfigure(encoding='utf-8')

PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"
MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

# Targeted tables
TABLES = ['users', 'fingerprints', 'accounts', 'proxy_templates', 'tasks', 'task_batches']

# Mapping PG columns to MySQL columns (if different)
MAPPINGS = {
    "proxy_templates": {
        "proxy_url": "proxy_string"
    },
    "tasks": {
        "params": "config"
    },
    "task_batches": {
        "params": "config",
        "total_count": "total_tasks",
        "success_count": "completed_tasks",
        "failed_count": "failed_tasks"
    }
}

def format_mysql_val(val, is_json=False):
    if val is None:
        return "'{}'" if is_json else "NULL"
    if isinstance(val, (dict, list)):
        return "'" + json.dumps(val).replace("'", "''") + "'"
    if isinstance(val, (datetime.datetime, datetime.date)):
        return "'" + val.strftime('%Y-%m-%d %H:%M:%S') + "'"
    if isinstance(val, str):
        return "'" + val.replace("'", "''") + "'"
    if isinstance(val, bool):
        return "1" if val else "0"
    return str(val)

async def dump_data():
    output_file = "c:/Users/NAR/Documents/tools-ig/database_export_v3.sql"
    print("STARTING EXPORT V3.1...")
    
    pg_engine = create_async_engine(PG_URL)
    mysql_engine = create_async_engine(MYSQL_URL)
    
    try:
        async with pg_engine.begin() as pg_conn:
            async with mysql_engine.begin() as ms_conn:
                ms_tables_res = await ms_conn.execute(text("SHOW TABLES"))
                ms_tables = [r[0] for r in ms_tables_res.fetchall()]
                
                with open(output_file, "w", encoding="utf-8") as f:
                    f.write("-- Robust MySQL Export (v3.1) for Sequel Ace\n")
                    f.write("SET FOREIGN_KEY_CHECKS = 0;\n")
                    f.write("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n")
                    
                    for table in TABLES:
                        print(f"Processing table: {table}")
                        
                        # Get Remote Columns
                        res_ms = await ms_conn.execute(text(f"SHOW COLUMNS FROM `{table}`"))
                        ms_cols_info = {r[0]: {"type": r[1], "null": r[2]} for r in res_ms.fetchall()}
                        ms_cols_list = list(ms_cols_info.keys())
                        
                        # Get Local Data from PG
                        res_pg = await pg_conn.execute(text(f"SELECT * FROM `{table}`"))
                        pg_keys = list(res_pg.keys())
                        
                        table_mapping = MAPPINGS.get(table, {})
                        
                        f.write(f"-- Table: {table}\n")
                        
                        rows = res_pg.fetchall()
                        if not rows:
                            f.write(f"-- No data in PostgreSQL for {table}\n\n")
                            continue
                        
                        target_columns = []
                        source_columns = []
                        
                        for pg_col in pg_keys:
                            target_col = table_mapping.get(pg_col, pg_col)
                            if target_col in ms_cols_list:
                                target_columns.append(target_col)
                                source_columns.append(pg_col)
                        
                        # Check for mandatory MySQL columns that were NOT mapped from PG
                        for ms_col, info in ms_cols_info.items():
                            if ms_col not in target_columns and info["null"] == "NO":
                                if "config" in ms_col or "result" in ms_col or "json" in info["type"].lower() or "longtext" in info["type"].lower():
                                    target_columns.append(ms_col)
                                    source_columns.append(f"__DEFAULT_EMPTY_JSON_{ms_col}__")

                        col_stmt = ", ".join([f"`{c}`" for c in target_columns])
                        
                        for row in rows:
                            r_map = row._mapping
                            val_list = []
                            for i, target_c in enumerate(target_columns):
                                source_c = source_columns[i]
                                is_json_col = "config" in target_c or "result" in target_c or "cookies" in target_c or "last_login_state" in target_c or "params" in target_c
                                if source_c.startswith("__DEFAULT_EMPTY_JSON_"):
                                    val_list.append("'{}'")
                                else:
                                    val_list.append(format_mysql_val(r_map[source_c], is_json=is_json_col))
                            
                            f.write(f"REPLACE INTO `{table}` ({col_stmt}) VALUES ({', '.join(val_list)});\n")
                            
                        f.write("\n")
                    
                    f.write("SET FOREIGN_KEY_CHECKS = 1;\n")
                    
        print(f"EXPORT COMPLETED: {output_file}")
        
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        traceback.print_exc()
    finally:
        await pg_engine.dispose()
        await mysql_engine.dispose()

if __name__ == "__main__":
    asyncio.run(dump_data())
