import pymysql
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def migrate():
    print(f"Connecting to MySQL at {os.getenv('MYSQL_HOST')} for Threads migration...")
    
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
            print("\nChecking 'accounts' table for Threads fields...")
            
            # Add threads_profile_id if missing
            try:
                cursor.execute("ALTER TABLE accounts ADD COLUMN threads_profile_id VARCHAR(255) AFTER last_error")
                print("  - Added threads_profile_id")
            except Exception as e: 
                print(f"  - threads_profile_id check: {e}")
            
            # Add has_threads if missing
            try:
                cursor.execute("ALTER TABLE accounts ADD COLUMN has_threads BOOLEAN DEFAULT FALSE AFTER threads_profile_id")
                print("  - Added has_threads")
            except Exception as e: 
                print(f"  - has_threads check: {e}")
            
            conn.commit()
            print("\nThreads migration completed successfully!")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
