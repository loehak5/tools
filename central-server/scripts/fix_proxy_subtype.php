<?php
/**
 * Fix NULL sub_type for existing proxy orders
 * Set to 'shared' as default for custom orders without sub_type
 */

require_once __DIR__ . '/../config/database.php';

echo "=== Fixing Proxy Sub-Type ===" . PHP_EOL . PHP_EOL;

try {
    $db = Database::getConnection();

    // Find proxy orders with NULL sub_type
    $stmt = $db->prepare("
        SELECT sa.id, sa.user_id, sa.quantity, sa.price_paid, u.username
        FROM subscription_addons sa
        JOIN users u ON sa.user_id = u.id
        WHERE sa.addon_type = 'proxy' AND sa.sub_type IS NULL
    ");
    $stmt->execute();
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($orders)) {
        echo "✓ No proxy orders with NULL sub_type found." . PHP_EOL;
        exit(0);
    }

    echo "Found " . count($orders) . " proxy order(s) with NULL sub_type:" . PHP_EOL . PHP_EOL;

    foreach ($orders as $order) {
        echo "Addon ID: " . $order['id'] . PHP_EOL;
        echo "  User: " . $order['username'] . " (ID: " . $order['user_id'] . ")" . PHP_EOL;
        echo "  Quantity: " . $order['quantity'] . " IPs" . PHP_EOL;
        echo "  Price: Rp " . number_format($order['price_paid'], 0, ',', '.') . PHP_EOL;

        // Determine sub_type based on price per IP
        $pricePerIp = $order['price_paid'] / $order['quantity'];

        if ($pricePerIp <= 10500) {
            $subType = 'shared';
        } elseif ($pricePerIp <= 23000) {
            $subType = 'private';
        } else {
            $subType = 'dedicated';
        }

        echo "  Detected Type: " . ucfirst($subType) . " (Rp " . number_format($pricePerIp, 0, ',', '.') . " per IP)" . PHP_EOL;

        // Update sub_type
        $updateStmt = $db->prepare("UPDATE subscription_addons SET sub_type = ? WHERE id = ?");
        $updateStmt->execute([$subType, $order['id']]);

        echo "  ✓ Updated to sub_type = '$subType'" . PHP_EOL . PHP_EOL;
    }

    echo "✅ All proxy orders updated successfully!" . PHP_EOL;

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
