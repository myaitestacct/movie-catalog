<?php

class StatsController
{
    private const LIBRARY_ISSUE_QUERIES = [
        'missing-files' => 'missing_files_rows',
        'missing-posters' => 'missing_posters_rows',
        'incomplete-metadata' => 'incomplete_metadata_rows'
    ];

    private PDO $pdo;
    private array $sql;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->sql = json_decode(
            file_get_contents(__DIR__ . '/../config/sql.json'),
            true
        );
    }

    public function getStats(): array
    {
        $stmt = $this->pdo->query($this->sql['stats']);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $stats['total_movies'] = (int)($stats['total_movies'] ?? 0);
        $stats['years'] = (int)($stats['years'] ?? 0);
        $stats['total_size'] = (float)($stats['total_size'] ?? 0);
        $stats['average_rating'] = (float)($stats['average_rating'] ?? 0);
        $stats['average_runtime'] = (int)($stats['average_runtime'] ?? 0);
        $stats['oldest_year'] = (int)($stats['oldest_year'] ?? 0);
        $stats['newest_year'] = (int)($stats['newest_year'] ?? 0);

        $genreAnalytics = $this->getGenreAnalytics($stats['total_movies']);
        $stats['genres'] = count($genreAnalytics['genres']);
        $stats['genre_analytics'] = $genreAnalytics;
        $stats['languages'] = $this->getUniqueDelimitedValueCount('languages');
        $stats['countries'] = $this->getUniqueDelimitedValueCount('countries');
        $stats['release_year_analytics'] = $this->getReleaseYearAnalytics(
            $stats['total_movies']
        );
        $stats['rating_runtime_analytics'] = $this->getRatingRuntimeAnalytics(
            $stats['total_movies']
        );

        $stmt = $this->pdo->query($this->sql['health']);
        $health = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        $stats['missing_files'] = (int)($health['missing_files'] ?? 0);
        $stats['needs_better_copy_count'] =
            (int)($health['needs_better_copy_count'] ?? 0);
        $stats['missing_posters'] = (int)($health['missing_posters'] ?? 0);
        $stats['incomplete_metadata'] = (int)($health['incomplete_metadata'] ?? 0);

        // Use the same filters as the duplicate detail query without loading
        // every duplicate row into memory for this summary response.
        $stmt = $this->pdo->query($this->sql['duplicate_count']);
        $stats['duplicate_count'] = (int)$stmt->fetchColumn();
        $stats['health_score'] = $this->calculateHealthScore($stats);

        return $stats;
    }

    private function getReleaseYearAnalytics(int $totalMovies): array
    {
        $query = $this->sql['release_years'] ??
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
            error_log('Release-year analytics failed: ' . (string)$error);

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

            if ($peakYear === null || $count > $peakYear['count']) {
                $peakYear = $yearEntry;
            }

            $decadeStart = intdiv($year, 10) * 10;
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

            if ($busiestDecade === null || $count > $busiestDecade['count']) {
                $busiestDecade = $entry;
            }
        }

        return [
            'dated_movies' => $datedMovies,
            'undated_movies' => max(0, $totalMovies - $datedMovies),
            'peak_year' => $peakYear,
            'busiest_decade' => $busiestDecade,
            'years' => $years,
            'decades' => $decades
        ];
    }

    private function getRatingRuntimeAnalytics(int $totalMovies): array
    {
        $query = $this->sql['rating_runtime_values'] ??
            'SELECT `RATING`, `LENGTH` FROM movies;';

        try {
            $stmt = $this->pdo->query($query);
            return $this->buildRatingRuntimeAnalytics(
                $stmt->fetchAll(PDO::FETCH_ASSOC),
                $totalMovies
            );
        } catch (Throwable $error) {
            error_log('Rating/runtime analytics failed: ' . (string)$error);
            return $this->buildRatingRuntimeAnalytics([], $totalMovies);
        }
    }

    private function buildRatingRuntimeAnalytics(
        array $rows,
        int $totalMovies
    ): array {
        $ratingBands = [
            ['key' => 'under-5', 'label' => 'Under 5', 'count' => 0],
            ['key' => '5-range', 'label' => '5–5.9', 'count' => 0],
            ['key' => '6-range', 'label' => '6–6.9', 'count' => 0],
            ['key' => '7-range', 'label' => '7–7.9', 'count' => 0],
            ['key' => '8-plus', 'label' => '8+', 'count' => 0]
        ];
        $runtimeBands = [
            ['key' => 'short', 'label' => 'Under 90 min', 'count' => 0],
            ['key' => 'standard', 'label' => '90–119 min', 'count' => 0],
            ['key' => 'long', 'label' => '120–149 min', 'count' => 0],
            ['key' => 'epic', 'label' => '150+ min', 'count' => 0]
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
            'unrated_movies' => max(0, $totalMovies - $ratedMovies),
            'runtime_known_movies' => $runtimeKnownMovies,
            'runtime_missing_movies' => max(
                0,
                $totalMovies - $runtimeKnownMovies
            ),
            'top_rating_band' => $this->findLargestBand($ratingBands),
            'common_runtime_band' => $this->findLargestBand($runtimeBands),
            'rating_bands' => $ratingBands,
            'runtime_bands' => $runtimeBands
        ];
    }

    private function findLargestBand(array $bands): ?array
    {
        $largest = null;

        foreach ($bands as $band) {
            if (
                $band['count'] > 0 &&
                ($largest === null || $band['count'] > $largest['count'])
            ) {
                $largest = $band;
            }
        }

        return $largest;
    }

    private function getGenreAnalytics(int $totalMovies): array
    {
        $stmt = $this->pdo->query($this->sql['categories']);
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
            $movieGenres = $this->splitDelimitedValues((string)$valueList);

            if ($movieGenres === []) {
                continue;
            }

            $taggedMovies++;
            $genreAssignments += count($movieGenres);

            foreach ($movieGenres as $key => $label) {
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
        usort($genres, static function (array $left, array $right): int {
            $countComparison = $right['count'] <=> $left['count'];
            return $countComparison !== 0
                ? $countComparison
                : strcasecmp($left['label'], $right['label']);
        });

        return [
            'tagged_movies' => $taggedMovies,
            'untagged_movies' => max(0, $totalMovies - $taggedMovies),
            'genre_assignments' => $genreAssignments,
            'top_genre' => $genres[0] ?? null,
            'genres' => $genres
        ];
    }

    private function splitDelimitedValues(string $valueList): array
    {
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
            $values[$key] = $values[$key] ?? $label;
        }

        return $values;
    }

    private function getUniqueDelimitedValueCount(string $queryKey): int
    {
        $stmt = $this->pdo->query($this->sql[$queryKey]);
        $values = [];

        while (($valueList = $stmt->fetchColumn()) !== false) {
            foreach ($this->splitDelimitedValues((string)$valueList) as $key => $label) {
                $values[$key] = $label;
            }
        }

        return count($values);
    }

    private function calculateHealthScore(array $stats): int
    {
        $totalMovies = max(0, (int)($stats['total_movies'] ?? 0));

        if ($totalMovies === 0) {
            return 100;
        }

        $issueCount =
            (int)($stats['missing_files'] ?? 0) +
            (int)($stats['needs_better_copy_count'] ?? 0) +
            (int)($stats['duplicate_count'] ?? 0) +
            (int)($stats['missing_posters'] ?? 0) +
            (int)($stats['incomplete_metadata'] ?? 0);
        $possibleIssues = $totalMovies * 5;
        $issueRatio = min(1, $issueCount / $possibleIssues);

        return (int)round((1 - $issueRatio) * 100);
    }

    public function getLibraryIssueRows(string $issueType): array
    {
        $queryKey = self::LIBRARY_ISSUE_QUERIES[$issueType] ?? null;

        if ($queryKey === null) {
            throw new InvalidArgumentException('Unsupported library issue type');
        }

        $stmt = $this->pdo->query($this->sql[$queryKey]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getDuplicateRows(): array
    {
        $stmt = $this->pdo->query($this->sql['duplicate_rows']);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getBetterCopyRows(): array
    {
        $stmt = $this->pdo->query($this->sql['needs_better_copy_val']);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
