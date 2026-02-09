<?php
require_once __DIR__ . '/config/database.php';
$db = Database::getConnection();
$stmt = $db->query("DESCRIBE users");
echo json_encode($stmt->fetchAll());
