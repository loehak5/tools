<?php
session_start();
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

function get_env_var($key, $default = null)
{
    if (isset($_ENV[$key]))
        return $_ENV[$key];
    if (isset($_SERVER[$key]))
        return $_SERVER[$key];
    $val = function_exists('getenv') ? getenv($key) : false;
    return $val !== false ? $val : $default;
}

/**
 * Xendit Invoice Creator via cURL
 */
function create_xendit_invoice($external_id, $amount, $payer_email, $description)
{
    $secret_key = get_env_var('XENDIT_SECRET_KEY');
    if (!$secret_key) {
        $env_file = __DIR__ . '/../.env';
        $exists = file_exists($env_file) ? 'Yes' : 'No';
        $debug_info = "Env path: $env_file | Exists: $exists";
        return ['status' => 'error', 'message' => "Xendit Secret Key not configured. ($debug_info)"];
    }

    $url = 'https://api.xendit.co/v2/invoices';
    $data = [
        'external_id' => $external_id,
        'amount' => (int) $amount,
        'payer_email' => $payer_email,
        'description' => $description,
        'should_send_email' => true,
        'success_redirect_url' => 'http://localhost:5173/payment-success',
        'failure_redirect_url' => 'http://localhost:5173/payment-failed',
        'currency' => 'IDR'
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_USERPWD, $secret_key . ':');
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code >= 200 && $http_code < 300) {
        return ['status' => 'success', 'data' => json_decode($response, true)];
    } else {
        return ['status' => 'error', 'message' => 'Xendit API Error: ' . $response];
    }
}

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

    // ===== CROSS POSTING / CROSS THREADS =====

    // Basic Tier: Promo sekali beli 100k flat (sesuai masa aktif tier)
    if ($tier === 'basic' && ($addon_type === 'cross_posting' || $addon_type === 'cross_threads')) {
        return 100000.00;
    }

    // Pro Tier: 200k/30 hari, prorated jika beli di pertengahan
    if ($tier === 'pro' && ($addon_type === 'cross_posting' || $addon_type === 'cross_threads')) {
        $base_price = 200000.00;
        $base_days = 30;
        if ($remaining_days >= $base_days) {
            return $base_price; // Full price if bought at start
        }
        // Prorated if mid-cycle
        $prorated = ($base_price / $base_days) * $remaining_days;
        return round(max($prorated, 0));
    }

    // Advanced & Supreme: cross posting sudah termasuk di tier
    if (in_array($tier, ['advanced', 'supreme']) && ($addon_type === 'cross_posting' || $addon_type === 'cross_threads')) {
        return -2; // Already included in tier
    }

    // ===== LAYANAN PROXY (Statis Residensial) =====
    if ($addon_type === 'proxy') {
        // Standard bundle prices (flat/rounded)
        $bundle_prices = [
            'shared' => ['qty' => 15, 'price' => 150000.00],
            'private' => ['qty' => 20, 'price' => 450000.00],
            'dedicated' => ['qty' => 25, 'price' => 1100000.00],
        ];

        // Standard bundle purchase (fixed qty = fixed price)
        if (isset($bundle_prices[$sub_type]) && $quantity == $bundle_prices[$sub_type]['qty']) {
            return $bundle_prices[$sub_type]['price'];
        }

        // Custom order: per-IP unit pricing, minimum 10 IPs
        $unit_costs = [
            'shared' => 10000.00,
            'private' => 22500.00,
            'dedicated' => 44000.00
        ];

        if (isset($unit_costs[$sub_type]) && $quantity >= 10) {
            return $unit_costs[$sub_type] * $quantity;
        }

        return 0; // Invalid
    }

    // ===== LAYANAN KUOTA =====
    if ($addon_type === 'quota') {
        if ($sub_type === 'proxy') {
            return 500.00 * $quantity; // Rp 500 per IP
        }
        if ($sub_type === 'account') {
            return 1000.00 * $quantity; // Rp 1.000 per akun IG
        }
    }

    return 0.00;
}

/**
 * Algorithm for Prorated Discount Upgrade.
 */
function calculate_upgrade_cost($current_plan_price, $current_plan_duration, $remaining_days, $new_plan_price)
{
    if ($current_plan_duration <= 0)
        return $new_plan_price;

    // 1. Daily Value: current_plan_price / current_plan_duration_days
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
    case 'create_upgrade_invoice':
    case 'create_invoice':
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['status' => 'error', 'message' => 'Authentication required']);
            break;
        }

        $new_plan_id = ($_POST['new_plan_id'] ?? ($_POST['plan_id'] ?? ''));
        if (!$new_plan_id) {
            echo json_encode(['status' => 'error', 'message' => 'Plan ID required']);
            break;
        }

        try {
            $db = Database::getConnection();
            $now = time();
            $now_str = date('Y-m-d H:i:s', $now);

            // 1. Get current active subscription (Latest and longest)
            $stmt = $db->prepare("SELECT s.*, p.price_idr, p.duration_days, p.name as plan_name FROM subscriptions s JOIN subscription_plans p ON s.plan_id = p.id WHERE s.user_id = ? AND s.status = 'active' AND s.end_date > ? ORDER BY s.end_date DESC LIMIT 1");
            $stmt->execute([$_SESSION['user_id'], $now_str]);
            $current_sub = $stmt->fetch();

            // 2. Get new plan details
            $stmt = $db->prepare("SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1");
            $stmt->execute([$new_plan_id]);
            $new_plan = $stmt->fetch();

            if (!$new_plan) {
                echo json_encode(['status' => 'error', 'message' => 'Invalid or inactive plan']);
                break;
            }

            // --- STRICT RESTRICTIONS ---
            if ($current_sub) {
                $rem_seconds = strtotime($current_sub['end_date']) - $now;
                $rem_days = $rem_seconds / (24 * 3600);
                $rem_hours = $rem_seconds / 3600;

                $new_price = (float) $new_plan['price_idr'];
                $curr_price = (float) $current_sub['price_idr'];

                // Rule A: Downgrade Protection
                if ($new_price < $curr_price) {
                    echo json_encode(['status' => 'error', 'message' => 'Downgrade dilarang. Tunggu paket ' . $current_sub['plan_name'] . ' anda habis masa aktifnya.']);
                    break;
                }

                // Rule B: Same-Tier Repurchase Restriction
                if ($new_plan['id'] == $current_sub['plan_id']) {
                    if (strtolower($new_plan['name']) === 'prematur') {
                        if ($rem_hours > 1) {
                            echo json_encode(['status' => 'error', 'message' => 'Paket Prematur hanya dapat dibeli ulang 1 jam sebelum habis. Sisa: ' . round($rem_hours, 1) . ' jam.']);
                            break;
                        }
                    } else {
                        if ($rem_days > 3) {
                            echo json_encode(['status' => 'error', 'message' => 'Paket ini hanya dapat dibeli ulang 3 hari sebelum habis. Sisa: ' . round($rem_days, 1) . ' hari.']);
                            break;
                        }
                    }
                }
            }
            // ---------------------------

            $cost = $new_plan['price_idr'];
            $prefix = "INV";

            // If it's an explicit upgrade request or price is higher, we can use UPG logic
            if ($action === 'create_upgrade_invoice' && $current_sub && (float) $new_plan['price_idr'] > (float) $current_sub['price_idr']) {
                $cost = calculate_upgrade_cost($current_sub['price_idr'], $current_sub['duration_days'], $rem_days, $new_plan['price_idr']);
                $prefix = "UPG";
            }

            // Create unique external ID
            $external_id = $prefix . "-" . $_SESSION['user_id'] . "-" . $new_plan_id . "-" . time();
            $email = $_SESSION['email'] ?? 'customer@example.com';
            $description = ($prefix === 'UPG' ? "Upgrade to: " : "Subscription: ") . $new_plan['name'];

            $res = create_xendit_invoice($external_id, $cost, $email, $description);
            echo json_encode($res);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    case 'create_addon_invoice':
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['status' => 'error', 'message' => 'Authentication required']);
            break;
        }

        $addon_type = $_POST['addon_type'] ?? '';
        $sub_type = $_POST['sub_type'] ?? null;
        $qty = intval($_POST['qty'] ?? 1);

        try {
            $db = Database::getConnection();

            // Check for active eligible subscription
            $stmt = $db->prepare("SELECT s.*, p.id as plan_id FROM subscriptions s JOIN subscription_plans p ON s.plan_id = p.id WHERE s.user_id = ? AND s.status = 'active' AND s.end_date > NOW() AND p.allow_addons = 1");
            $stmt->execute([$_SESSION['user_id']]);
            $sub = $stmt->fetch();

            if (!$sub) {
                echo json_encode(['status' => 'error', 'message' => 'An active subscription (Basic/Pro/Advanced/Supreme) is required to purchase add-ons']);
                break;
            }

            $rem_days = (strtotime($sub['end_date']) - time()) / (24 * 3600);
            $price = calculate_addon_price($sub['plan_id'], $addon_type, $sub_type, $qty, $rem_days);

            if ($price == -1) {
                echo json_encode(['status' => 'error', 'message' => 'Add-on tidak tersedia untuk paket Anda.']);
                break;
            }

            if ($price == -2) {
                echo json_encode(['status' => 'error', 'message' => 'Fitur ini sudah termasuk dalam paket Anda.']);
                break;
            }

            // Basic tier: Cross Posting hanya sekali beli
            if ($sub['plan_id'] === 'basic' && ($addon_type === 'cross_posting' || $addon_type === 'cross_threads')) {
                $checkStmt = $db->prepare("SELECT COUNT(*) as cnt FROM subscription_addons WHERE user_id = ? AND addon_type IN ('cross_posting', 'cross_threads')");
                $checkStmt->execute([$_SESSION['user_id']]);
                $existing = $checkStmt->fetch();
                if ($existing && $existing['cnt'] > 0) {
                    echo json_encode(['status' => 'error', 'message' => 'Promo Cross Posting untuk Basic hanya dapat dibeli 1x.']);
                    break;
                }
            }

            if ($price <= 0) {
                echo json_encode(['status' => 'error', 'message' => 'Harga add-on tidak valid.']);
                break;
            }

            // External ID: ADD-user_id-addon_type-qty-timestamp
            $external_id = "ADD-" . $_SESSION['user_id'] . "-" . $addon_type . "-" . $qty . "-" . time();
            $email = $_SESSION['email'] ?? 'customer@example.com';
            $description = "Add-on: " . strtoupper($addon_type) . " ($qty units)";

            $res = create_xendit_invoice($external_id, $price, $email, $description);
            echo json_encode($res);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;


    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
        break;
}
