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
        $stats = [];

        // Base stats
        $stmt = $this->pdo->query($this->sql['stats']);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['genres'] = $this->getUniqueGenreCount();

        // Missing files
        $stmt = $this->pdo->query($this->sql['missing_files']);
        $stats['missing_files'] = (int)$stmt->fetchColumn();

        // Needs better copy
        $stmt = $this->pdo->query($this->sql['needs_better_copy_count']);
        $stats['needs_better_copy_count'] = (int)$stmt->fetchColumn();

        // Count the exact rows exposed by the duplicates API so the card and
        // dialog can never use different duplicate criteria.
        $stmt = $this->pdo->query($this->sql['duplicate_rows']);
        $stats['duplicate_count'] = count($stmt->fetchAll(PDO::FETCH_ASSOC));

        return $stats;
    }

    private function getUniqueGenreCount(): int
    {
        $stmt = $this->pdo->query($this->sql['categories']);
        $genres = [];

        while (($categoryList = $stmt->fetchColumn()) !== false) {
            $items = preg_split(
                '/\s*[,;|\/]\s*/u',
                (string)$categoryList,
                -1,
                PREG_SPLIT_NO_EMPTY
            );

            foreach ($items ?: [] as $genre) {
                $genre = trim($genre);

                if ($genre === '') {
                    continue;
                }

                $key = function_exists('mb_strtolower')
                    ? mb_strtolower($genre, 'UTF-8')
                    : strtolower($genre);
                $genres[$key] = true;
            }
        }

        return count($genres);
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
