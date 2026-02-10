<?php
// /instatools/central-server/index.php
session_start();

$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// SEO files
if ($request_uri === '/sitemap.xml') {
    header('Content-Type: application/xml');
    readfile(__DIR__ . '/sitemap.xml');
    exit;
} elseif ($request_uri === '/robots.txt') {
    header('Content-Type: text/plain');
    readfile(__DIR__ . '/robots.txt');
    exit;
}

// API Routes
if (strpos($request_uri, '/api/billing') !== false) {
    require_once __DIR__ . '/api/billing.php';
    exit;
} elseif (strpos($request_uri, '/api/auth') !== false) {
    require_once __DIR__ . '/api/auth.php';
    exit;
}

// Page Routes
switch (true) {
    case $request_uri === '/logout':
        session_destroy();
        header('Location: http://localhost:5173');
        exit;

    case $request_uri === '/login':
        if (isset($_SESSION['user_id'])) {
            header('Location: /billing');
            exit;
        }
        require_once __DIR__ . '/views/login.php';
        break;

    case $request_uri === '/billing':
        if (!isset($_SESSION['user_id'])) {
            header('Location: /login');
            exit;
        }
        require_once __DIR__ . '/views/landing.php';
        break;

    case $request_uri === '/docs':
        require_once __DIR__ . '/views/docs.php';
        break;

    case $request_uri === '/about':
        require_once __DIR__ . '/views/about.php';
        break;

    case $request_uri === '/':
        require_once __DIR__ . '/views/welcome.php';
        break;

    default:
        header('Location: /');
        exit;
}
