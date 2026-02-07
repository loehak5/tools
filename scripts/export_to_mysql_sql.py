import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import datetime
import json

PG_URL = "postgresql+asyncpg://app_user:app_password@localhost:5432/ig_automation_db"
# Tables to export
TABLES = ['users', 'fingerprints', 'accounts', 'proxies', 'tasks']

async def dump_to_mysql_sql():
    engine = create_async_engine(PG_URL)
    output_file = "c:/Users/NAR/Documents/tools-ig/database_export.sql"
    
    print(f"🔍 Connecting to local PostgreSQL...")
    
    try:
        async with engine.begin() as conn:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write("-- IG Automation Tools - Database Export (MySQL Compatible)\n")
                f.write(f"-- Exported on: {datetime.datetime.now()}\n\n")
                f.write("SET FOREIGN_KEY_CHECKS = 0;\n\n")

                for table in TABLES:
                    print(f"📊 Exporting table: {table}...")
                    f.write(f"-- Table: {table}\n")
                    
                    try:
                        res = await conn.execute(text(f"SELECT * FROM {table}"))
                        columns = res.keys()
                        rows = res.fetchall()
                        
                        if not rows:
                            f.write(f"-- No data found for {table}\n\n")
                            continue

                        # Generate INSERT statements
                        col_names = ", ".join([f"`{c}`" for c in columns])
                        
                        for row in rows:
                            vals = []
                            # row is a MappingRow or similar
                            # Convert to dict to handle data safely
                            r_dict = row._asdict()
                            
                            for col in columns:
                                val = r_dict[col]
                                if val is None:
                                    vals.append("NULL")
                                elif isinstance(val, (dict, list)):
                                    # JSON data - escape single quotes for MySQL
                                    json_str = json.dumps(val)
                                    escaped = json_str.replace("'", "''")
                                    vals.append(f"'{escaped}'")
                                elif isinstance(val, (datetime.datetime, datetime.date)):
                                    vals.append(f"'{val.isoformat()}'")
                                elif isinstance(val, str):
                                    # Basic escape for MySQL
                                    escaped = val.replace("'", "''")
                                    vals.append(f"'{escaped}'")
                                elif isinstance(val, bool):
                                    vals.append("1" if val else "0")
                                else:
                                    vals.append(str(val))
                            
                            f.write(f"INSERT INTO `{table}` ({col_names}) VALUES ({', '.join(vals)});\n")
                        
                        f.write("\n")
                    except Exception as e:
                        print(f"⚠️  Error exporting {table}: {e}")
                        f.write(f"-- Error exporting {table}: {e}\n\n")

                f.write("SET FOREIGN_KEY_CHECKS = 1;\n")
                
        print(f"\n✅ Export finished! File saved to: {output_file}")
    except Exception as e:
        print(f"❌ Connection error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(dump_to_mysql_sql())
