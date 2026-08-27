<?php
declare(strict_types=1);

$root = dirname(__DIR__, 2);

require_once $root . '/src/helpers/ApiResponse.php';

ApiResponse::configure();

$pdo = require $root . '/src/db/connection.php';

$configPath =
    $root . '/src/config/config.json';

$config = json_decode(
    file_get_contents($configPath),
    true
);

require_once
    $root .
    '/src/repositories/MovieRepository.php';

require_once
    $root .
    '/src/helpers/Pagination.php';

try {
    $page = max(
        1,
        (int)($_GET['page'] ?? 1)
    );

    $limit = isset($_GET['limit'])
        ? (int)$_GET['limit']
        : (int)$config[
            'pagination'
        ][
            'default_limit'
        ];

    $maxLimit =
        (int)$config[
            'pagination'
        ][
            'max_limit'
        ];

    $sort =
        $_GET['sort'] ??
        'NUM';

    $dir = strtoupper(
        $_GET['dir'] ??
        'ASC'
    );

    $mode = strtoupper(
        $_GET['mode'] ??
        'AND'
    );

    $mode =
        $mode === 'OR'
            ? 'OR'
            : 'AND';

    $fuzzy = filter_var(
        $_GET['fuzzy'] ?? false,
        FILTER_VALIDATE_BOOLEAN
    );

    $titleSearchMode = $_GET['titleMode'] ?? null;
    $titleSearchMode = is_string($titleSearchMode)
        ? strtoupper($titleSearchMode)
        : null;

    $searchableColumns = [
        'NUM',
        'FORMATTEDTITLE',
        'YEAR',
        'LENGTH',
        'CERTIFICATION',
        'RATING',
        'FILESIZE',
        'LANGUAGES',
        'CATEGORY',
        'RESOLUTION',
        'AUDIOFORMAT',
        'FILEPATH',
        'PATH'
    ];

    $filters = [];

    foreach (
        $searchableColumns as
        $column
    ) {
        if (
            !empty(
                $_GET[$column]
            )
        ) {
            $filters[$column] =
                $_GET[$column];
        }
    }

    $pagination =
        new Pagination(
            $page,
            $limit,
            $maxLimit
        );

    $repository =
        new MovieRepository(
            $pdo
        );

    $totalRows =
        $repository->countMovies(
            $filters,
            $mode,
            $fuzzy,
            $titleSearchMode
        );

    $movies =
        $repository->getMovies(
            $filters,
            $sort,
            $dir,
            $pagination,
            $mode,
            $fuzzy,
            $titleSearchMode
        );

    echo json_encode([
        'data' =>
            $movies,

        'page' =>
            $page,

        'limit' =>
            $pagination->limit,

        'pages' =>
            ceil(
                $totalRows /
                $pagination->limit
            ),

        'total' =>
            $totalRows
    ]);
} catch (Throwable $error) {
    ApiResponse::serverError(
        'Movies API failed',
        $error,
        'Unable to load movies'
    );
}
