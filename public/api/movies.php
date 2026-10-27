<?php
declare(strict_types=1);

$root = dirname(__DIR__, 2);

require_once $root . '/src/helpers/ApiResponse.php';
require_once $root . '/src/helpers/MovieTable.php';

ApiResponse::configure();

require_once $root . '/src/db/ConnectionFactory.php';
$pdo = ConnectionFactory::fromRequest($_GET);

// Defaults to the `movies` table; `archive=1` switches the whitelisted
// source to the hidden `paripakva` table (Ctrl+Shift+K in the UI).
$table = MovieTable::fromRequest($_GET);

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
        'PATH',
        // Filter-only columns used by the analytics drill-down
        // (no table header, shown as removable filter pills).
        'DIRECTOR',
        'ACTORS',
        'COUNTRY'
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
            $pdo,
            $table
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

        // Echoes 'movies' or 'paripakva' so the UI can confirm which
        // collection the rendered page came from.
        'source' =>
            $repository->getSourceName(),

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
