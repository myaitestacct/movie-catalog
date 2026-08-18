<?php

require_once __DIR__ . '/../helpers/FileHelper.php';

class MovieRepository
{
    private PDO $pdo;

    private array $sortableColumns = [
        'NUM','FORMATTEDTITLE','YEAR','LENGTH','CERTIFICATION',
        'RATING','FILESIZE','LANGUAGES','CATEGORY','RESOLUTION','AUDIOFORMAT','FILEPATH','PATH'
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
     * Split an explicitly parenthesized trailing year from a title search.
     *
     * "Alien (1979)" searches for title "Alien" and year 1979, while titles
     * such as "1917", "1984", and "2001: A Space Odyssey" remain intact.
     */
    private function parseTitleFilter(string $value): array
    {
        $value = trim($value);
        $year = null;
        $title = $value;

        if (preg_match('/\s*\(((?:19|20)\d{2})\)\s*$/', $value, $match)) {
            $year = $match[1];
            $title = trim(
                preg_replace('/\s*\((?:19|20)\d{2}\)\s*$/', '', $value)
            );
        }

        return [$title, $year];
    }

    /**
     * Escape characters that have special meaning in a SQL LIKE pattern.
     */
    private function escapeLikeValue(string $value): string
    {
        return str_replace(
            ['=', '%', '_'],
            ['==', '=%', '=_'],
            $value
        );
    }

    /**
     * Build either a normal contains pattern or an ordered-character fuzzy
     * pattern. For example, "aln" becomes "%a%l%n%" and matches "Alien".
     */
    private function buildLikePattern(string $value, bool $fuzzy): string
    {
        if (!$fuzzy) {
            return '%' . $this->escapeLikeValue($value) . '%';
        }

        $characters = preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY);

        if ($characters === false) {
            $characters = str_split($value);
        }

        $characters = array_map(
            fn(string $character): string => $this->escapeLikeValue($character),
            $characters
        );

        return '%' . implode('%', $characters) . '%';
    }

    /**
     * Build the directory portion of FILEPATH in SQL. Separators are
     * normalized only to locate the final separator; the returned path keeps
     * the original slash style stored in the database.
     */
    private function pathSqlExpression(): string
    {
        $filepath = "COALESCE(`FILEPATH`, '')";
        $normalizedPath = "REPLACE($filepath, CHAR(92), '/')";

        return "CASE
                    WHEN LOCATE('/', $normalizedPath) = 0 THEN ''
                    ELSE LEFT(
                        $filepath,
                        CHAR_LENGTH($filepath) - LOCATE('/', REVERSE($normalizedPath))
                    )
                END";
    }

    /**
     * Convert an allowlisted API sort key to its SQL expression.
     */
    private function sortSqlExpression(string $sort): string
    {
        return $sort === 'PATH'
            ? $this->pathSqlExpression()
            : "`$sort`";
    }

    /**
     * Build the canonical ORDER BY clause used by both listing and page
     * lookup. NUM is the deterministic tie-breaker for non-NUM sorts.
     */
    private function buildOrderByClause(
        array $inputFilters,
        string $sort,
        string $dir,
        bool $fuzzy
    ): array {
        if (!in_array($sort, $this->sortableColumns)) {
            $sort = 'NUM';
        }

        $dir = strtoupper($dir) === 'DESC' ? 'DESC' : 'ASC';
        $sortExpression = $this->sortSqlExpression($sort);
        $orderBy = "$sortExpression $dir";
        $params = [];

        if ($sort !== 'NUM') {
            $orderBy .= ', `NUM` ASC';
        }

        // Title searches are relevance-ranked before the selected sort.
        if (isset($inputFilters['FORMATTEDTITLE'])) {
            [$exactTitle] = $this->parseTitleFilter(
                (string)$inputFilters['FORMATTEDTITLE']
            );

            if ($exactTitle !== '') {
                if ($fuzzy) {
                    $orderBy = "CASE
                                    WHEN TRIM(`FORMATTEDTITLE`) = :exactTitle THEN 0
                                    WHEN `FORMATTEDTITLE` LIKE :containsTitle ESCAPE '=' THEN 1
                                    ELSE 2
                                END ASC, $orderBy";
                    $params['containsTitle'] = $this->buildLikePattern(
                        $exactTitle,
                        false
                    );
                } else {
                    $orderBy = "CASE
                                    WHEN TRIM(`FORMATTEDTITLE`) = :exactTitle THEN 0
                                    ELSE 1
                                END ASC, $orderBy";
                }

                $params['exactTitle'] = $exactTitle;
            }
        }

        return [$orderBy, $params];
    }

    /**
     * Build dynamic WHERE clause
     */
    private function buildWhereClause(
        array $inputFilters,
        string $searchMode = 'AND',
        bool $fuzzy = false
    ): array {
        $conditions = [];
        $params = [];
        $searchMode = strtoupper($searchMode) === 'OR' ? 'OR' : 'AND';

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

            // FORMATTEDTITLE (with optional YEAR extraction)
            if ($col === 'FORMATTEDTITLE') {
                [$title, $year] = $this->parseTitleFilter((string)$val);
                $titleConditions = [];

                if ($title !== '') {
                    $titleConditions[] = "`FORMATTEDTITLE` LIKE :title ESCAPE '='";
                    $params['title'] = $this->buildLikePattern($title, $fuzzy);
                }

                if ($year) {
                    $titleConditions[] = "`YEAR` = :year";
                    $params['year'] = (int)$year;
                }

                // A title and year entered in the same field form one filter,
                // so they stay grouped together even when search mode is OR.
                if ($titleConditions) {
                    $conditions[] = '(' . implode(' AND ', $titleConditions) . ')';
                }

                continue;
            }

            if ($col === 'PATH') {
                $conditions[] = $this->pathSqlExpression() . " LIKE :PATH ESCAPE '='";
                $params['PATH'] = $this->buildLikePattern((string)$val, $fuzzy);
                continue;
            }

            if (in_array($col, ['NUM', 'YEAR', 'LENGTH', 'FILESIZE'])) {
                $conditions[] = "`$col` = :$col";
                $params[$col] = (int)$val;
            } else {
                $conditions[] = "`$col` LIKE :$col ESCAPE '='";
                $params[$col] = $this->buildLikePattern((string)$val, $fuzzy);
            }
        }

        $whereSql = $conditions
            ? ' WHERE (' . implode(" $searchMode ", $conditions) . ')'
            : '';

        return [$whereSql, $params];
    }

    public function getMovies(
        array $inputFilters,
        string $sort,
        string $dir,
        Pagination $pagination,
        string $searchMode = 'AND',
        bool $fuzzy = false
    ): array {
        [$whereSql, $params] = $this->buildWhereClause(
            $inputFilters,
            $searchMode,
            $fuzzy
        );

        [$orderBy, $orderParams] = $this->buildOrderByClause(
            $inputFilters,
            $sort,
            $dir,
            $fuzzy
        );
        $params = array_merge($params, $orderParams);

        $sql = "
            SELECT NUM, FORMATTEDTITLE, YEAR, LENGTH, CERTIFICATION,
                   RATING, DIRECTOR, ACTORS, COUNTRY, DESCRIPTION,
                   FILESIZE, LANGUAGES, CATEGORY, RESOLUTION,
                   AUDIOFORMAT, FILEPATH, SUBTITLES, URL, PICTURENAME
            FROM movies
            $whereSql
            ORDER BY $orderBy
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

    public function countMovies(
        array $inputFilters,
        string $searchMode = 'AND',
        bool $fuzzy = false
    ): int {
        [$whereSql, $params] = $this->buildWhereClause(
            $inputFilters,
            $searchMode,
            $fuzzy
        );

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

    public function getPageForMovie(
        int $num,
        int $perPage,
        string $sort,
        string $dir,
        array $filters = [],
        string $searchMode = 'AND',
        bool $fuzzy = false
    ): ?int {
        $perPage = max(1, $perPage);

        [$whereSql, $params] = $this->buildWhereClause(
            $filters,
            $searchMode,
            $fuzzy
        );
        [$orderBy, $orderParams] = $this->buildOrderByClause(
            $filters,
            $sort,
            $dir,
            $fuzzy
        );
        $params = array_merge($params, $orderParams);

        // Use the same ordered result set as getMovies. This remains
        // compatible with MySQL versions that do not support window functions.
        $sql = "
            SELECT NUM
            FROM movies
            $whereSql
            ORDER BY $orderBy
        ";
        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $key => $val) {
            $stmt->bindValue(
                ":$key",
                $val,
                is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR
            );
        }

        $stmt->execute();
        $position = 0;

        while (($movieNum = $stmt->fetchColumn()) !== false) {
            if ((int)$movieNum === $num) {
                return intdiv($position, $perPage) + 1;
            }

            $position++;
        }

        // The movie does not exist or is excluded by the active filters.
        return null;
    }
}
