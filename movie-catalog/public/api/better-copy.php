<?php
header('Content-Type: application/json');

$root = dirname(__DIR__, 2);
$pdo = require_once $root . '/src/db/connection.php';
require_once $root . '/src/controllers/StatsController.php';

try {
    $controller = new StatsController($pdo);
    $rows = $controller->getBetterCopyRows();
    echo json_encode($rows);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Get Better Copy rows API failed', 'message' => $e->getMessage()]);
}
