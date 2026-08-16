<?php

require_once __DIR__ . '/../helpers/FileHelper.php';

class MovieRepository
{
    private PDO $pdo;

    private array $sortableColumns = [
        'NUM','FORMATTEDTITLE','YEAR','LENGTH','CERTIFICATION',
        'RATING','FILESIZE','LANGUAGES','CATEGORY','RESOLUTION','AUDIOFORMAT','FILEPATH'
    ];

    private array $fulltextColumns = [
        'FORMATTEDTITLE',
        'ORIGINALTITLE',
        'TRANSLATEDTITLE',
        'DIRECTOR',
        'ACTORS',
        'CATEGORY',
        'DESCRIPTION'
    ];

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Build dynamic WHERE clause
     */
    private function buildWhereClause(array $inputFilters): array
    {
        $conditions = [];
        $params = [];

        foreach ($inputFilters as $col => $val) {

            if ($col === 'GLOBAL') {
                // FULLTEXT Search
                $conditions[] = "MATCH(" . implode(',', $this->fulltextColumns) . ")
                                 AGAINST (:globalSearch IN BOOLEAN MODE)";
                $params['globalSearch'] = $val;
                continue;
            }

            if (!in_array($col, $this->sortableColumns)) {
                continue;
            }

            // FORMATTEDTITLE (YEAR extraction logic)
            if ($col === 'FORMATTEDTITLE') {
                $val = trim($val);

                preg_match('/\b(19|20)\d{2}\b/', $val, $yearMatch);
                $year = $yearMatch[0] ?? null;

                $title = trim(preg_replace('/[\(\)]|\b(19|20)\d{2}\b/', '', $val));

                if ($title !== '') {
                    $conditions[] = "`FORMATTEDTITLE` LIKE :title";
                    $params['title'] = "%$title%";
                }

                if ($year) {
                    $conditions[] = "`YEAR` = :year";
                    $params['year'] = (int)$year;
                }

                continue;
            }

            if (in_array($col, ['NUM', 'YEAR', 'LENGTH', 'FILESIZE'])) {
                $conditions[] = "`$col` = :$col";
                $params[$col] = (int)$val;
            } else {
                $conditions[] = "`$col` LIKE :$col";
                $params[$col] = "%$val%";
            }
        }

        $whereSql = $conditions
            ? ' WHERE ' . implode(' AND ', $conditions)
            : '';

        return [$whereSql, $params];
    }

    public function getMovies(array $inputFilters, string $sort, string $dir, Pagination $pagination): array
    {
        [$whereSql, $params] = $this->buildWhereClause($inputFilters);

        if (!in_array($sort, $this->sortableColumns)) {
            $sort = 'NUM';
        }

        $dir = strtoupper($dir) === 'DESC' ? 'DESC' : 'ASC';

        $sql = "
            SELECT NUM, FORMATTEDTITLE, YEAR, LENGTH, CERTIFICATION,
                   RATING, DIRECTOR, ACTORS, COUNTRY, DESCRIPTION,
                   FILESIZE, LANGUAGES, CATEGORY, RESOLUTION,
                   AUDIOFORMAT, FILEPATH, SUBTITLES, URL, PICTURENAME
            FROM movies
            $whereSql
            ORDER BY $sort $dir
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $key => $val) {
            $stmt->bindValue(":$key", $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }

        $stmt->bindValue(':limit', (int)$pagination->limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int)$pagination->offset, PDO::PARAM_INT);

        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fuzzy fallback if FULLTEXT returns nothing
        if (isset($inputFilters['GLOBAL']) && empty($rows)) {
            return $this->fuzzyFallback($inputFilters['GLOBAL'], $pagination);
        }

        foreach ($rows as &$row) {
            $fp = FileHelper::splitPath($row['FILEPATH'] ?? '');
            $row['PATH'] = $fp['path'];
            $row['FILE'] = $fp['file'];
        }

        return $rows;
    }

    public function countMovies(array $inputFilters): int
    {
        [$whereSql, $params] = $this->buildWhereClause($inputFilters);

        $sql = "SELECT COUNT(*) FROM movies $whereSql";
        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $key => $val) {
            $stmt->bindValue(":$key", $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }

        $stmt->execute();
        return (int)$stmt->fetchColumn();
    }

    /**
     * Simple fuzzy fallback (Levenshtein-based)
     */
    private function fuzzyFallback(string $search, Pagination $pagination): array
    {
        $stmt = $this->pdo->query("
            SELECT NUM, FORMATTEDTITLE, FILEPATH
            FROM movies
            LIMIT 500
        ");

        $all = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $results = array_filter($all, function ($movie) use ($search) {
            $distance = levenshtein(
                strtolower($search),
                strtolower($movie['FORMATTEDTITLE'])
            );
            return $distance < 5;
        });

        $results = array_slice(array_values($results), $pagination->offset, $pagination->limit);

        foreach ($results as &$row) {
            $fp = FileHelper::splitPath($row['FILEPATH'] ?? '');
            $row['PATH'] = $fp['path'];
            $row['FILE'] = $fp['file'];
        }

        return $results;
    }

    public function getPageForMovie(int $num, int $perPage, string $sort, string $dir, array $filters = []): int
    {
        if (!in_array($sort, $this->sortableColumns)) {
            $sort = 'NUM';
        }

        $dir = strtoupper($dir) === 'DESC' ? 'DESC' : 'ASC';

        [$whereSql, $params] = $this->buildWhereClause($filters);

        if ($whereSql) {
            $whereSql .= " AND NUM < :num";
        } else {
            $whereSql = " WHERE NUM < :num";
        }

        $sql = "SELECT COUNT(*) FROM movies $whereSql";
        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $key => $val) {
            $stmt->bindValue(":$key", $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }

        $stmt->bindValue(':num', $num, PDO::PARAM_INT);
        $stmt->execute();

        $position = (int)$stmt->fetchColumn();
        return (int)floor($position / $perPage) + 1;
    }
}
