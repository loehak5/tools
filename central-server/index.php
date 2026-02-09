<?php
// /instatools/central-server/index.php
session_start();

$request_uri = $_SERVER['REQUEST_URI'];

// Simple Routing
if (strpos($request_uri, '/api/billing') !== false) {
    require_once __DIR__ . '/api/billing.php';
} elseif (strpos($request_uri, '/api/auth') !== false) {
    require_once __DIR__ . '/api/auth.php';
} elseif (strpos($request_uri, '/logout') !== false) {
    session_destroy();
    header('Location: http://localhost:5173');
    exit;
} else {
    // Check Authentication
    if (!isset($_SESSION['user_id'])) {
        // Not logged in -> Show Login Page
        require_once __DIR__ . '/views/login.php';
    } else {
        // Logged in -> Show Subscription Plans (Landing Page)
        require_once __DIR__ . '/views/landing.php';
    }
}
