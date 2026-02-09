<?php
require_once __DIR__ . '/config/database.php';
$db = Database::getConnection();

$tables = ['subscription_plans', 'subscriptions', 'subscription_addons'];
foreach ($tables as $table) {
    echo "\n--- Table: $table ---\n";
    try {
        $stmt = $db->query("DESCRIBE $table");
        print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
