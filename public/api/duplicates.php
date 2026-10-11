<?php
declare(strict_types=1);

$root = dirname(__DIR__, 2);
require_once $root . '/src/helpers/ApiResponse.php';
ApiResponse::configure();

$pdo = require_once $root . '/src/db/connection.php';
require_once $root . '/src/controllers/StatsController.php';

try {
    $controller = new StatsController($pdo);
    $rows = $controller->getDuplicateRows();
    echo json_encode($rows);
} catch (Throwable $e) {
    ApiResponse::serverError(
        'Duplicate rows API failed',
        $e,
        'Unable to load duplicate movies'
    );
}
