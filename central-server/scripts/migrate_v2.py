import pymysql
import os
from dotenv import load_dotenv

# Try to load .env from current dir or central-server dir
load_dotenv()
load_dotenv('central-server/.env')

def migrate():
    host = os.getenv("DB_HOST", "localhost")
    port = int(os.getenv("DB_PORT", 3306))
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASS")
    database = os.getenv("DB_NAME")

    print(f"Connecting to MySQL at {host} to setup Subscription System...")
    
    if not user:
        print("Error: DB_USER not found in environment. Check your .env file.")
        return

    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database
        )
    except Exception as e:
        print(f"Failed to connect to MySQL: {e}")
        return
    
    try:
        with conn.cursor() as cursor:
            # 1. Create subscription_plans table
            print("\nCreating 'subscription_plans' table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS subscription_plans (
                    id VARCHAR(50) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    price_idr DECIMAL(15, 2) NOT NULL,
                    duration_days INT NOT NULL,
                    ig_account_limit INT NOT NULL,
                    proxy_slot_limit INT DEFAULT 0,
                    features JSON,
                    allow_addons BOOLEAN DEFAULT FALSE,
                    is_active BOOLEAN DEFAULT TRUE
                )
            """)

            # 2. Create subscriptions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    plan_id VARCHAR(50) NOT NULL,
                    start_date DATETIME NOT NULL,
                    end_date DATETIME NOT NULL,
                    status VARCHAR(20) DEFAULT 'active',
                    CONSTRAINT fk_user_sub FOREIGN KEY (user_id) REFERENCES users(id),
                    CONSTRAINT fk_plan_sub FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
                )
            """)

            # 3. Create subscription_addons table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS subscription_addons (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    addon_type VARCHAR(30) NOT NULL,
                    sub_type VARCHAR(50),
                    quantity INT NOT NULL,
                    price_paid DECIMAL(15, 2) NOT NULL,
                    start_date DATETIME NOT NULL,
                    end_date DATETIME NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    CONSTRAINT fk_user_addon FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)

            # 4. Initialize Default Plans per strict business rules
            print("\nInitializing default plans...")
            plans = [
                # id, name, price, duration, accounts, proxies, features, allow_addons
                ('prematur', 'Prematur (Daily Pass)', 50000, 1, 100, 10, '["follow", "like", "post", "reels", "story", "cross_posting"]', False),
                ('starter', 'Starter', 60000, 7, 100, 0, '["post", "like", "reels"]', False),
                ('basic', 'Basic', 100000, 7, 50, 0, '["post", "like", "reels", "story"]', True),
                ('pro', 'Pro', 300000, 30, 300, 15, '["follow", "like", "post", "reels", "story", "cross_posting"]', True),
                ('advanced', 'Advanced', 650000, 30, 500, 30, '["follow", "like", "post", "reels", "story", "view", "cross_threads", "cross_posting"]', True),
                ('supreme', 'Supreme', 1800000, 60, 1500, 999999, '["follow", "like", "post", "reels", "story", "view", "cross_threads", "cross_posting"]', True)
            ]
            
            for p in plans:
                cursor.execute("""
                    INSERT INTO subscription_plans (id, name, price_idr, duration_days, ig_account_limit, proxy_slot_limit, features, allow_addons)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE 
                        price_idr=VALUES(price_idr), 
                        duration_days=VALUES(duration_days),
                        ig_account_limit=VALUES(ig_account_limit),
                        proxy_slot_limit=VALUES(proxy_slot_limit),
                        features=VALUES(features),
                        allow_addons=VALUES(allow_addons)
                """, p)
            print("  - default plans initialized")

            conn.commit()
            print("\nSubscription System Migration completed successfully!")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
