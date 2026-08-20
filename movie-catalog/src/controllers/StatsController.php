<?php

class StatsController
{
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

        $stats['genres'] = $this->getUniqueDelimitedValueCount('categories');
        $stats['languages'] = $this->getUniqueDelimitedValueCount('languages');
        $stats['countries'] = $this->getUniqueDelimitedValueCount('countries');

        $stmt = $this->pdo->query($this->sql['missing_files']);
        $stats['missing_files'] = (int)$stmt->fetchColumn();

        $stmt = $this->pdo->query($this->sql['needs_better_copy_count']);
        $stats['needs_better_copy_count'] = (int)$stmt->fetchColumn();

        // Count the exact rows exposed by the duplicates API so the card and
        // dialog can never use different duplicate criteria.
        $stmt = $this->pdo->query($this->sql['duplicate_rows']);
        $stats['duplicate_count'] = count($stmt->fetchAll(PDO::FETCH_ASSOC));

        $stmt = $this->pdo->query($this->sql['health']);
        $health = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        $stats['missing_posters'] = (int)($health['missing_posters'] ?? 0);
        $stats['incomplete_metadata'] = (int)($health['incomplete_metadata'] ?? 0);
        $stats['health_score'] = $this->calculateHealthScore($stats);

        return $stats;
    }

    private function getUniqueDelimitedValueCount(string $queryKey): int
    {
        $stmt = $this->pdo->query($this->sql[$queryKey]);
        $values = [];

        while (($valueList = $stmt->fetchColumn()) !== false) {
            $items = preg_split(
                '/\s*[,;|\/]\s*/u',
                (string)$valueList,
                -1,
                PREG_SPLIT_NO_EMPTY
            );

            foreach ($items ?: [] as $item) {
                $item = trim($item);

                if ($item === '') {
                    continue;
                }

                $key = function_exists('mb_strtolower')
                    ? mb_strtolower($item, 'UTF-8')
                    : strtolower($item);
                $values[$key] = true;
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
