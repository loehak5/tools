<?php
/**
 * Create test proxy addon purchase for testing admin UI
 */

require_once __DIR__ . '/../config/database.php';

echo "=== Creating Test Proxy Addon Purchase ===\n\n";

try {
    $db = Database::getConnection();

    // Get a test user (assuming user_id 2 = Bagong99)
    $user_id = 2;

    // Create a proxy addon purchase
    $stmt = $db->prepare("
        INSERT INTO subscription_addons 
        (user_id, addon_type, sub_type, quantity, price_paid, start_date, end_date, is_active)
        VALUES 
        (?, 'proxy', 'shared', 15, 150000, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1)
    ");
    $stmt->execute([$user_id]);

    $addon_id = $db->lastInsertId();

    echo "✓ Created test proxy order:\n";
    echo "  Addon ID: $addon_id\n";
    echo "  User ID: $user_id\n";
    echo "  Type: Shared Proxy\n";
    echo "  Quantity: 15\n";
    echo "  Price: Rp 150.000\n\n";

    echo "You can now:\n";
    echo "1. Access admin proxy orders page\n";
    echo "2. View the pending proxy order\n";
    echo "3. Assign proxy IPs using the form\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
