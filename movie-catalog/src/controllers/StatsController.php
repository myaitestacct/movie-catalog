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

        // Missing files
        $stmt = $this->pdo->query($this->sql['missing_files']);
        $stats['missing_files'] = (int)$stmt->fetchColumn();

        // Needs better copy
        $stmt = $this->pdo->query($this->sql['needs_better_copy_count']);
        $stats['needs_better_copy_count'] = (int)$stmt->fetchColumn();

        // Duplicate count
        $stmt = $this->pdo->query($this->sql['duplicate_count']);
        $stats['duplicate_count'] = (int)$stmt->fetchColumn();

        return $stats;
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
