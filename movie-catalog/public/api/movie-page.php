<?php
declare(strict_types=1);

$root = dirname(__DIR__, 2);
require_once $root . '/src/helpers/ApiResponse.php';
ApiResponse::configure();

try {
    require_once $root . '/src/db/connection.php';
    require_once $root . '/src/helpers/Pagination.php';
    require_once $root . '/src/repositories/MovieRepository.php';

    $repo = new MovieRepository($pdo);

    $config = json_decode(
        file_get_contents(__DIR__ . '/../../src/config/config.json'),
        true
    );

    // Get query params and apply the same pagination limits as movies.php.
    $num = isset($_GET['num']) ? (int)$_GET['num'] : 0;
    $requestedPerPage = (int)(
        $_GET['perPage'] ?? $config['pagination']['default_limit']
    );
    $pagination = new Pagination(
        1,
        $requestedPerPage,
        (int)$config['pagination']['max_limit']
    );
    $perPage = $pagination->limit;
    $sort = $_GET['sort'] ?? 'NUM';
    $dir  = $_GET['dir'] ?? 'ASC';
    $mode = strtoupper($_GET['mode'] ?? 'AND');
    $mode = $mode === 'OR' ? 'OR' : 'AND';
    $fuzzy = filter_var($_GET['fuzzy'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $titleSearchMode = $_GET['titleMode'] ?? null;
    $titleSearchMode = is_string($titleSearchMode)
        ? strtoupper($titleSearchMode)
        : null;
    $filters = $_GET['filters'] ?? [];

    // Compute page for given NUM
    $page = $repo->getPageForMovie(
        $num,
        $perPage,
        $sort,
        $dir,
        $filters,
        $mode,
        $fuzzy,
        $titleSearchMode
    );

    echo json_encode([
        'found' => $page !== null,
        'page' => $page
    ]);
} catch (Throwable $e) {
    ApiResponse::serverError(
        'Movie page API failed',
        $e,
        'Unable to locate the movie page'
    );
}
