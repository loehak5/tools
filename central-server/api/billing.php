<?php
// /instatools/central-server/api/billing.php

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

/**
 * Calculate the price for an add-on based on strict business rules.
 */
function calculate_addon_price($tier, $addon_type, $sub_type = null, $quantity = 1, $remaining_days = 30)
{
    $tier = strtolower($tier);
    $addon_type = strtolower($addon_type);

    // Rule 1: Prematur & Starter have NO Add-ons allowed
    if (in_array($tier, ['prematur', 'starter'])) {
        return -1; // Not allowed
    }

    // Rule A: Basic Tier Promo (Cross Posting) - 100k flat
    if ($tier === 'basic' && $addon_type === 'cross_posting') {
        return 100000.00;
    }

    // Rule B: Pro Tier Cross Posting - 200k (Prorated)
    if ($tier === 'pro' && $addon_type === 'cross_posting') {
        $base_price = 200000.00;
        // Formula: (200,000 / 30) * remaining_days
        $prorated = ($base_price / 30) * $remaining_days;
        return round($prorated);
    }

    // Rule: Proxy Services (Static Residential)
    if ($addon_type === 'proxy') {
        $unit_costs = [
            'shared' => 7500.00,
            'private' => 18000.00,
            'dedicated' => 37000.00
        ];
        return ($unit_costs[$sub_type] ?? 0) * $quantity;
    }

    // Rule: Layanan Kuota
    if ($addon_type === 'quota') {
        if ($sub_type === 'proxy') {
            return 500.00 * $quantity; // 500 per IP
        }
        if ($sub_type === 'account') {
            return 1000.00 * $quantity; // 1k per account
        }
    }

    return 0.00;
}

/**
 * Algorithm for Prorated Discount Upgrade.
 */
function calculate_upgrade_cost($current_plan_price, $current_plan_duration, $remaining_days, $new_plan_price)
{
    // 1. Daily Value: current_plan_price / current_plan_duration_days
    if ($current_plan_duration <= 0)
        return $new_plan_price;
    $daily_value = $current_plan_price / $current_plan_duration;

    // 2. Remaining Credit: daily_value * remaining_days
    $remaining_credit = $daily_value * $remaining_days;

    // 3. Upgrade Cost: new_plan_price - Remaining Credit
    $upgrade_cost = $new_plan_price - $remaining_credit;

    return max(0, round($upgrade_cost));
}

// Simple API Router
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'calculate_addon':
        $tier = $_POST['tier'] ?? '';
        $type = $_POST['type'] ?? '';
        $sub_type = $_POST['sub_type'] ?? null;
        $qty = intval($_POST['qty'] ?? 1);
        $days = intval($_POST['days'] ?? 30);

        $price = calculate_addon_price($tier, $type, $sub_type, $qty, $days);
        echo json_encode(['status' => 'success', 'price' => $price]);
        break;

    case 'calculate_upgrade':
        $curr_price = floatval($_POST['curr_price'] ?? 0);
        $curr_duration = intval($_POST['curr_duration'] ?? 30);
        $rem_days = intval($_POST['rem_days'] ?? 0);
        $new_price = floatval($_POST['new_price'] ?? 0);

        $cost = calculate_upgrade_cost($curr_price, $curr_duration, $rem_days, $new_price);
        echo json_encode(['status' => 'success', 'upgrade_cost' => $cost]);
        break;

    case 'get_plans':
        try {
            $db = Database::getConnection();
            $stmt = $db->query("SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price_idr ASC");
            $plans = $stmt->fetchAll();
            echo json_encode(['status' => 'success', 'plans' => $plans]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
        break;
}
