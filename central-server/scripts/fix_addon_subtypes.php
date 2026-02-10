<?php
// Script to fix existing addon records that are missing sub_type
require_once __DIR__ . '/../config/database.php';

echo "=== Fixing Existing Addon Records ===\n\n";

try {
    $db = Database::getConnection();

    // 1. Find all quota addons with NULL sub_type
    $stmt = $db->prepare("
        SELECT id, user_id, addon_type, sub_type, quantity, price_paid, start_date, end_date
        FROM subscription_addons
        WHERE addon_type = 'quota' AND (sub_type IS NULL OR sub_type = '')
    ");
    $stmt->execute();
    $broken_addons = $stmt->fetchAll();

    echo "Found " . count($broken_addons) . " quota addon(s) with missing sub_type.\n\n";

    if (count($broken_addons) === 0) {
        echo "No broken records found. Exiting.\n";
        exit(0);
    }

    // 2. For each broken addon, determine the sub_type based on price
    foreach ($broken_addons as $addon) {
        echo "Processing Addon ID: {$addon['id']}\n";
        echo "  User ID: {$addon['user_id']}\n";
        echo "  Quantity: {$addon['quantity']}\n";
        echo "  Price Paid: Rp " . number_format($addon['price_paid'], 0, ',', '.') . "\n";

        // Calculate expected prices for both types
        $price_per_account = 1000.00; // Rp 1.000 per akun IG
        $price_per_proxy = 500.00;    // Rp 500 per IP

        $expected_account_price = $price_per_account * $addon['quantity'];
        $expected_proxy_price = $price_per_proxy * $addon['quantity'];

        // Determine sub_type based on which price matches
        $determined_sub_type = null;
        if (abs($addon['price_paid'] - $expected_account_price) < 1.0) {
            $determined_sub_type = 'account';
            echo "  → Determined as ACCOUNT quota (Rp 1.000/unit)\n";
        } elseif (abs($addon['price_paid'] - $expected_proxy_price) < 1.0) {
            $determined_sub_type = 'proxy';
            echo "  → Determined as PROXY quota (Rp 500/unit)\n";
        } else {
            echo "  → WARNING: Cannot determine type from price. Skipping.\n";
            echo "    Expected Account: Rp " . number_format($expected_account_price, 0, ',', '.') . "\n";
            echo "    Expected Proxy: Rp " . number_format($expected_proxy_price, 0, ',', '.') . "\n\n";
            continue;
        }

        // Update the record
        $update_stmt = $db->prepare("UPDATE subscription_addons SET sub_type = ? WHERE id = ?");
        $update_stmt->execute([$determined_sub_type, $addon['id']]);

        echo "  ✓ Updated sub_type to '{$determined_sub_type}'\n\n";
    }

    echo "\n=== Fix Complete ===\n";
    echo "All eligible addon records have been updated.\n";
    echo "The quota should now be reflected in the dashboard.\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
