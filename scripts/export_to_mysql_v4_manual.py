import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import datetime
import json
import traceback

PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"

# Remote Schema Definitions (Audited)
REMOTE_SCHEMA = {
    "users": ["id", "username", "hashed_password", "full_name", "role", "is_active"],
    "accounts": ["id", "username", "password_encrypted", "seed_2fa", "proxy", "login_method", "cookies", "last_login_state", "fingerprint_id", "is_active", "is_checker", "status", "last_error", "user_id", "created_at", "last_login"],
    "fingerprints": ["id", "user_agent", "browser_version", "os_type", "device_memory", "hardware_concurrency", "screen_resolution", "timezone", "language", "raw_fingerprint", "user_id", "created_at"],
    "proxy_templates": ["id", "name", "proxy_string", "is_active", "user_id"],
    "tasks": ["id", "account_id", "batch_id", "task_type", "config", "status", "result", "error_message", "created_at", "started_at", "completed_at", "user_id"],
    "task_batches": ["id", "name", "task_type", "config", "status", "total_tasks", "completed_tasks", "failed_tasks", "created_at", "started_at", "completed_at", "user_id"]
}

# Mapping: table -> { PG_COL: MYSQL_COL }
MAPS = {
    "proxy_templates": {"proxy_url": "proxy_string"},
    "tasks": {"params": "config"},
    "task_batches": {
        "params": "config",
        "total_count": "total_tasks",
        "success_count": "completed_tasks",
        "failed_count": "failed_tasks"
    }
}

# Columns that MUST be valid JSON (not NULL) in remote MySQL
JSON_COLS = ["cookies", "last_login_state", "raw_fingerprint", "config", "result", "params"]

def format_mysql_val(val, col_name):
    is_json = any(jc in col_name for jc in JSON_COLS)
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
    output_file = "c:/Users/NAR/Documents/tools-ig/database_export_v4_final.sql"
    print("STARTING MANUAL MAPPING EXPORT V4...")
    
    pg_engine = create_async_engine(PG_URL)
    
    try:
        async with pg_engine.begin() as pg_conn:
            with open(output_file, "w", encoding="utf-8") as f:
                f.write("-- Final Robust MySQL Export (v4) for Sequel Pro/Ace\n")
                f.write("SET FOREIGN_KEY_CHECKS = 0;\n")
                f.write("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n")
                
                for table, ms_cols in REMOTE_SCHEMA.items():
                    print(f"Processing: {table}")
                    
                    # Get Local PG Data
                    res_pg = await pg_conn.execute(text(f'SELECT * FROM "{table}"'))
                    pg_keys = list(res_pg.keys())
                    
                    table_map = MAPS.get(table, {})
                    
                    f.write(f"-- Table: {table}\n")
                    
                    rows = res_pg.fetchall()
                    if not rows:
                        f.write(f"-- No data in PG for {table}\n\n")
                        continue
                        
                    # Find which PG columns map to which MS columns
                    mapping_pairs = [] # (MS_COL, PG_COL or None)
                    for ms_col in ms_cols:
                        found_pg = None
                        # Check direct match
                        if ms_col in pg_keys:
                            found_pg = ms_col
                        else:
                            # Check reverse map
                            for pg_k, ms_k in table_map.items():
                                if ms_k == ms_col and pg_k in pg_keys:
                                    found_pg = pg_k
                                    break
                        mapping_pairs.append((ms_col, found_pg))
                    
                    col_list_stmt = ", ".join([f"`{p[0]}`" for p in mapping_pairs])
                    
                    for row in rows:
                        r_map = row._mapping
                        val_list = []
                        for ms_col, pg_col in mapping_pairs:
                            val = r_map[pg_col] if pg_col else None
                            val_list.append(format_mysql_val(val, ms_col))
                        
                        f.write(f"REPLACE INTO `{table}` ({col_list_stmt}) VALUES ({', '.join(val_list)});\n")
                    
                    f.write("\n")
                
                f.write("SET FOREIGN_KEY_CHECKS = 1;\n")
                
        print(f"DONE! Exported to: {output_file}")
        
    except Exception as e:
        print(f"ERROR: {e}")
        traceback.print_exc()
    finally:
        await pg_engine.dispose()

if __name__ == "__main__":
    asyncio.run(dump_data())
