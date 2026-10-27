<?php

declare(strict_types=1);

require_once __DIR__ . '/../helpers/MovieTable.php';

/**
 * Builds the PDO connection for the active movie source.
 *
 * The main library reads the `database` configuration block and serves the
 * `movies` table. The hidden archive view (`archive=1`, toggled with
 * Ctrl+Shift+K) reads the optional `archive_database` block and connects to
 * a separate database that holds the `paripakva` table. When no archive
 * block is configured, archive requests reuse the main connection, so
 * single-database deployments with both tables side by side keep working.
 *
 * Credentials live in the Git-ignored database.local.json (or environment
 * variables); this class never logs or exposes them.
 */
final class ConnectionFactory
{
    private const DEFAULT_CONFIG_PATH =
        __DIR__ . '/../config/database.local.json';

    public static function fromRequest(array $queryParams): PDO
    {
        return MovieTable::isArchiveRequested($queryParams)
            ? self::archive()
            : self::default();
    }

    public static function default(): PDO
    {
        $config = self::resolveBlockConfig(
            'database',
            self::mainEnvMap()
        );

        return self::connect($config);
    }

    public static function archive(): PDO
    {
        // No separate archive database configured: fall back to the main
        // connection. The table whitelist in MovieTable still redirects the
        // queries to the `paripakva` table inside that database.
        if (!self::hasArchiveConfig()) {
            return self::default();
        }

        $config = self::resolveBlockConfig(
            'archive_database',
            self::archiveEnvMap()
        );

        return self::connect($config);
    }

    /**
     * Merge one JSON configuration block with its environment overrides.
     * Environment values win when the variable is actually set.
     */
    private static function resolveBlockConfig(
        string $blockKey,
        array $envMap
    ): array {
        $raw = self::loadRawConfig();
        $block = self::extractBlock($raw, $blockKey) ?? [];

        $readEnv = static function (string $name, mixed $fallback = null): mixed {
            $value = getenv($name);

            return $value === false ? $fallback : $value;
        };

        return [
            'host' => $readEnv(
                $envMap['host'],
                $block['host'] ?? 'localhost'
            ),
            'port' => $readEnv(
                $envMap['port'],
                $block['port'] ?? 3306
            ),
            'dbname' => $readEnv(
                $envMap['name'],
                $block['dbname'] ?? null
            ),
            'user' => $readEnv(
                $envMap['user'],
                $block['user'] ?? null
            ),
            // An empty string is a valid local-development password; only
            // a missing key/null means "not configured".
            'password' => $readEnv(
                $envMap['password'],
                array_key_exists('password', $block)
                    ? $block['password']
                    : null
            ),
            'charset' => $readEnv(
                $envMap['charset'],
                $block['charset'] ?? 'utf8mb4'
            )
        ];
    }

    /**
     * Validate and normalize a merged connection block. Pure (no I/O and
     * no HTTP response) so the rules can be unit-tested directly.
     *
     * @throws InvalidArgumentException when a required value is missing
     *         or the port/charset is invalid
     */
    public static function normalizeBlock(array $db): array
    {
        $missingRequiredConfig =
            trim((string)($db['dbname'] ?? '')) === '' ||
            trim((string)($db['user'] ?? '')) === '' ||
            ($db['password'] ?? null) === null;

        $port = filter_var(
            $db['port'] ?? 3306,
            FILTER_VALIDATE_INT,
            ['options' => ['min_range' => 1, 'max_range' => 65535]]
        );

        $charset = (string)($db['charset'] ?? 'utf8mb4');
        $validCharset =
            preg_match('/^[a-zA-Z0-9_]+$/', $charset) === 1;

        if (
            $missingRequiredConfig ||
            $port === false ||
            !$validCharset
        ) {
            throw new InvalidArgumentException(
                'Database configuration is missing or invalid'
            );
        }

        return [
            'host' => (string)($db['host'] ?? 'localhost'),
            'port' => (int)$port,
            'dbname' => (string)$db['dbname'],
            'user' => (string)$db['user'],
            'password' => (string)$db['password'],
            'charset' => $charset
        ];
    }

    private static function connect(array $db): PDO
    {
        header('Content-Type: application/json');

        try {
            $db = self::normalizeBlock($db);
        } catch (InvalidArgumentException $error) {
            self::fail($error->getMessage());
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $db['host'],
            $db['port'],
            $db['dbname'],
            $db['charset']
        );

        try {
            return new PDO(
                $dsn,
                $db['user'],
                $db['password'],
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $error) {
            error_log(
                'Movie Catalog database connection failed: ' .
                $error->getMessage()
            );
            self::fail('Database connection failed');
        }
    }

    private static function hasArchiveConfig(): bool
    {
        $raw = self::loadRawConfig();

        return is_array($raw['archive_database'] ?? null) ||
            getenv('MOVIE_ARCHIVE_DB_NAME') !== false;
    }

    private static function extractBlock(
        array $raw,
        string $blockKey
    ): ?array {
        // The main block supports the legacy flat format, where the whole
        // file is one connection object without a `database` wrapper.
        $block = $blockKey === 'database'
            ? ($raw['database'] ?? $raw)
            : ($raw[$blockKey] ?? null);

        return is_array($block) ? $block : null;
    }

    private static function loadRawConfig(): array
    {
        $configPathFromEnv = getenv('MOVIE_DB_CONFIG');
        $configPath =
            $configPathFromEnv !== false &&
            trim($configPathFromEnv) !== ''
                ? $configPathFromEnv
                : self::DEFAULT_CONFIG_PATH;

        if (!is_file($configPath)) {
            return [];
        }

        $decodedConfig = json_decode(
            file_get_contents($configPath),
            true
        );

        if (!is_array($decodedConfig)) {
            error_log(
                'Movie Catalog database configuration is invalid JSON.'
            );
            self::fail('Database configuration is invalid');
        }

        return $decodedConfig;
    }

    private static function mainEnvMap(): array
    {
        return [
            'host' => 'MOVIE_DB_HOST',
            'port' => 'MOVIE_DB_PORT',
            'name' => 'MOVIE_DB_NAME',
            'user' => 'MOVIE_DB_USER',
            'password' => 'MOVIE_DB_PASSWORD',
            'charset' => 'MOVIE_DB_CHARSET'
        ];
    }

    private static function archiveEnvMap(): array
    {
        return [
            'host' => 'MOVIE_ARCHIVE_DB_HOST',
            'port' => 'MOVIE_ARCHIVE_DB_PORT',
            'name' => 'MOVIE_ARCHIVE_DB_NAME',
            'user' => 'MOVIE_ARCHIVE_DB_USER',
            'password' => 'MOVIE_ARCHIVE_DB_PASSWORD',
            'charset' => 'MOVIE_ARCHIVE_DB_CHARSET'
        ];
    }

    private static function fail(string $message): never
    {
        error_log('Movie Catalog ' . lcfirst($message) . '.');
        http_response_code(500);
        echo json_encode(['error' => $message]);
        exit;
    }
}
