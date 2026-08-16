<?php
declare(strict_types=1);

ini_set('display_errors', 0); // hide errors from output
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

try {
    require_once __DIR__ . '/../../src/db/connection.php';
    require_once __DIR__ . '/../../src/helpers/Pagination.php';
    require_once __DIR__ . '/../../src/repositories/MovieRepository.php';

    $repo = new MovieRepository($pdo);

    // Get query params
    $num = isset($_GET['num']) ? (int)$_GET['num'] : 0;
    $perPage = isset($_GET['perPage']) ? (int)$_GET['perPage'] : 50;
    $sort = $_GET['sort'] ?? 'NUM';
    $dir  = $_GET['dir'] ?? 'ASC';
    $filters = $_GET['filters'] ?? [];

    // Compute page for given NUM
    $page = $repo->getPageForMovie($num, $perPage, $sort, $dir, $filters);

    echo json_encode(['page' => $page]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
