<?php

class StatsController
{
private const LIBRARY_ISSUE_QUERIES = [
'missing-files' => 'missing_files_rows',
'missing-posters' => 'missing_posters_rows',
'incomplete-metadata' => 'incomplete_metadata_rows'
];

private const METADATA_FIELDS = [
'title' => [
'label' => 'Title',
'column' => 'FORMATTEDTITLE',
'type' => 'text'
],
'year' => [
'label' => 'Release Year',
'column' => 'YEAR',
'type' => 'positive'
],
'rating' => [
'label' => 'Rating',
'column' => 'RATING',
'type' => 'positive'
],
'runtime' => [
'label' => 'Runtime',
'column' => 'LENGTH',
'type' => 'positive'
],
'url' => [
'label' => 'External URL',
'column' => 'URL',
'type' => 'text'
],
'description' => [
'label' => 'Description',
'column' => 'DESCRIPTION',
'type' => 'text'
],
'director' => [
'label' => 'Director',
'column' => 'DIRECTOR',
'type' => 'text'
],
'cast' => [
'label' => 'Cast',
'column' => 'ACTORS',
'type' => 'text'
],
'certification' => [
'label' => 'Certification',
'column' => 'CERTIFICATION',
'type' => 'text'
],
'languages' => [
'label' => 'Languages',
'column' => 'LANGUAGES',
'type' => 'text'
],
'country' => [
'label' => 'Country',
'column' => 'COUNTRY',
'type' => 'text'
],
'file-size' => [
'label' => 'File Size',
'column' => 'FILESIZE',
'type' => 'positive'
],
'resolution' => [
'label' => 'Resolution',
'column' => 'RESOLUTION',
'type' => 'text'
],
'audio-format' => [
'label' => 'Audio Format',
'column' => 'AUDIOFORMAT',
'type' => 'text'
]
];

private PDO $pdo;
private array $sql;
private array $config;
private string $statsCachePath;

public function __construct(PDO $pdo)
{
$this->pdo = $pdo;
$this->sql = json_decode(
file_get_contents(__DIR__ . '/../config/sql.json'),
true
);

$configPath = __DIR__ . '/../config/config.json';
$decodedConfig = json_decode(
(string)file_get_contents($configPath),
true
);

$this->config = is_array($decodedConfig)
    ? $decodedConfig
    : [];

$this->statsCachePath =
    dirname(__DIR__, 2) . '/var/cache/stats.json';
}

public function getStats(bool $useCache = true): array
{
if ($useCache && $this->isStatsCacheEnabled()) {
$cachedStats = $this->readStatsCache();

if ($cachedStats !== null) {
return $cachedStats;
}
}

$stmt = $this->pdo->query($this->sql['stats']);
$stats = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

$stats['total_movies'] = (int)($stats['total_movies'] ?? 0);
$stats['years'] = (int)($stats['years'] ?? 0);
$stats['total_size'] = (float)($stats['total_size'] ?? 0);
$stats['average_rating'] = (float)($stats['average_rating'] ?? 0);
$stats['average_runtime'] = (int)($stats['average_runtime'] ?? 0);
$stats['oldest_year'] = (int)($stats['oldest_year'] ?? 0);
$stats['newest_year'] = (int)($stats['newest_year'] ?? 0);

$genreAnalytics =
    $this->getGenreAnalytics($stats['total_movies']);

$stats['genres'] = count($genreAnalytics['genres']);
$stats['genre_analytics'] = $genreAnalytics;

$languageCountryAnalytics =
    $this->getLanguageCountryAnalytics(
        $stats['total_movies']
    );

$stats['languages'] =
    count($languageCountryAnalytics['languages']['items']);

$stats['countries'] =
    count($languageCountryAnalytics['countries']['items']);

$stats['language_country_analytics'] =
    $languageCountryAnalytics;

$stats['technical_format_analytics'] =
    $this->getTechnicalFormatAnalytics(
        $stats['total_movies']
    );

$stats['certification_analytics'] =
    $this->getConfiguredDelimitedFacet(
        'certifications',
        'CERTIFICATION',
        $stats['total_movies']
    );

$stats['director_analytics'] =
    $this->getConfiguredDelimitedFacet(
        'directors',
        'DIRECTOR',
        $stats['total_movies']
    );

$stats['cast_analytics'] =
    $this->getCastAnalytics(
        $stats['total_movies']
    );

$stats['release_year_analytics'] =
    $this->getReleaseYearAnalytics(
        $stats['total_movies']
    );

$stats['rating_runtime_analytics'] =
    $this->getRatingRuntimeAnalytics(
        $stats['total_movies']
    );

$storageAnalytics =
    $this->getStorageAnalytics(
        $stats['total_movies']
    );

$stats['total_size'] =
    $storageAnalytics['total_size'];

$stats['storage_analytics'] =
    $storageAnalytics;

$stats['metadata_completeness'] =
    $this->getMetadataCompletenessAnalytics(
        $stats['total_movies']
    );

$stmt = $this->pdo->query($this->sql['health']);
$health = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

$stats['missing_files'] =
    (int)($health['missing_files'] ?? 0);

$stats['needs_better_copy_count'] =
    (int)($health['needs_better_copy_count'] ?? 0);

$stats['missing_posters'] =
    (int)($health['missing_posters'] ?? 0);

$stats['incomplete_metadata'] =
    (int)($health['incomplete_metadata'] ?? 0);

// Use the same filters as the duplicate detail query without loading
// every duplicate row into memory for this summary response.
$stmt = $this->pdo->query($this->sql['duplicate_count']);

$stats['duplicate_count'] =
    (int)$stmt->fetchColumn();

$stats['health_score'] =
    $this->calculateHealthScore($stats);

if ($useCache && $this->isStatsCacheEnabled()) {
$this->writeStatsCache($stats);
}

return $stats;
}

public function clearStatsCache(): void
{
if (
!isset($this->statsCachePath) ||
!is_file($this->statsCachePath)
) {
return;
}

if (!@unlink($this->statsCachePath)) {
error_log('Unable to clear Movie Catalog stats cache.');
}
}

private function isStatsCacheEnabled(): bool
{
return filter_var(
$this->config['stats']['cache_enabled'] ?? false,
FILTER_VALIDATE_BOOLEAN
) && $this->getStatsCacheTtl() > 0;
}

private function getStatsCacheTtl(): int
{
return max(
0,
(int)($this->config['stats']['cache_ttl'] ?? 0)
);
}

private function readStatsCache(): ?array
{
if (
!is_file($this->statsCachePath) ||
!is_readable($this->statsCachePath)
) {
return null;
}

$modifiedAt =
    filemtime($this->statsCachePath);

$ttl =
    $this->getStatsCacheTtl();

if (
$modifiedAt === false ||
$ttl <= 0 ||
(time() - $modifiedAt) >= $ttl
) {
return null;
}

try {
$contents =
    file_get_contents(
        $this->statsCachePath
    );

if ($contents === false) {
return null;
}

$cachedStats = json_decode(
$contents,
true,
512,
JSON_THROW_ON_ERROR
);

return is_array($cachedStats)
    ? $cachedStats
    : null;
} catch (Throwable $error) {
error_log(
'Movie Catalog stats cache could not be read: ' .
(string)$error
);

return null;
}
}

private function writeStatsCache(array $stats): void
{
try {
$cacheDirectory =
    dirname($this->statsCachePath);

if (
!is_dir($cacheDirectory) &&
!@mkdir($cacheDirectory, 0775, true)
) {
error_log(
'Unable to create Movie Catalog stats cache directory.'
);

return;
}

if (!is_writable($cacheDirectory)) {
error_log(
'Movie Catalog stats cache directory is not writable.'
);

return;
}

$contents =
    json_encode(
        $stats,
        JSON_THROW_ON_ERROR
    );

$tempPath =
    @tempnam(
        $cacheDirectory,
        'stats-'
    );

if ($tempPath === false) {
error_log(
'Unable to create a temporary Movie Catalog stats cache file.'
);

return;
}

$written =
    @file_put_contents(
        $tempPath,
        $contents,
        LOCK_EX
    );

$renamed =
    $written !== false &&
    @rename(
        $tempPath,
        $this->statsCachePath
    );

if (!$renamed) {
@unlink($tempPath);

error_log(
'Unable to write Movie Catalog stats cache.'
);
}
} catch (Throwable $error) {
error_log(
'Movie Catalog stats cache could not be written: ' .
(string)$error
);
}
}

private function getReleaseYearAnalytics(
int $totalMovies
): array
{
$query =
    $this->sql['release_years'] ??
    'SELECT `YEAR` AS release_year, COUNT(*) AS movie_count ' .
    'FROM movies WHERE `YEAR` IS NOT NULL AND `YEAR` > 0 ' .
    'GROUP BY `YEAR` ORDER BY `YEAR`;';

try {
$stmt = $this->pdo->query($query);

return $this->buildReleaseYearAnalytics(
$stmt->fetchAll(PDO::FETCH_ASSOC),
$totalMovies
);
} catch (Throwable $error) {
error_log(
'Release-year analytics failed: ' .
(string)$error
);

return [
'dated_movies' => 0,
'undated_movies' => max(0, $totalMovies),
'peak_year' => null,
'busiest_decade' => null,
'years' => [],
'decades' => []
];
}
}

private function buildReleaseYearAnalytics(
array $rows,
int $totalMovies
): array {
$years = [];
$decadeCounts = [];
$datedMovies = 0;
$peakYear = null;

foreach ($rows as $row) {
$year = (int)($row['release_year'] ?? 0);
$count = (int)($row['movie_count'] ?? 0);

if ($year <= 0 || $count <= 0) {
continue;
}

$yearEntry = [
'year' => $year,
'count' => $count
];

$years[] = $yearEntry;
$datedMovies += $count;

if (
$peakYear === null ||
$count > $peakYear['count']
) {
$peakYear = $yearEntry;
}

$decadeStart =
    intdiv($year, 10) * 10;

$decadeCounts[$decadeStart] =
    ($decadeCounts[$decadeStart] ?? 0) + $count;
}

ksort($decadeCounts, SORT_NUMERIC);

$decades = [];
$busiestDecade = null;

foreach ($decadeCounts as $startYear => $count) {
$entry = [
'start_year' => (int)$startYear,
'label' => $startYear . 's',
'count' => $count
];

$decades[] = $entry;

if (
$busiestDecade === null ||
$count > $busiestDecade['count']
) {
$busiestDecade = $entry;
}
}

return [
'dated_movies' => $datedMovies,
'undated_movies' =>
    max(0, $totalMovies - $datedMovies),
'peak_year' => $peakYear,
'busiest_decade' => $busiestDecade,
'years' => $years,
'decades' => $decades
];
}

private function getRatingRuntimeAnalytics(
int $totalMovies
): array {
$query =
    $this->sql['rating_runtime_values'] ??
    'SELECT `RATING`, `LENGTH` FROM movies;';

try {
$stmt = $this->pdo->query($query);

return $this->buildRatingRuntimeAnalytics(
$stmt->fetchAll(PDO::FETCH_ASSOC),
$totalMovies
);
} catch (Throwable $error) {
error_log(
'Rating/runtime analytics failed: ' .
(string)$error
);

return $this->buildRatingRuntimeAnalytics(
[],
$totalMovies
);
}
}

private function buildRatingRuntimeAnalytics(
array $rows,
int $totalMovies
): array {
$ratingBands = [
[
'key' => 'under-5',
'label' => 'Under 5',
'count' => 0
],
[
'key' => '5-range',
'label' => '5–5.9',
'count' => 0
],
[
'key' => '6-range',
'label' => '6–6.9',
'count' => 0
],
[
'key' => '7-range',
'label' => '7–7.9',
'count' => 0
],
[
'key' => '8-plus',
'label' => '8+',
'count' => 0
]
];

$runtimeBands = [
[
'key' => 'short',
'label' => 'Under 90 min',
'count' => 0
],
[
'key' => 'standard',
'label' => '90–119 min',
'count' => 0
],
[
'key' => 'long',
'label' => '120–149 min',
'count' => 0
],
[
'key' => 'epic',
'label' => '150+ min',
'count' => 0
]
];

$ratedMovies = 0;
$runtimeKnownMovies = 0;

foreach ($rows as $row) {
$rating = (float)($row['RATING'] ?? 0);

if ($rating > 0) {
$ratedMovies++;

$ratingIndex = $rating < 5
? 0
: ($rating < 6
? 1
: ($rating < 7
? 2
: ($rating < 8 ? 3 : 4)));

$ratingBands[$ratingIndex]['count']++;
}

$runtime = (int)($row['LENGTH'] ?? 0);

if ($runtime > 0) {
$runtimeKnownMovies++;

$runtimeIndex = $runtime < 90
? 0
: ($runtime < 120
? 1
: ($runtime < 150 ? 2 : 3));

$runtimeBands[$runtimeIndex]['count']++;
}
}

return [
'rated_movies' => $ratedMovies,
'unrated_movies' =>
    max(0, $totalMovies - $ratedMovies),
'runtime_known_movies' => $runtimeKnownMovies,
'runtime_missing_movies' =>
    max(0, $totalMovies - $runtimeKnownMovies),
'top_rating_band' =>
    $this->findLargestBand($ratingBands),
'common_runtime_band' =>
    $this->findLargestBand($runtimeBands),
'rating_bands' => $ratingBands,
'runtime_bands' => $runtimeBands
];
}

private function getStorageAnalytics(
int $totalMovies
): array {
$query =
    $this->sql['storage_values'] ??
    'SELECT `NUM`, `ORIGINALTITLE`, `FORMATTEDTITLE`, `FILESIZE` ' .
    'FROM movies ORDER BY `NUM`;';

try {
$stmt = $this->pdo->query($query);

return $this->buildStorageAnalytics(
$stmt->fetchAll(PDO::FETCH_ASSOC),
$totalMovies
);
} catch (Throwable $error) {
error_log(
'Storage analytics failed: ' .
(string)$error
);

return $this->buildStorageAnalytics(
[],
$totalMovies
);
}
}

private function buildStorageAnalytics(
array $rows,
int $totalMovies
): array {
$sizeBands = [
[
'key' => 'compact',
'label' => 'Under 700 MB',
'count' => 0,
'total_size' => 0
],
[
'key' => 'standard-definition',
'label' => '700 MB–1.49 GB',
'count' => 0,
'total_size' => 0
],
[
'key' => 'high-definition',
'label' => '1.5–2.99 GB',
'count' => 0,
'total_size' => 0
],
[
'key' => 'large',
'label' => '3–5.99 GB',
'count' => 0,
'total_size' => 0
],
[
'key' => 'very-large',
'label' => '6 GB+',
'count' => 0,
'total_size' => 0
]
];

$sizes = [];
$totalSize = 0;
$largestMovie = null;

foreach ($rows as $row) {
$rawSize = $row['FILESIZE'] ?? null;

if (!is_numeric($rawSize)) {
continue;
}

$sizeMegabytes = (float)$rawSize;

if (
!is_finite($sizeMegabytes) ||
$sizeMegabytes <= 0
) {
continue;
}

$sizeBytes =
    (int)round(
        $sizeMegabytes * 1048576
    );

if ($sizeBytes <= 0) {
continue;
}

$sizes[] = $sizeBytes;
$totalSize += $sizeBytes;

$formattedTitle =
    trim((string)($row['FORMATTEDTITLE'] ?? ''));

$originalTitle =
    trim((string)($row['ORIGINALTITLE'] ?? ''));

$number =
    trim((string)($row['NUM'] ?? ''));

$title = $formattedTitle !== ''
? $formattedTitle
: ($originalTitle !== ''
? $originalTitle
: ($number !== ''
? 'Movie #' . $number
: 'Untitled movie'));

if (
$largestMovie === null ||
$sizeBytes > $largestMovie['size']
) {
$largestMovie = [
'num' => $number !== ''
    ? $number
    : null,
'title' => $title,
'size' => $sizeBytes
];
}

$bandIndex = $sizeMegabytes < 700
? 0
: ($sizeMegabytes < 1536
? 1
: ($sizeMegabytes < 3072
? 2
: ($sizeMegabytes < 6144 ? 3 : 4)));

$sizeBands[$bandIndex]['count']++;
$sizeBands[$bandIndex]['total_size'] += $sizeBytes;
}

sort($sizes, SORT_NUMERIC);

$sizedMovies = count($sizes);
$medianSize = 0;

if ($sizedMovies > 0) {
$middle = intdiv($sizedMovies, 2);

$medianSize = $sizedMovies % 2 === 1
? $sizes[$middle]
: (int)round(
    ($sizes[$middle - 1] + $sizes[$middle]) / 2
);
}

return [
'sized_movies' => $sizedMovies,
'unsized_movies' =>
    max(0, $totalMovies - $sizedMovies),
'total_size' => $totalSize,
'average_size' => $sizedMovies > 0
    ? (int)round($totalSize / $sizedMovies)
    : 0,
'median_size' => $medianSize,
'largest_movie' => $largestMovie,
'size_bands' => $sizeBands
];
}

private function findLargestBand(array $bands): ?array
{
$largest = null;

foreach ($bands as $band) {
if (
$band['count'] > 0 &&
(
$largest === null ||
$band['count'] > $largest['count']
)
) {
$largest = $band;
}
}

return $largest;
}

private function getLanguageCountryAnalytics(
int $totalMovies
): array {
return [
'languages' =>
    $this->getDelimitedValueAnalytics(
        'languages',
        $totalMovies
    ),
'countries' =>
    $this->getDelimitedValueAnalytics(
        'countries',
        $totalMovies
    )
];
}

private function getTechnicalFormatAnalytics(
int $totalMovies
): array {
return [
'resolutions' =>
    $this->getConfiguredDelimitedFacet(
        'resolutions',
        'RESOLUTION',
        $totalMovies
    ),
'audio_formats' =>
    $this->getConfiguredDelimitedFacet(
        'audio_formats',
        'AUDIOFORMAT',
        $totalMovies
    )
];
}

private function getCastAnalytics(
int $totalMovies
): array {
$query =
    $this->sql['actors'] ??
    "SELECT `ACTORS` FROM movies " .
    "WHERE `ACTORS` IS NOT NULL " .
    "AND TRIM(`ACTORS`) <> '';";

try {
$stmt = $this->pdo->query($query);

return $this->buildCastAnalytics(
$stmt->fetchAll(PDO::FETCH_COLUMN),
$totalMovies
);
} catch (Throwable $error) {
error_log(
'Cast analytics failed: ' .
(string)$error
);

return $this->buildCastAnalytics(
[],
$totalMovies
);
}
}

private function buildCastAnalytics(
array $valueLists,
int $totalMovies
): array {
$facet =
    $this->buildDelimitedValueAnalytics(
        $valueLists,
        $totalMovies
    );

$taggedMovies =
    $facet['tagged_movies'];

return [
'tagged_movies' => $taggedMovies,
'untagged_movies' =>
    $facet['untagged_movies'],
'cast_assignments' =>
    $facet['assignments'],
'unique_actors' =>
    count($facet['items']),
'average_cast_size' =>
    $taggedMovies > 0
        ? round(
            $facet['assignments'] /
            $taggedMovies,
            1
        )
        : 0.0,
'top_actor' => $facet['top_item'],

// A cast field can contain thousands of unique names.
// Keep the complete totals above while bounding the dashboard payload.
'top_actors' =>
    array_slice(
        $facet['items'],
        0,
        20
    )
];
}

private function getMetadataCompletenessAnalytics(
int $totalMovies
): array {
$columns = array_map(
static fn(array $field): string =>
    '`' . $field['column'] . '`',
self::METADATA_FIELDS
);

$query =
    $this->sql['metadata_values'] ??
    'SELECT ' .
    implode(', ', $columns) .
    ' FROM movies;';

try {
$stmt = $this->pdo->query($query);

return $this->buildMetadataCompletenessAnalytics(
$stmt->fetchAll(PDO::FETCH_ASSOC),
$totalMovies
);
} catch (Throwable $error) {
error_log(
'Metadata completeness failed: ' .
(string)$error
);

return $this->buildMetadataCompletenessAnalytics(
[],
$totalMovies
);
}
}

private function buildMetadataCompletenessAnalytics(
array $rows,
int $totalMovies
): array {
$observedMovies = count($rows);
$total = max(0, $totalMovies, $observedMovies);
$unobservedMovies =
    max(0, $total - $observedMovies);

$missingCounts = array_fill_keys(
array_keys(self::METADATA_FIELDS),
$unobservedMovies
);

$completeMovies = 0;

foreach ($rows as $row) {
$missingField = false;

foreach (
self::METADATA_FIELDS as $key => $field
) {
if (
$this->isMetadataValueMissing(
$row,
$field
)
) {
$missingCounts[$key]++;
$missingField = true;
}
}

if (!$missingField) {
$completeMovies++;
}
}

$fields = [];

foreach (
self::METADATA_FIELDS as $key => $field
) {
$missingCount = $missingCounts[$key];

$fields[] = [
'key' => $key,
'label' => $field['label'],
'missing_count' => $missingCount,
'complete_count' =>
    max(0, $total - $missingCount)
];
}

return [
'total_movies' => $total,
'complete_movies' => $completeMovies,
'incomplete_movies' =>
    max(0, $total - $completeMovies),
'fields' => $fields
];
}

private function isMetadataValueMissing(
array $row,
array $field
): bool {
$value =
    $row[$field['column']] ?? null;

if ($field['type'] === 'positive') {
return !is_numeric($value) ||
    (float)$value <= 0;
}

return trim((string)$value) === '';
}

private function metadataMissingSql(
array $field
): string {
$column =
    '`' . $field['column'] . '`';

return $field['type'] === 'positive'
? "$column IS NULL OR $column <= 0"
: "$column IS NULL OR TRIM($column) = ''";
}

private function getConfiguredDelimitedFacet(
string $queryKey,
string $column,
int $totalMovies
): array {
$query = $this->sql[$queryKey] ??
    "SELECT `$column` FROM movies " .
    "WHERE `$column` IS NOT NULL " .
    "AND TRIM(`$column`) <> '';";

try {
$stmt = $this->pdo->query($query);

return $this->buildDelimitedValueAnalytics(
$stmt->fetchAll(PDO::FETCH_COLUMN),
$totalMovies
);
} catch (Throwable $error) {
error_log(
ucfirst(
str_replace('_', ' ', $queryKey)
) .
' analytics failed: ' .
(string)$error
);

return $this->buildDelimitedValueAnalytics(
[],
$totalMovies
);
}
}

private function getDelimitedValueAnalytics(
string $queryKey,
int $totalMovies
): array {
$stmt =
    $this->pdo->query(
        $this->sql[$queryKey]
    );

return $this->buildDelimitedValueAnalytics(
$stmt->fetchAll(PDO::FETCH_COLUMN),
$totalMovies
);
}

private function buildDelimitedValueAnalytics(
array $valueLists,
int $totalMovies
): array {
$counts = [];
$taggedMovies = 0;
$assignments = 0;

foreach ($valueLists as $valueList) {
$movieValues =
    $this->splitDelimitedValues(
        (string)$valueList
    );

if ($movieValues === []) {
continue;
}

$taggedMovies++;
$assignments += count($movieValues);

foreach (
$movieValues as $key => $label
) {
if (!isset($counts[$key])) {
$counts[$key] = [
'label' => $label,
'count' => 0
];
}

$counts[$key]['count']++;
}
}

$items = array_values($counts);

usort(
$items,
static function (
array $left,
array $right
): int {
$countComparison =
    $right['count'] <=> $left['count'];

return $countComparison !== 0
? $countComparison
: strcasecmp(
    $left['label'],
    $right['label']
);
}
);

return [
'tagged_movies' => $taggedMovies,
'untagged_movies' =>
    max(0, $totalMovies - $taggedMovies),
'assignments' => $assignments,
'top_item' => $items[0] ?? null,
'items' => $items
];
}

private function getGenreAnalytics(
int $totalMovies
): array {
$stmt =
    $this->pdo->query(
        $this->sql['categories']
    );

return $this->buildGenreAnalytics(
$stmt->fetchAll(PDO::FETCH_COLUMN),
$totalMovies
);
}

private function buildGenreAnalytics(
array $valueLists,
int $totalMovies
): array {
$genreCounts = [];
$taggedMovies = 0;
$genreAssignments = 0;

foreach ($valueLists as $valueList) {
$movieGenres =
    $this->splitDelimitedValues(
        (string)$valueList
    );

if ($movieGenres === []) {
continue;
}

$taggedMovies++;
$genreAssignments += count($movieGenres);

foreach (
$movieGenres as $key => $label
) {
if (!isset($genreCounts[$key])) {
$genreCounts[$key] = [
'label' => $label,
'count' => 0
];
}

$genreCounts[$key]['count']++;
}
}

$genres = array_values($genreCounts);

usort(
$genres,
static function (
array $left,
array $right
): int {
$countComparison =
    $right['count'] <=> $left['count'];

return $countComparison !== 0
? $countComparison
: strcasecmp(
    $left['label'],
    $right['label']
);
}
);

return [
'tagged_movies' => $taggedMovies,
'untagged_movies' =>
    max(0, $totalMovies - $taggedMovies),
'genre_assignments' => $genreAssignments,
'top_genre' => $genres[0] ?? null,
'genres' => $genres
];
}

private function splitDelimitedValues(
string $valueList
): array {
$items = preg_split(
'/\s*[,;|\/]\s*/u',
$valueList,
-1,
PREG_SPLIT_NO_EMPTY
);

$values = [];

foreach ($items ?: [] as $item) {
$label = trim($item);

if ($label === '') {
continue;
}

$key = function_exists('mb_strtolower')
? mb_strtolower($label, 'UTF-8')
: strtolower($label);

$values[$key] =
    $values[$key] ?? $label;
}

return $values;
}

private function calculateHealthScore(
array $stats
): int {
$totalMovies =
    max(
        0,
        (int)($stats['total_movies'] ?? 0)
    );

if ($totalMovies === 0) {
return 100;
}

$issueCount =
    (int)($stats['missing_files'] ?? 0) +
    (int)($stats['needs_better_copy_count'] ?? 0) +
    (int)($stats['duplicate_count'] ?? 0) +
    (int)($stats['missing_posters'] ?? 0) +
    (int)($stats['incomplete_metadata'] ?? 0);

$possibleIssues =
    $totalMovies * 5;

$issueRatio =
    min(
        1,
        $issueCount / $possibleIssues
    );

return (int)round(
    (1 - $issueRatio) * 100
);
}

public function getMetadataIssueRows(
string $fieldKey
): array {
$field =
    self::METADATA_FIELDS[$fieldKey] ?? null;

if ($field === null) {
throw new InvalidArgumentException(
'Unsupported metadata field'
);
}

$condition =
    $this->metadataMissingSql($field);

$query =
    'SELECT `NUM`, `ORIGINALTITLE`, ' .
    '`FORMATTEDTITLE`, `YEAR`, `URL` ' .
    'FROM movies WHERE ' .
    $condition .
    ' ORDER BY ' .
    'COALESCE(NULLIF(TRIM(`ORIGINALTITLE`), \'\'), ' .
    '`FORMATTEDTITLE`), `YEAR`, `NUM`;';

$stmt =
    $this->pdo->query($query);

return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

public function getLibraryIssueRows(
string $issueType
): array {
$queryKey =
    self::LIBRARY_ISSUE_QUERIES[$issueType] ?? null;

if ($queryKey === null) {
throw new InvalidArgumentException(
'Unsupported library issue type'
);
}

$stmt =
    $this->pdo->query(
        $this->sql[$queryKey]
    );

return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

public function getDuplicateRows(): array
{
$stmt =
    $this->pdo->query(
        $this->sql['duplicate_rows']
    );

return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

public function getBetterCopyRows(): array
{
$stmt =
    $this->pdo->query(
        $this->sql['needs_better_copy_val']
    );

return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
}
