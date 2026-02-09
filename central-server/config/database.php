<?php
// /instatools/central-server/config/database.php

if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
}

// Simple .env loader in case composer is not used or library not available
if (!function_exists('load_env')) {
    function load_env($path)
    {
        if (!file_exists($path))
            return;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0)
                continue;
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                putenv(trim($parts[0]) . "=" . trim($parts[1]));
            }
        }
    }
}

load_env(__DIR__ . '/../.env');

class Database
{
    private static $instance = null;

    public static function getConnection()
    {
        if (self::$instance === null) {
            $host = getenv('DB_HOST');
            $db = getenv('DB_NAME');
            $user = getenv('DB_USER');
            $pass = getenv('DB_PASS');
            $port = getenv('DB_PORT') ?: 3306;
            $charset = 'utf8mb4';

            $dsn = "mysql:host=$host;dbname=$db;port=$port;charset=$charset";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
            } catch (\PDOException $e) {
                // Return a clear error if DB is not reachable
                die("Database Connection Error: " . $e->getMessage());
            }
        }
        return self::$instance;
    }
}
