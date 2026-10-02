<?php

declare(strict_types=1);

$root = dirname(__DIR__, 2);

require_once $root . '/movie-catalog/src/helpers/FileHelper.php';
require_once $root . '/movie-catalog/src/helpers/Pagination.php';
require_once $root . '/movie-catalog/src/repositories/MovieRepository.php';
require_once $root . '/movie-catalog/src/controllers/StatsController.php';

$failures = 0;

function assertSameValue(mixed $expected, mixed $actual, string $label): void
{
    global $failures;

    if ($expected === $actual) {
        echo "PASS: {$label}\n";
        return;
    }

    $failures++;
    echo "FAIL: {$label}\n";
    echo '  Expected: ' . var_export($expected, true) . "\n";
    echo '  Actual:   ' . var_export($actual, true) . "\n";
}

assertSameValue(
    ['path' => 'C:\\Movies', 'file' => 'Alien.mkv'],
    FileHelper::splitPath('C:\\Movies\\Alien.mkv'),
    'FileHelper splits a Windows path'
);

assertSameValue(
    ['path' => '/srv/movies', 'file' => 'Alien.mkv'],
    FileHelper::splitPath('/srv/movies/Alien.mkv'),
    'FileHelper splits a Unix path'
);

assertSameValue(
    ['path' => 'folder\\sub', 'file' => 'Alien.mkv'],
    FileHelper::splitPath('folder\\sub/Alien.mkv'),
    'FileHelper uses the final separator in a mixed path'
);

assertSameValue(
    ['path' => '', 'file' => 'MISSING'],
    FileHelper::splitPath('MISSING'),
    'FileHelper handles a value without separators'
);

$pagination = new Pagination(3, 50, 200);
assertSameValue(3, $pagination->page, 'Pagination preserves a valid page');
assertSameValue(50, $pagination->limit, 'Pagination preserves a valid limit');
assertSameValue(100, $pagination->offset, 'Pagination calculates the offset');

$minimumPagination = new Pagination(0, 0, 200);
assertSameValue(1, $minimumPagination->page, 'Pagination clamps the minimum page');
assertSameValue(1, $minimumPagination->limit, 'Pagination clamps the minimum limit');

$maximumPagination = new Pagination(1, 500, 200);
assertSameValue(200, $maximumPagination->limit, 'Pagination clamps the maximum limit');

$repositoryReflection = new ReflectionClass(MovieRepository::class);
$repository = $repositoryReflection->newInstanceWithoutConstructor();

$parseTitleFilter = $repositoryReflection->getMethod('parseTitleFilter');

$titleCases = [
    'Sing (2016)' => ['Sing', '2016'],
    'Sing(2016)' => ['Sing', '2016'],
    '(2016)' => ['', '2016'],
    '1917' => ['1917', null],
    '1984' => ['1984', null],
    '2012' => ['2012', null],
    '2001: A Space Odyssey' => ['2001: A Space Odyssey', null],
    'Blade Runner 2049' => ['Blade Runner 2049', null],
    'Class of 1984' => ['Class of 1984', null]
];

foreach ($titleCases as $input => $expected) {
    assertSameValue(
        $expected,
        $parseTitleFilter->invoke($repository, $input),
        "Title parser handles {$input}"
    );
}

$buildLikePattern = $repositoryReflection->getMethod('buildLikePattern');

assertSameValue(
    '%Alien%',
    $buildLikePattern->invoke($repository, 'Alien', false),
    'Normal title search builds a contains pattern'
);

assertSameValue(
    '%a%l%n%',
    $buildLikePattern->invoke($repository, 'aln', true),
    'Fuzzy title search builds an ordered-character pattern'
);

assertSameValue(
    '%100=%=_==%',
    $buildLikePattern->invoke($repository, '100%_=', false),
    'LIKE pattern escapes wildcard and escape characters'
);

// File is the displayed basename, not the hidden full FILEPATH. These same
// builders are used by getMovies(), countMovies(), and getPageForMovie().
$buildWhereClause = $repositoryReflection->getMethod('buildWhereClause');
$buildOrderByClause = $repositoryReflection->getMethod('buildOrderByClause');
$fileExpression = "SUBSTRING_INDEX(REPLACE(COALESCE(`FILEPATH`, ''), CHAR(92), '/'), '/', -1)";

foreach ([true, false] as $fuzzy) {
    foreach (['EXACT', 'CONTAINS', 'FUZZY'] as $titleMode) {
        [$where, $params] = $buildWhereClause->invoke(
            $repository, ['FILEPATH' => 'missing'], 'AND', $fuzzy, $titleMode
        );
        assertSameValue(
            " WHERE (LOWER($fileExpression) LIKE LOWER(:FILEPATH) ESCAPE '=')",
            $where,
            'File searches the basename case-insensitively for ' . $titleMode
        );
        assertSameValue(
            ['FILEPATH' => '%missing%'],
            $params,
            'File always uses a contiguous contains pattern, independent of fuzzy flags'
        );
    }
}

[, $fileWildcardParams] = $buildWhereClause->invoke(
    $repository, ['FILEPATH' => '100%_cut='], 'AND', true, 'FUZZY'
);
assertSameValue(
    ['FILEPATH' => '%100=%=_cut==%'],
    $fileWildcardParams,
    'File filter treats percent, underscore, and equals as literal characters'
);

$pathExpression = $repositoryReflection->getMethod('pathSqlExpression')->invoke($repository);
[$combinedWhere, $combinedParams] = $buildWhereClause->invoke(
    $repository, ['FILEPATH' => 'missing', 'PATH' => 'archive'], 'OR', true, 'FUZZY'
);
assertSameValue(
    " WHERE (LOWER($fileExpression) LIKE LOWER(:FILEPATH) ESCAPE '=' OR " .
    "LOWER($pathExpression) LIKE LOWER(:PATH) ESCAPE '=')",
    $combinedWhere,
    'OR combines the independent File and folder Path predicates'
);
assertSameValue(
    ['FILEPATH' => '%missing%', 'PATH' => '%archive%'],
    $combinedParams,
    'Folder Path also uses literal contains matching'
);

[$fileOrder] = $buildOrderByClause->invoke($repository, [], 'FILEPATH', 'DESC', true, 'FUZZY');
assertSameValue(
    "$fileExpression DESC, `NUM` ASC",
    $fileOrder,
    'File sorting and page lookup order by the displayed basename with a stable tiebreaker'
);

[, $titleParams] = $buildWhereClause->invoke(
    $repository, ['FORMATTEDTITLE' => 'missing', 'FILEPATH' => 'missing'], 'AND', true, 'FUZZY'
);
assertSameValue(
    ['title' => '%m%i%s%s%i%n%g%', 'FILEPATH' => '%missing%'],
    $titleParams,
    'Title retains ordered-character fuzzy search without affecting File'
);

$statsReflection = new ReflectionClass(StatsController::class);
$statsController = $statsReflection->newInstanceWithoutConstructor();
$calculateHealthScore = $statsReflection->getMethod('calculateHealthScore');
$buildReleaseYearAnalytics = $statsReflection->getMethod(
    'buildReleaseYearAnalytics'
);
$buildGenreAnalytics = $statsReflection->getMethod('buildGenreAnalytics');
$buildRatingRuntimeAnalytics = $statsReflection->getMethod(
    'buildRatingRuntimeAnalytics'
);
$buildStorageAnalytics = $statsReflection->getMethod(
    'buildStorageAnalytics'
);
$buildDelimitedValueAnalytics = $statsReflection->getMethod(
    'buildDelimitedValueAnalytics'
);

assertSameValue(
    [
        'tagged_movies' => 3,
        'untagged_movies' => 2,
        'assignments' => 5,
        'top_item' => ['label' => 'English', 'count' => 3],
        'items' => [
            ['label' => 'English', 'count' => 3],
            ['label' => 'French', 'count' => 1],
            ['label' => 'Spanish', 'count' => 1]
        ]
    ],
    $buildDelimitedValueAnalytics->invoke(
        $statsController,
        [
            'English, French',
            'English / Spanish',
            'english, English'
        ],
        5
    ),
    'Language/country analytics normalize and count delimited values'
);

assertSameValue(
    [
        'rated_movies' => 6,
        'unrated_movies' => 2,
        'runtime_known_movies' => 6,
        'runtime_missing_movies' => 2,
        'top_rating_band' => [
            'key' => '8-plus',
            'label' => '8+',
            'count' => 2
        ],
        'common_runtime_band' => [
            'key' => 'standard',
            'label' => '90–119 min',
            'count' => 2
        ],
        'rating_bands' => [
            ['key' => 'under-5', 'label' => 'Under 5', 'count' => 1],
            ['key' => '5-range', 'label' => '5–5.9', 'count' => 1],
            ['key' => '6-range', 'label' => '6–6.9', 'count' => 1],
            ['key' => '7-range', 'label' => '7–7.9', 'count' => 1],
            ['key' => '8-plus', 'label' => '8+', 'count' => 2]
        ],
        'runtime_bands' => [
            ['key' => 'short', 'label' => 'Under 90 min', 'count' => 1],
            ['key' => 'standard', 'label' => '90–119 min', 'count' => 2],
            ['key' => 'long', 'label' => '120–149 min', 'count' => 2],
            ['key' => 'epic', 'label' => '150+ min', 'count' => 1]
        ]
    ],
    $buildRatingRuntimeAnalytics->invoke(
        $statsController,
        [
            ['RATING' => '4.5', 'LENGTH' => '80'],
            ['RATING' => '5.5', 'LENGTH' => '90'],
            ['RATING' => '6.5', 'LENGTH' => '119'],
            ['RATING' => '7.5', 'LENGTH' => '120'],
            ['RATING' => '8.5', 'LENGTH' => '149'],
            ['RATING' => '9', 'LENGTH' => '150'],
            ['RATING' => '0', 'LENGTH' => '0']
        ],
        8
    ),
    'Rating/runtime analytics assign boundary values to the correct bands'
);

assertSameValue(
    [
        'sized_movies' => 5,
        'unsized_movies' => 4,
        'total_size' => 16106127360,
        'average_size' => 3221225472,
        'median_size' => 2147483648,
        'largest_movie' => [
            'num' => '5',
            'title' => 'Largest Movie',
            'size' => 8053063680
        ],
        'size_bands' => [
            [
                'key' => 'compact',
                'label' => 'Under 700 MB',
                'count' => 1,
                'total_size' => 536870912
            ],
            [
                'key' => 'standard-definition',
                'label' => '700 MB–1.49 GB',
                'count' => 1,
                'total_size' => 1073741824
            ],
            [
                'key' => 'high-definition',
                'label' => '1.5–2.99 GB',
                'count' => 1,
                'total_size' => 2147483648
            ],
            [
                'key' => 'large',
                'label' => '3–5.99 GB',
                'count' => 1,
                'total_size' => 4294967296
            ],
            [
                'key' => 'very-large',
                'label' => '6 GB+',
                'count' => 1,
                'total_size' => 8053063680
            ]
        ]
    ],
    $buildStorageAnalytics->invoke(
        $statsController,
        [
            ['NUM' => '1', 'FORMATTEDTITLE' => 'Compact', 'FILESIZE' => '512'],
            ['NUM' => '2', 'FORMATTEDTITLE' => 'Standard', 'FILESIZE' => '1024'],
            ['NUM' => '3', 'FORMATTEDTITLE' => 'HD', 'FILESIZE' => '2048'],
            ['NUM' => '4', 'FORMATTEDTITLE' => 'Large', 'FILESIZE' => '4096'],
            ['NUM' => '5', 'FORMATTEDTITLE' => 'Largest Movie', 'FILESIZE' => '7680'],
            ['NUM' => '6', 'FORMATTEDTITLE' => 'Zero', 'FILESIZE' => '0'],
            ['NUM' => '7', 'FORMATTEDTITLE' => 'Unknown', 'FILESIZE' => 'unknown'],
            ['NUM' => '8', 'FORMATTEDTITLE' => 'Missing', 'FILESIZE' => null]
        ],
        9
    ),
    'Storage analytics calculate coverage, median, largest movie, and bands'
);

assertSameValue(
    [
        'tagged_movies' => 3,
        'untagged_movies' => 2,
        'genre_assignments' => 5,
        'top_genre' => ['label' => 'Action', 'count' => 3],
        'genres' => [
            ['label' => 'Action', 'count' => 3],
            ['label' => 'Adventure', 'count' => 1],
            ['label' => 'Sci-Fi', 'count' => 1]
        ]
    ],
    $buildGenreAnalytics->invoke(
        $statsController,
        [
            'Action, Adventure',
            'Action / Sci-Fi',
            'action, Action'
        ],
        5
    ),
    'Genre analytics count each genre once per movie'
);

assertSameValue(
    [
        'dated_movies' => 6,
        'undated_movies' => 4,
        'peak_year' => ['year' => 1980, 'count' => 3],
        'busiest_decade' => [
            'start_year' => 1980,
            'label' => '1980s',
            'count' => 4
        ],
        'years' => [
            ['year' => 1979, 'count' => 2],
            ['year' => 1980, 'count' => 3],
            ['year' => 1985, 'count' => 1]
        ],
        'decades' => [
            ['start_year' => 1970, 'label' => '1970s', 'count' => 2],
            ['start_year' => 1980, 'label' => '1980s', 'count' => 4]
        ]
    ],
    $buildReleaseYearAnalytics->invoke(
        $statsController,
        [
            ['release_year' => '1979', 'movie_count' => '2'],
            ['release_year' => '1980', 'movie_count' => '3'],
            ['release_year' => '1985', 'movie_count' => '1'],
            ['release_year' => '0', 'movie_count' => '4']
        ],
        10
    ),
    'Release-year analytics calculate timeline and decade summaries'
);

assertSameValue(
    100,
    $calculateHealthScore->invoke($statsController, ['total_movies' => 0]),
    'Health score treats an empty library as healthy'
);

assertSameValue(
    90,
    $calculateHealthScore->invoke($statsController, [
        'total_movies' => 10,
        'missing_files' => 1,
        'needs_better_copy_count' => 1,
        'duplicate_count' => 1,
        'missing_posters' => 1,
        'incomplete_metadata' => 1
    ]),
    'Health score averages the five issue dimensions'
);

assertSameValue(
    0,
    $calculateHealthScore->invoke($statsController, [
        'total_movies' => 10,
        'duplicate_count' => 60
    ]),
    'Health score never drops below zero'
);

$cacheController = $statsReflection->newInstanceWithoutConstructor();
$cacheConfig = $statsReflection->getProperty('config');
$cacheConfig->setValue($cacheController, [
    'stats' => [
        'cache_enabled' => true,
        'cache_ttl' => 300
    ]
]);

$cachePath = sys_get_temp_dir() . '/movie-catalog-cache-' . bin2hex(random_bytes(8)) . '/stats.json';
$cachePathProperty = $statsReflection->getProperty('statsCachePath');
$cachePathProperty->setValue($cacheController, $cachePath);

$writeStatsCache = $statsReflection->getMethod('writeStatsCache');
$readStatsCache = $statsReflection->getMethod('readStatsCache');
$clearStatsCache = $statsReflection->getMethod('clearStatsCache');

$cachedStats = [
    'total_movies' => 42,
    'health_score' => 100
];

$writeStatsCache->invoke($cacheController, $cachedStats);

assertSameValue(
    $cachedStats,
    $readStatsCache->invoke($cacheController),
    'Stats cache writes and reads a valid payload'
);

$clearStatsCache->invoke($cacheController);

assertSameValue(
    null,
    $readStatsCache->invoke($cacheController),
    'Stats cache can be cleared'
);

@rmdir(dirname($cachePath));

// Analytics drill-down: numeric columns understand a range grammar and
// DIRECTOR / ACTORS / COUNTRY become filter-only columns.
$parseNumericFilterValue = $repositoryReflection->getMethod(
    'parseNumericFilterValue'
);

assertSameValue(
    ['type' => 'exact', 'min' => 2005.0],
    $parseNumericFilterValue->invoke($repository, '2005'),
    'Numeric filter parser keeps a bare number exact'
);

assertSameValue(
    ['type' => 'range', 'min' => 2000.0, 'max' => 2009.0],
    $parseNumericFilterValue->invoke($repository, '2000-2009'),
    'Numeric filter parser understands a decade range'
);

assertSameValue(
    ['type' => 'range', 'min' => 700.0, 'max' => 1535.99],
    $parseNumericFilterValue->invoke($repository, '700-1535.99'),
    'Numeric filter parser understands fractional size ranges'
);

assertSameValue(
    ['type' => 'range', 'min' => 3.0, 'max' => 9.0],
    $parseNumericFilterValue->invoke($repository, '9-3'),
    'Numeric filter parser sorts inverted ranges'
);

assertSameValue(
    ['type' => 'min', 'min' => 150.0],
    $parseNumericFilterValue->invoke($repository, '150+'),
    'Numeric filter parser understands open-ended minimums'
);

assertSameValue(
    ['type' => 'max', 'max' => 90.0],
    $parseNumericFilterValue->invoke($repository, '<90'),
    'Numeric filter parser understands exclusive maximums'
);

assertSameValue(
    null,
    $parseNumericFilterValue->invoke($repository, 'missing'),
    'Numeric filter parser rejects non-numeric values'
);

[$decadeWhere, $decadeParams] = $buildWhereClause->invoke(
    $repository, ['YEAR' => '2000-2009'], 'AND', false, null
);
assertSameValue(
    ' WHERE (`YEAR` BETWEEN :YEAR_min AND :YEAR_max)',
    $decadeWhere,
    'Decade drill-down filters the YEAR column with an inclusive range'
);
assertSameValue(
    ['YEAR_min' => 2000, 'YEAR_max' => 2009],
    $decadeParams,
    'Decade drill-down binds integer range bounds'
);

[$ratingWhere, $ratingParams] = $buildWhereClause->invoke(
    $repository, ['RATING' => '7-7.9'], 'AND', false, null
);
assertSameValue(
    ' WHERE ((`RATING` > 0 AND `RATING` BETWEEN :RATING_min AND :RATING_max))',
    $ratingWhere,
    'Rating band drill-down keeps the zero-means-unknown rule'
);
assertSameValue(
    ['RATING_min' => 7, 'RATING_max' => 7.9],
    $ratingParams,
    'Rating band drill-down binds fractional bounds'
);

[$runtimeWhere, $runtimeParams] = $buildWhereClause->invoke(
    $repository, ['LENGTH' => '150+'], 'AND', false, null
);
assertSameValue(
    ' WHERE ((`LENGTH` > 0 AND `LENGTH` >= :LENGTH_min))',
    $runtimeWhere,
    'Runtime band drill-down supports open-ended minimums'
);
assertSameValue(
    ['LENGTH_min' => 150],
    $runtimeParams,
    'Runtime band drill-down binds the minimum'
);

[$sizeWhere, $sizeParams] = $buildWhereClause->invoke(
    $repository, ['FILESIZE' => '<700'], 'AND', false, null
);
assertSameValue(
    ' WHERE ((`FILESIZE` > 0 AND `FILESIZE` < :FILESIZE_max))',
    $sizeWhere,
    'Size band drill-down supports exclusive maximums'
);
assertSameValue(
    ['FILESIZE_max' => 700],
    $sizeParams,
    'Size band drill-down binds the maximum'
);

[$exactRatingWhere, $exactRatingParams] = $buildWhereClause->invoke(
    $repository, ['RATING' => '7.5'], 'AND', false, null
);
assertSameValue(
    ' WHERE (`RATING` = :RATING)',
    $exactRatingWhere,
    'Exact numeric rating filters use equality, not LIKE'
);
assertSameValue(
    ['RATING' => 7.5],
    $exactRatingParams,
    'Exact numeric rating filters bind the value'
);

[, $legacyRatingParams] = $buildWhereClause->invoke(
    $repository, ['RATING' => 'great'], 'AND', false, null
);
assertSameValue(
    ['RATING' => '%great%'],
    $legacyRatingParams,
    'Non-numeric rating input keeps legacy contains matching'
);

[, $legacyYearParams] = $buildWhereClause->invoke(
    $repository, ['YEAR' => 'unknown'], 'AND', false, null
);
assertSameValue(
    ['YEAR' => 0],
    $legacyYearParams,
    'Non-numeric year input keeps the legacy integer cast'
);

[$directorWhere, $directorParams] = $buildWhereClause->invoke(
    $repository, ['DIRECTOR' => 'Denis Villeneuve'], 'AND', false, null
);
assertSameValue(
    " WHERE (`DIRECTOR` LIKE :DIRECTOR ESCAPE '=')",
    $directorWhere,
    'Director drill-down filters with contains matching'
);
assertSameValue(
    ['DIRECTOR' => '%Denis Villeneuve%'],
    $directorParams,
    'Director drill-down builds a contains pattern'
);

[$castWhere] = $buildWhereClause->invoke(
    $repository, ['ACTORS' => 'Amy Adams'], 'AND', false, null
);
assertSameValue(
    " WHERE (`ACTORS` LIKE :ACTORS ESCAPE '=')",
    $castWhere,
    'Cast drill-down filters the ACTORS column'
);

[$countryWhere] = $buildWhereClause->invoke(
    $repository, ['COUNTRY' => 'Canada'], 'AND', false, null
);
assertSameValue(
    " WHERE (`COUNTRY` LIKE :COUNTRY ESCAPE '=')",
    $countryWhere,
    'Country drill-down filters the COUNTRY column'
);

[$unknownWhere] = $buildWhereClause->invoke(
    $repository, ['NOTACOLUMN' => 'x'], 'AND', false, null
);
assertSameValue(
    '',
    $unknownWhere,
    'Unknown columns are still ignored by the filter builder'
);

[$directorOrder] = $buildOrderByClause->invoke(
    $repository, [], 'DIRECTOR', 'ASC', false, null
);
assertSameValue(
    '`NUM` ASC',
    $directorOrder,
    'Filter-only columns are not sortable and fall back to NUM order'
);

if ($failures > 0) {
    echo "\n{$failures} test(s) failed.\n";
    exit(1);
}

echo "\nAll PHP regression tests passed.\n";
