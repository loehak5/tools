import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import datetime
import json
import traceback

PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"
MYSQL_URL = "mysql+aiomysql://insta-manager:XLph5w84m4eBB6Te@instatools-database.ddns.net:3306/insta-manager"

# Targeted tables (using PG names)
TABLES = ['users', 'fingerprints', 'accounts', 'proxy_templates', 'tasks', 'task_batches']

# Manual Schema definitions for MySQL (since missed in target)
SCHEMA_DEFS = {
    "fingerprints": """
        CREATE TABLE IF NOT EXISTS `fingerprints` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `user_agent` text NOT NULL,
            `browser_version` varchar(255) DEFAULT NULL,
            `os_type` varchar(255) DEFAULT NULL,
            `device_memory` int(11) DEFAULT NULL,
            `hardware_concurrency` int(11) DEFAULT NULL,
            `screen_resolution` varchar(255) DEFAULT NULL,
            `timezone` varchar(255) DEFAULT NULL,
            `language` varchar(255) DEFAULT NULL,
            `raw_fingerprint` json DEFAULT NULL,
            `user_id` int(11) DEFAULT NULL,
            `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    "proxy_templates": """
        CREATE TABLE IF NOT EXISTS `proxy_templates` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `name` varchar(255) NOT NULL,
            `proxy_url` text NOT NULL,
            `description` text DEFAULT NULL,
            `user_id` int(11) DEFAULT NULL,
            `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
            `updated_at` datetime DEFAULT NULL,
            PRIMARY KEY (`id`),
            UNIQUE KEY `name` (`name`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    "tasks": """
        CREATE TABLE IF NOT EXISTS `tasks` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `task_type` varchar(255) DEFAULT NULL,
            `status` varchar(255) DEFAULT 'pending',
            `account_id` int(11) DEFAULT NULL,
            `batch_id` int(11) DEFAULT NULL,
            `params` json DEFAULT NULL,
            `result` json DEFAULT NULL,
            `error` text DEFAULT NULL,
            `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
            `started_at` datetime DEFAULT NULL,
            `completed_at` datetime DEFAULT NULL,
            `user_id` int(11) DEFAULT NULL,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    "task_batches": """
        CREATE TABLE IF NOT EXISTS `task_batches` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `task_type` varchar(255) DEFAULT NULL,
            `status` varchar(255) DEFAULT 'pending',
            `total_count` int(11) DEFAULT '0',
            `success_count` int(11) DEFAULT '0',
            `failed_count` int(11) DEFAULT '0',
            `params` json DEFAULT NULL,
            `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
            `started_at` datetime DEFAULT NULL,
            `completed_at` datetime DEFAULT NULL,
            `user_id` int(11) DEFAULT NULL,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """
}

def format_mysql_val(val):
    if val is None:
        return "NULL"
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
    output_file = "c:/Users/NAR/Documents/tools-ig/database_export_v2.sql"
    print("🚀 Starting export to SQL (V2)...")
    
    pg_engine = create_async_engine(PG_URL)
    mysql_engine = create_async_engine(MYSQL_URL)
    
    try:
        async with pg_engine.begin() as pg_conn:
            async with mysql_engine.begin() as ms_conn:
                # Get current MySQL tables
                ms_tables_res = await ms_conn.execute(text("SHOW TABLES"))
                ms_tables = [r[0] for r in ms_tables_res.fetchall()]
                
                with open(output_file, "w", encoding="utf-8") as f:
                    f.write("-- Robust MySQL Export (v2) for Sequel Ace\n")
                    f.write("SET FOREIGN_KEY_CHECKS = 0;\n")
                    f.write("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n")
                    
                    for table in TABLES:
                        print(f"📊 Processing table: {table}")
                        
                        # Generate CREATE TABLE if missing
                        if table not in ms_tables:
                            if table in SCHEMA_DEFS:
                                f.write(f"-- Missing table detected: {table}\n")
                                f.write(SCHEMA_DEFS[table] + "\n\n")
                                ms_cols = [line.strip().split("`")[1] for line in SCHEMA_DEFS[table].split("\n") if "`" in line and "PRIMARY KEY" not in line and "UNIQUE KEY" not in line and "CREATE TABLE" not in line]
                            else:
                                f.write(f"-- WARNING: Table {table} missing in MySQL and no SCHEMA_DEF found.\n")
                                ms_cols = []
                        else:
                            # Table exists, get columns
                            res_ms = await ms_conn.execute(text(f"SHOW COLUMNS FROM {table}"))
                            ms_cols = [r[0] for r in res_ms.fetchall()]
                        
                        # Get Local Data from PG
                        res_pg = await pg_conn.execute(text(f"SELECT * FROM {table}"))
                        pg_keys = list(res_pg.keys())
                        
                        # Determine common columns
                        if ms_cols:
                            common = [c for c in pg_keys if c in ms_cols]
                        else:
                            common = pg_keys # fallback to all PG keys if MySQL columns unknown
                            
                        print(f"   Common columns: {len(common)} / {len(pg_keys)}")
                        
                        rows = res_pg.fetchall()
                        if not rows:
                            f.write(f"-- No data in PostgreSQL for {table}\n\n")
                            continue
                            
                        col_stmt = ", ".join([f"`{c}`" for c in common])
                        for row in rows:
                            r_map = row._mapping
                            val_list = [format_mysql_val(r_map[c]) for c in common]
                            f.write(f"REPLACE INTO `{table}` ({col_stmt}) VALUES ({', '.join(val_list)});\n")
                            
                        f.write("\n")
                    
                    f.write("SET FOREIGN_KEY_CHECKS = 1;\n")
                    
        print(f"✅ Export completed successfully: {output_file}")
        
    except Exception as e:
        print(f"❌ CRITICAL EXPORT ERROR: {e}")
        traceback.print_exc()
    finally:
        await pg_engine.dispose()
        await mysql_engine.dispose()

if __name__ == "__main__":
    asyncio.run(dump_data())
