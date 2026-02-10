<?php
$config_path = dirname(__DIR__) . '/config/database.php';
if (!file_exists($config_path)) {
    die("Config file not found at: $config_path\n");
}
require_once $config_path;

echo "=== Checking Proxy Orders for gurinonyoman ===" . PHP_EOL . PHP_EOL;

$db = Database::getConnection();

try {
    // Get user ID
    $stmt = $db->prepare("SELECT id, username, email FROM users WHERE username = ?");
    $stmt->execute(['gurinonyoman']);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo "❌ User 'gurinonyoman' not found!" . PHP_EOL;
        exit(1);
    }

    echo "✓ User found:" . PHP_EOL;
    echo "  ID: " . $user['id'] . PHP_EOL;
    echo "  Username: " . $user['username'] . PHP_EOL;
    echo "  Email: " . $user['email'] . PHP_EOL . PHP_EOL;

    // Get all addons for this user
    $stmt = $db->prepare("
        SELECT id, addon_type, sub_type, quantity, price_paid, is_active, fulfilled_at, start_date
        FROM subscription_addons 
        WHERE user_id = ? 
        ORDER BY start_date DESC
    ");
    $stmt->execute([$user['id']]);
    $addons = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($addons)) {
        echo "❌ No addons found for this user!" . PHP_EOL;
        echo PHP_EOL . "This means the payment hasn't been processed yet, or there was an issue with the Xendit callback." . PHP_EOL;
        exit(1);
    }

    echo "✓ Found " . count($addons) . " addon(s):" . PHP_EOL . PHP_EOL;

    foreach ($addons as $addon) {
        echo "Addon ID: " . $addon['id'] . PHP_EOL;
        echo "  Type: " . $addon['addon_type'] . PHP_EOL;
        echo "  Sub-type: " . ($addon['sub_type'] ?? 'NULL') . PHP_EOL;
        echo "  Quantity: " . $addon['quantity'] . PHP_EOL;
        echo "  Price: Rp " . number_format($addon['price_paid'], 0, ',', '.') . PHP_EOL;
        echo "  Active: " . ($addon['is_active'] ? 'Yes' : 'No') . PHP_EOL;
        echo "  Fulfilled: " . ($addon['fulfilled_at'] ? 'Yes (' . $addon['fulfilled_at'] . ')' : 'No (Pending)') . PHP_EOL;
        echo "  Start Date: " . $addon['start_date'] . PHP_EOL;
        echo PHP_EOL;
    }

    // Check specifically for proxy addons
    $stmt = $db->prepare("
        SELECT COUNT(*) as count 
        FROM subscription_addons 
        WHERE user_id = ? AND addon_type = 'proxy'
    ");
    $stmt->execute([$user['id']]);
    $proxy_count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    echo "Proxy addons (addon_type='proxy'): " . $proxy_count . PHP_EOL;

    if ($proxy_count == 0) {
        echo PHP_EOL . "⚠️  WARNING: No records with addon_type='proxy' found!" . PHP_EOL;
        echo "This is why the admin panel doesn't show them." . PHP_EOL;
        echo "The addon_type should be 'proxy', not something else." . PHP_EOL;
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
