<?php

declare(strict_types=1);

$root = dirname(__DIR__, 2);

require_once $root . '/movie-catalog/src/helpers/FileHelper.php';
require_once $root . '/movie-catalog/src/helpers/Pagination.php';
require_once $root . '/movie-catalog/src/repositories/MovieRepository.php';

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

if ($failures > 0) {
    echo "\n{$failures} test(s) failed.\n";
    exit(1);
}

echo "\nAll PHP regression tests passed.\n";
