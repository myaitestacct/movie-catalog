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
$parseTitleFilter->setAccessible(true);

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
$buildLikePattern->setAccessible(true);

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

$statsReflection = new ReflectionClass(StatsController::class);
$statsController = $statsReflection->newInstanceWithoutConstructor();
$calculateHealthScore = $statsReflection->getMethod('calculateHealthScore');
$calculateHealthScore->setAccessible(true);
$buildReleaseYearAnalytics = $statsReflection->getMethod(
    'buildReleaseYearAnalytics'
);
$buildReleaseYearAnalytics->setAccessible(true);
$buildGenreAnalytics = $statsReflection->getMethod('buildGenreAnalytics');
$buildGenreAnalytics->setAccessible(true);

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

if ($failures > 0) {
    echo "\n{$failures} test(s) failed.\n";
    exit(1);
}

echo "\nAll PHP regression tests passed.\n";
