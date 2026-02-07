import sys
import os
import asyncio
from sqlalchemy import text
import datetime

sys.path.append("/app")
from app.db.session import AsyncSessionLocal

async def analyze_failures():
    with open("/app/failure_report.txt", "w") as f:
        try:
            async with AsyncSessionLocal() as session:
                f.write("\n--- Failed Tasks Analysis (Latest by ID) ---\n")
                # Order by ID to get latest created tasks
                stmt = text("SELECT id, task_type, error_message, executed_at, created_at FROM tasks WHERE status = 'failed' ORDER BY id DESC LIMIT 5")
                result = await session.execute(stmt)
                rows = result.fetchall()
                
                f.write(f"Found {len(rows)} rows.\n")
                
                for row in rows:
                    f.write(f"ROW: {str(row)}\n")
                    # Try manual extraction
                    try:
                        t_id = row[0]
                        t_err = row[2]
                        t_created = row[4]
                        f.write(f"Task {t_id} (Created: {t_created}): {t_err}\n")
                    except Exception as extraction_e:
                        f.write(f"Extraction error: {extraction_e}\n")
                    
                f.write("-" * 40 + "\n")
        except Exception as e:
            f.write(f"Error: {e}\n")

if __name__ == "__main__":
    asyncio.run(analyze_failures())
