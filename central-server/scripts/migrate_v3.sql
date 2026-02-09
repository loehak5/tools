-- /instatools/central-server/scripts/migrate_v3.sql

-- 1. Ensure Plans Table has all necessary columns
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS daily_price DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS features_list JSON,
ADD COLUMN IF NOT EXISTS proxy_limit INT DEFAULT 0;

-- 2. Clear old plans and insert detailed tiers
TRUNCATE TABLE subscription_plans;

INSERT INTO subscription_plans (id, name, price_idr, duration_days, ig_account_limit, proxy_limit, features, allow_addons) VALUES
('prematur', 'Prematur (Daily Pass)', 50000.00, 1, 100, 10, '{"follow":true, "like":true, "post":true, "story":true, "cross_posting":true}', FALSE),
('starter', 'Starter', 60000.00, 7, 100, 0, '{"follow":false, "like":true, "post":true, "story":false, "cross_posting":false}', FALSE),
('basic', 'Basic', 100000.00, 7, 50, 0, '{"follow":true, "like":true, "post":true, "story":true, "cross_posting":false}', TRUE),
('pro', 'Pro', 30000.00, 30, 300, 15, '{"follow":true, "like":true, "post":true, "story":true, "cross_posting":true}', TRUE),
('advanced', 'Advanced', 650000.00, 30, 500, 30, '{"follow":true, "like":true, "post":true, "story":true, "cross_posting":true}', TRUE),
('supreme', 'Supreme', 1800000.00, 60, 1500, -1, '{"follow":true, "like":true, "post":true, "story":true, "cross_posting":true}', TRUE);

-- 3. Ensure Addons table exists
CREATE TABLE IF NOT EXISTS subscription_addons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'proxy_shared', 'proxy_private', 'proxy_dedicated', 'quota_proxy', 'quota_action'
    unit_price DECIMAL(15, 2) NOT NULL
);

INSERT INTO subscription_addons (name, type, unit_price) VALUES
('Proxy Shared', 'proxy_shared', 7500.00),
('Proxy Private', 'proxy_private', 18000.00),
('Proxy Dedicated', 'proxy_dedicated', 37000.00);
