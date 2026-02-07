import pymysql
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def migrate():
    print(f"Connecting to MySQL at {os.getenv('MYSQL_HOST')}...")
    
    try:
        conn = pymysql.connect(
            host=os.getenv("MYSQL_HOST"),
            port=int(os.getenv("MYSQL_PORT", 3306)),
            user=os.getenv("MYSQL_USER"),
            password=os.getenv("MYSQL_PASSWORD"),
            database=os.getenv("MYSQL_DATABASE")
        )
    except Exception as e:
        print(f"Failed to connect to MySQL: {e}")
        return
    
    try:
        with conn.cursor() as cursor:
            # 1. Update tasks table
            print("\nChecking 'tasks' table...")
            # Add scheduled_at if missing
            try:
                cursor.execute("ALTER TABLE tasks ADD COLUMN scheduled_at DATETIME AFTER config")
                print("  - Added scheduled_at")
            except Exception: print("  - scheduled_at already exists or error")
            
            # Add executed_at if missing
            try:
                cursor.execute("ALTER TABLE tasks ADD COLUMN executed_at DATETIME AFTER scheduled_at")
                print("  - Added executed_at")
            except Exception: print("  - executed_at already exists or error")
            
            # Rename config to params
            try:
                cursor.execute("ALTER TABLE tasks CHANGE COLUMN config params JSON")
                print("  - Renamed config to params")
            except Exception: print("  - params already exists or config missing")

            # 2. Update task_batches table
            print("\nChecking 'task_batches' table...")
            try:
                cursor.execute("ALTER TABLE task_batches CHANGE COLUMN config params JSON")
                print("  - Renamed config to params")
            except Exception: print("  - params already exists or config missing")

            # 3. Update accounts table
            print("\nChecking 'accounts' table...")
            try:
                cursor.execute("ALTER TABLE accounts ADD COLUMN last_error VARCHAR(255) AFTER status")
                print("  - Added last_error")
            except Exception: print("  - last_error already exists or error")

            # 4. Update proxy_templates table
            print("\nChecking 'proxy_templates' table...")
            try:
                cursor.execute("ALTER TABLE proxy_templates ADD COLUMN updated_at DATETIME AFTER created_at")
                print("  - Added updated_at")
            except Exception: print("  - updated_at already exists or error")
            
            conn.commit()
            print("\nMigration completed successfully!")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
