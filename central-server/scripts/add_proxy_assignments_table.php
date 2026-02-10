<?php
/**
 * Migration: Add proxy_assignments table and fulfilled_at column
 * Purpose: Track manual proxy IP assignments for addon purchases
 */

require_once __DIR__ . '/../config/database.php';

echo "=== Running Migration: Add Proxy Assignments Table ===\n\n";

try {
    $db = Database::getConnection();

    // 1. Create proxy_assignments table
    echo "Creating proxy_assignments table...\n";
    $sql = "
        CREATE TABLE IF NOT EXISTS proxy_assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            addon_id INT NOT NULL,
            user_id INT NOT NULL,
            proxy_ip VARCHAR(255) NOT NULL,
            proxy_port INT DEFAULT 80,
            proxy_username VARCHAR(100),
            proxy_password VARCHAR(255),
            assigned_by INT NOT NULL COMMENT 'Admin user_id who assigned this proxy',
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_addon_id (addon_id),
            INDEX idx_user_id (user_id),
            FOREIGN KEY (addon_id) REFERENCES subscription_addons(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
    ";
    $db->exec($sql);
    echo "✓ proxy_assignments table created\n\n";

    // 2. Add fulfilled_at column to subscription_addons
    echo "Adding fulfilled_at column to subscription_addons...\n";
    $sql = "
        ALTER TABLE subscription_addons 
        ADD COLUMN IF NOT EXISTS fulfilled_at DATETIME DEFAULT NULL 
        COMMENT 'When admin fulfilled this addon order (for proxy addons)'
    ";

    try {
        $db->exec($sql);
        echo "✓ fulfilled_at column added\n\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "! fulfilled_at column already exists, skipping\n\n";
        } else {
            throw $e;
        }
    }

    echo "=== Migration Complete ===\n";
    echo "Tables are ready for proxy assignment functionality.\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
