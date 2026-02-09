<?php
// /instatools/central-server/api/auth.php
session_start();

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

function verify_google_token($token)
{
    $url = "https://oauth2.googleapis.com/tokeninfo?id_token=" . $token;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code === 200) {
        return json_decode($response, true);
    }
    return false;
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'verify':
        $token = $_POST['credential'] ?? '';
        if (!$token) {
            echo json_encode(['status' => 'error', 'message' => 'Token missing']);
            break;
        }

        $payload = verify_google_token($token);
        if ($payload) {
            $email = $payload['email'];
            $name = $payload['name'] ?? explode('@', $email)[0];

            try {
                $db = Database::getConnection();
                $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
                $stmt->execute([$email]);
                $user = $stmt->fetch();

                if ($user) {
                    $user_id = $user['id'];
                } else {
                    // Create user if not exists
                    $stmt = $db->prepare("INSERT INTO users (username, full_name, role, is_active) VALUES (?, ?, 'operator', 1)");
                    $stmt->execute([$email, $name]);
                    $user_id = $db->lastInsertId();
                }

                // Set Session
                $_SESSION['user_id'] = $user_id;
                $_SESSION['username'] = $email;

                // Start session or return token
                echo json_encode([
                    'status' => 'success',
                    'user' => [
                        'id' => $user_id,
                        'email' => $email,
                        'name' => $name
                    ],
                    'message' => 'Authenticated via Google'
                ]);
            } catch (Exception $e) {
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid Google Token']);
        }
        break;

    case 'login':
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';

        if (!$username || !$password) {
            echo json_encode(['status' => 'error', 'message' => 'Username and password required']);
            break;
        }

        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("SELECT id, username, hashed_password, full_name FROM users WHERE username = ? AND is_active = 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['hashed_password'])) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                echo json_encode([
                    'status' => 'success',
                    'user' => [
                        'id' => $user['id'],
                        'email' => $user['username'],
                        'name' => $user['full_name']
                    ]
                ]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Invalid username or password']);
            }
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    case 'sso':
        $token = $_GET['token'] ?? '';
        if (!$token) {
            echo json_encode(['status' => 'error', 'message' => 'SSO Token missing']);
            break;
        }

        $parts = explode(':', $token);
        if (count($parts) !== 3) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid SSO Token format']);
            break;
        }

        list($username, $timestamp, $signature) = $parts;
        $secret = "your-fallback-secret-key-change-it-in-prod"; // MUST MATCH BOTH SIDES

        // 1. Verify Age (5 mins max)
        if (time() - intval($timestamp) > 300) {
            echo json_encode(['status' => 'error', 'message' => 'SSO Token expired']);
            break;
        }

        // 2. Verify Signature
        $message = $username . ":" . $timestamp;
        $expected_sig = hash_hmac('sha256', $message, $secret);

        if ($signature !== $expected_sig) {
            echo json_encode(['status' => 'error', 'message' => 'SSO Signature mismatch']);
            break;
        }

        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("SELECT id, username, full_name FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if (!$user) {
                // Auto-create user if it exists in local app but not central
                $stmt = $db->prepare("INSERT INTO users (username, full_name, role, is_active) VALUES (?, ?, 'operator', 1)");
                $stmt->execute([$username, $username]); // simplified name
                $user_id = $db->lastInsertId();
            } else {
                $user_id = $user['id'];
            }

            $_SESSION['user_id'] = $user_id;
            $_SESSION['username'] = $username;
            session_write_close();
            header('Location: /');
            exit;
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    case 'check':
        if (isset($_SESSION['user_id'])) {
            echo json_encode(['status' => 'success', 'logged_in' => true, 'username' => $_SESSION['username'] ?? 'User']);
        } else {
            echo json_encode(['status' => 'success', 'logged_in' => false]);
        }
        break;

    case 'sync':
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
            break;
        }
        $username = $_SESSION['username'] ?? 'unknown';
        $timestamp = time();
        $secret = "your-fallback-secret-key-change-it-in-prod";
        $message = "$username:$timestamp";
        $signature = hash_hmac('sha256', $message, $secret);
        echo json_encode(['status' => 'success', 'token' => "$username:$timestamp:$signature"]);
        break;

    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
        break;
}
