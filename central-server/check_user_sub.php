<?php
require_once __DIR__ . '/config/database.php';
$db = Database::getConnection();

$userId = 5;
echo "\n--- Checking Subscriptions for User ID: $userId ---\n";
$stmt = $db->prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 5");
$stmt->execute([$userId]);
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n--- Checking Active Subscription ---\n";
$stmt = $db->prepare("SELECT s.*, p.name as plan_name FROM subscriptions s JOIN subscription_plans p ON s.plan_id = p.id WHERE s.user_id = ? AND s.is_active = 1 AND s.end_date > NOW()");
$stmt->execute([$userId]);
print_r($stmt->fetch(PDO::FETCH_ASSOC));
