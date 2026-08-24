<?php
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$root = dirname(__DIR__, 2);
$initialOutputBufferLevel = ob_get_level();
ob_start();

try {
    require_once $root . '/src/helpers/ApiResponse.php';
    ApiResponse::configure();

    $pdo = require $root . '/src/db/connection.php';
    require_once $root . '/src/controllers/StatsController.php';

    $controller = new StatsController($pdo);

    $refresh = filter_var($_GET['refresh'] ?? $_GET['nocache'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $useCache = !$refresh;

    if ($refresh) {
        $controller->clearStatsCache();
    }

    $stats = $controller->getStats($useCache);
    $responseBody = json_encode($stats, JSON_THROW_ON_ERROR);

    while (ob_get_level() > $initialOutputBufferLevel) {
        ob_end_clean();
    }

    header('X-Cache: ' . ($useCache ? 'HIT-or-MISS' : 'BYPASS'));
    echo $responseBody;
} catch (Throwable $e) {
    while (ob_get_level() > $initialOutputBufferLevel) {
        ob_end_clean();
    }
    if (class_exists('ApiResponse')) {
        ApiResponse::serverError('Stats API failed', $e, 'Unable to load statistics');
    }
    error_log('Stats API failed before initialization: ' . (string)$e);
    http_response_code(500);
    echo json_encode(['error' => true, 'message' => 'Unable to load statistics']);
}
