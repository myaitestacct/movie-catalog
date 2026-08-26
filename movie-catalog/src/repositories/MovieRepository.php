<?php

require_once __DIR__ . '/../helpers/FileHelper.php';

class MovieRepository
{
    private const TITLE_SEARCH_MODES = ['EXACT', 'CONTAINS', 'FUZZY'];

    private PDO $pdo;
    private ?bool $windowFunctionsSupported = null;

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
     * Detect whether the connected database supports window functions.
     * MySQL 8.0+ and MariaDB 10.2+ support ROW_NUMBER().
     */
    private function supportsWindowFunctions(): bool
    {
        if ($this->windowFunctionsSupported !== null) {
            return $this->windowFunctionsSupported;
        }

        try {
            $version = (string)$this->pdo->getAttribute(PDO::ATTR_SERVER_VERSION);

            if (stripos($version, 'MariaDB') !== false) {
                if (preg_match('/(\d+)\.(\d+)/', $version, $m)) {
                    $major = (int)$m[1];
                    $minor = (int)$m[2];
                    $this->windowFunctionsSupported =
                        ($major > 10) || ($major === 10 && $minor >= 2);
                    return $this->windowFunctionsSupported;
                }
            } else {
                if (preg_match('/(\d+)\.(\d+)/', $version, $m)) {
                    $major = (int)$m[1];
                    $this->windowFunctionsSupported = $major >= 8;
                    return $this->windowFunctionsSupported;
                }
            }

            // Fallback probe: try a trivial window-function query.
            $this->pdo->query('SELECT ROW_NUMBER() OVER (ORDER BY 1) AS rn')->fetch();
            $this->windowFunctionsSupported = true;
        } catch (Throwable $e) {
            $this->windowFunctionsSupported = false;
        }

        return $this->windowFunctionsSupported;
    }

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

    private function escapeLikeValue(string $value): string
    {
        return str_replace(
            ['=', '%', '_'],
            ['==', '=%', '=_'],
            $value
        );
    }

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

    private function normalizeTitleSearchMode(
        ?string $titleSearchMode,
        bool $fuzzy
    ): string {
        $mode = strtoupper(trim((string)$titleSearchMode));

        if (in_array($mode, self::TITLE_SEARCH_MODES, true)) {
            return $mode;
        }

        return $fuzzy ? 'FUZZY' : 'CONTAINS';
    }

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

    private function sortSqlExpression(string $sort): string
    {
        return $sort === 'PATH'
            ? $this->pathSqlExpression()
            : "`$sort`";
    }

    private function buildOrderByClause(
        array $inputFilters,
        string $sort,
        string $dir,
        bool $fuzzy,
        ?string $titleSearchMode = null
    ): array {
        $titleSearchMode = $this->normalizeTitleSearchMode(
            $titleSearchMode,
            $fuzzy
        );

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

        if (isset($inputFilters['FORMATTEDTITLE'])) {
            [$exactTitle] = $this->parseTitleFilter(
                (string)$inputFilters['FORMATTEDTITLE']
            );

            if ($exactTitle !== '') {
                if ($titleSearchMode === 'FUZZY') {
                    $orderBy = "CASE
                                    WHEN TRIM(`FORMATTEDTITLE`) = :exactTitle THEN 0
                                    WHEN `FORMATTEDTITLE` LIKE :containsTitle ESCAPE '=' THEN 1
                                    ELSE 2
                                END ASC, $orderBy";
                    $params['containsTitle'] = $this->buildLikePattern(
                        $exactTitle,
                        false
                    );
                } elseif ($titleSearchMode === 'CONTAINS') {
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

    private function buildWhereClause(
        array $inputFilters,
        string $searchMode = 'AND',
        bool $fuzzy = false,
        ?string $titleSearchMode = null
    ): array {
        $conditions = [];
        $params = [];
        $searchMode = strtoupper($searchMode) === 'OR' ? 'OR' : 'AND';
        $titleSearchMode = $this->normalizeTitleSearchMode(
            $titleSearchMode,
            $fuzzy
        );

        foreach ($inputFilters as $col => $val) {

            if ($col === 'GLOBAL') {
                $conditions[] = "MATCH(" . implode(',', $this->fulltextColumns) . ")
                                 AGAINST (:globalSearch IN BOOLEAN MODE)";
                $params['globalSearch'] = $val;
                continue;
            }

            if (!in_array($col, $this->sortableColumns)) {
                continue;
            }

            if ($col === 'FORMATTEDTITLE') {
                [$title, $year] = $this->parseTitleFilter((string)$val);
                $titleConditions = [];

                if ($title !== '') {
                    if ($titleSearchMode === 'EXACT') {
                        $titleConditions[] = "TRIM(`FORMATTEDTITLE`) = :title";
                        $params['title'] = $title;
                    } else {
                        $titleConditions[] = "`FORMATTEDTITLE` LIKE :title ESCAPE '='";
                        $params['title'] = $this->buildLikePattern(
                            $title,
                            $titleSearchMode === 'FUZZY'
                        );
                    }
                }

                if ($year) {
                    $titleConditions[] = "`YEAR` = :year";
                    $params['year'] = (int)$year;
                }

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
        bool $fuzzy = false,
        ?string $titleSearchMode = null
    ): array {
        [$whereSql, $params] = $this->buildWhereClause(
            $inputFilters,
            $searchMode,
            $fuzzy,
            $titleSearchMode
        );

        [$orderBy, $orderParams] = $this->buildOrderByClause(
            $inputFilters,
            $sort,
            $dir,
            $fuzzy,
            $titleSearchMode
        );
        $params = array_merge($params, $orderParams);

        // Deferred-join optimization for deep pagination
        $innerSql = "
            SELECT NUM
            FROM movies
            $whereSql
            ORDER BY $orderBy
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($innerSql);

        foreach ($params as $key => $val) {
            $stmt->bindValue(":$key", $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }

        $stmt->bindValue(':limit', (int)$pagination->limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int)$pagination->offset, PDO::PARAM_INT);

        $stmt->execute();
        $orderedNums = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($orderedNums)) {
            if (isset($inputFilters['GLOBAL'])) {
                return $this->fuzzyFallback($inputFilters['GLOBAL'], $pagination);
            }
            return [];
        }

        $placeholders = [];
        $inParams = [];
        foreach ($orderedNums as $i => $numVal) {
            $ph = ":id{$i}";
            $placeholders[] = $ph;
            $inParams[$ph] = $numVal;
        }

        $inClause = implode(', ', $placeholders);

        $outerSql = "
            SELECT NUM, FORMATTEDTITLE, YEAR, LENGTH, CERTIFICATION,
                   RATING, DIRECTOR, ACTORS, COUNTRY, DESCRIPTION,
                   FILESIZE, LANGUAGES, CATEGORY, RESOLUTION,
                   AUDIOFORMAT, FILEPATH, SUBTITLES, URL, PICTURENAME
            FROM movies
            WHERE NUM IN ($inClause)
        ";

        $stmt2 = $this->pdo->prepare($outerSql);
        foreach ($inParams as $ph => $val) {
            $stmt2->bindValue($ph, $val, PDO::PARAM_STR);
        }
        $stmt2->execute();
        $rows = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        $map = [];
        foreach ($rows as $row) {
            $map[(string)$row['NUM']] = $row;
        }

        $orderedRows = [];
        foreach ($orderedNums as $numVal) {
            $key = (string)$numVal;
            if (isset($map[$key])) {
                $orderedRows[] = $map[$key];
            }
        }

        foreach ($orderedRows as &$row) {
            $fp = FileHelper::splitPath($row['FILEPATH'] ?? '');
            $row['PATH'] = $fp['path'];
            $row['FILE'] = $fp['file'];
        }

        return $orderedRows;
    }

    public function countMovies(
        array $inputFilters,
        string $searchMode = 'AND',
        bool $fuzzy = false,
        ?string $titleSearchMode = null
    ): int {
        [$whereSql, $params] = $this->buildWhereClause(
            $inputFilters,
            $searchMode,
            $fuzzy,
            $titleSearchMode
        );

        $sql = "SELECT COUNT(*) FROM movies $whereSql";
        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $key => $val) {
            $stmt->bindValue(":$key", $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }

        $stmt->execute();
        return (int)$stmt->fetchColumn();
    }

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
        bool $fuzzy = false,
        ?string $titleSearchMode = null
    ): ?int {
        $perPage = max(1, $perPage);

        [$whereSql, $params] = $this->buildWhereClause(
            $filters,
            $searchMode,
            $fuzzy,
            $titleSearchMode
        );
        [$orderBy, $orderParams] = $this->buildOrderByClause(
            $filters,
            $sort,
            $dir,
            $fuzzy,
            $titleSearchMode
        );
        $params = array_merge($params, $orderParams);

        if ($this->supportsWindowFunctions()) {
            try {
                $params['targetNum'] = $num;

                $sql = "
                    SELECT ranked.rn
                    FROM (
                        SELECT NUM, ROW_NUMBER() OVER (ORDER BY $orderBy) AS rn
                        FROM movies
                        $whereSql
                    ) AS ranked
                    WHERE ranked.NUM = :targetNum
                    LIMIT 1
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
                $rn = $stmt->fetchColumn();

                if ($rn !== false) {
                    return intdiv(((int)$rn - 1), $perPage) + 1;
                }

                return null;
            } catch (Throwable $e) {
                error_log('ROW_NUMBER() page lookup failed, falling back to scan: ' . (string)$e);
                $this->windowFunctionsSupported = false;
                unset($params['targetNum']);
            }
        }

        return $this->getPageForMovieByScanning($num, $perPage, $whereSql, $orderBy, $params);
    }

    private function getPageForMovieByScanning(
        int $num,
        int $perPage,
        string $whereSql,
        string $orderBy,
        array $params
    ): ?int {
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

        return null;
    }
}
