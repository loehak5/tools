<?php
// /instatools/central-server/api/callback/xendit.php
require_once __DIR__ . '/../../config/database.php';

function get_env_var($key, $default = null)
{
    if (isset($_ENV[$key]))
        return $_ENV[$key];
    if (isset($_SERVER[$key]))
        return $_SERVER[$key];
    $val = function_exists('getenv') ? getenv($key) : false;
    return $val !== false ? $val : $default;
}

// Polyfill for getallheaders if not exists
if (!function_exists('getallheaders')) {
    function getallheaders()
    {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

// 1. Get Callback Data
$raw_data = file_get_contents('php://input');
$data = json_decode($raw_data, true);

// 2. Log full request for debugging
file_put_contents(__DIR__ . '/xendit_callback.log', date('[Y-m-d H:i:s] ') . $raw_data . PHP_EOL, FILE_APPEND);

// 3. Verify Callback Token for Security
$callback_token = get_env_var('XENDIT_CALLBACK_TOKEN');
$headers = getallheaders();
$received_token = $headers['x-callback-token'] ?? $headers['X-Callback-Token'] ?? '';

if ($received_token !== $callback_token) {
    http_response_code(403);
    die("Forbidden: Invalid Callback Token");
}

// 4. Process Payment
if ($data['status'] === 'PAID') {
    $external_id = $data['external_id'];
    $parts = explode('-', $external_id);
    $prefix = $parts[0] ?? '';

    file_put_contents(__DIR__ . '/xendit_callback.log', "[DEBUG] Parsing External ID: $external_id | Prefix: $prefix" . PHP_EOL, FILE_APPEND);

    try {
        $db = Database::getConnection();

        if (($prefix === 'INV' || $prefix === 'UPG') && count($parts) >= 4) {
            $user_id = intval($parts[1]);
            $plan_id = $parts[2];

            // Get Plan details
            $stmt = $db->prepare("SELECT * FROM subscription_plans WHERE id = ?");
            $stmt->execute([$plan_id]);
            $plan = $stmt->fetch();

            if ($plan) {
                $duration_days = $plan['duration_days'];
                $start_date = date('Y-m-d H:i:s');
                $end_date = date('Y-m-d H:i:s', strtotime("+$duration_days days"));

                // DEACTIVATE any existing active sub for this user
                $stmt = $db->prepare("UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'");
                $stmt->execute([$user_id]);

                // INSERT new subscription
                $stmt = $db->prepare("INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status) VALUES (?, ?, ?, ?, 'active')");
                $stmt->execute([$user_id, $plan_id, $start_date, $end_date]);

                file_put_contents(__DIR__ . '/xendit_callback.log', "[DEBUG] $prefix Activated: User $user_id, Plan $plan_id" . PHP_EOL, FILE_APPEND);
            } else {
                file_put_contents(__DIR__ . '/xendit_callback.log', "[DEBUG] Error: Plan $plan_id not found in database for $prefix transaction" . PHP_EOL, FILE_APPEND);
            }
        } elseif ($prefix === 'ADD' && count($parts) >= 5) {
            $user_id = intval($parts[1]);
            $addon_type = $parts[2];
            $qty = intval($parts[3]);
            $paid_amount = $data['amount'];

            // Add-ons sync with the current active subscription's end date
            $stmt = $db->prepare("SELECT end_date FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY end_date DESC LIMIT 1");
            $stmt->execute([$user_id]);
            $sub = $stmt->fetch();

            $start_date = date('Y-m-d H:i:s');
            $end_date = $sub ? $sub['end_date'] : date('Y-m-d H:i:s', strtotime("+30 days")); // Default to 30 days if no active sub

            $stmt = $db->prepare("INSERT INTO subscription_addons (user_id, addon_type, quantity, price_paid, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)");
            $stmt->execute([$user_id, $addon_type, $qty, $paid_amount, $start_date, $end_date]);

            file_put_contents(__DIR__ . '/xendit_callback.log', "[DEBUG] ADDON Activated: User $user_id, Type $addon_type, Qty $qty" . PHP_EOL, FILE_APPEND);
        } else {
            file_put_contents(__DIR__ . '/xendit_callback.log', "[DEBUG] Error: Invalid external_id format or unsupported prefix '$prefix' for PAID status." . PHP_EOL, FILE_APPEND);
        }

        echo json_encode(['status' => 'success']);
    } catch (Exception $e) {
        file_put_contents(__DIR__ . '/xendit_callback.log', "[DEBUG] DB ERROR: " . $e->getMessage() . PHP_EOL, FILE_APPEND);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} else {
    file_put_contents(__DIR__ . '/xendit_callback.log', "[DEBUG] Status ignored: " . $data['status'] . PHP_EOL, FILE_APPEND);
    echo json_encode(['status' => 'success', 'message' => 'Status ignored: ' . $data['status']]);
}
