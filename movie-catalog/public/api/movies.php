<?php
header('Content-Type: application/json');

$root = dirname(__DIR__, 2);

$pdo = require $root . '/src/db/connection.php';

// Load config.json properly
$configPath = $root . '/src/config/config.json';
$config = json_decode(file_get_contents($configPath), true);

require_once $root . '/src/repositories/MovieRepository.php';
require_once $root . '/src/helpers/Pagination.php';

try {

    $page = max(1, (int)($_GET['page'] ?? 1));

    // ✅ Proper limit handling
    $limit = isset($_GET['limit'])
        ? (int)$_GET['limit']
        : (int)$config['pagination']['default_limit'];

    $maxLimit = (int)$config['pagination']['max_limit'];

    $sort = $_GET['sort'] ?? 'NUM';
    $dir  = strtoupper($_GET['dir'] ?? 'ASC');

    // Collect filters
    $searchableCols = [
        'NUM','FORMATTEDTITLE','YEAR','LENGTH','CERTIFICATION',
        'RATING','FILESIZE','LANGUAGES','CATEGORY',
        'RESOLUTION','AUDIOFORMAT','FILEPATH'
    ];

    $filters = [];

    foreach ($searchableCols as $col) {
        if (!empty($_GET[$col])) {
            $filters[$col] = $_GET[$col];
        }
    }

    $pagination = new Pagination($page, $limit, $maxLimit);
    $repo = new MovieRepository($pdo);

    $totalRows = $repo->countMovies($filters);
    $movies = $repo->getMovies($filters, $sort, $dir, $pagination);

    echo json_encode([
        'data'  => $movies,
        'page'  => $page,
        'pages' => ceil($totalRows / $pagination->limit),
        'total' => $totalRows
    ]);

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}
