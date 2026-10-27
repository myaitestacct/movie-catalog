<?php

declare(strict_types=1);

/**
 * Resolves which database table an API request reads from.
 *
 * The catalog serves the `movies` table by default. A second table holding
 * the hidden archive collection (`paripakva`) is only reachable when the
 * request carries the `archive=1` flag, which the UI toggles with the
 * Ctrl+Shift+K shortcut. Table names cannot be supplied as bound PDO
 * parameters, so every candidate is whitelisted here before it ever reaches
 * a SQL statement — user input can only select between the two known names.
 */
final class MovieTable
{
    public const DEFAULT_TABLE = 'movies';
    public const ARCHIVE_TABLE = 'paripakva';

    /**
     * Stable, UI-facing source identifiers echoed back in API responses.
     */
    private const SOURCE_NAMES = [
        self::DEFAULT_TABLE => 'movies',
        self::ARCHIVE_TABLE => 'paripakva'
    ];

    /**
     * @return list<string>
     */
    public static function allowed(): array
    {
        return [
            self::DEFAULT_TABLE,
            self::ARCHIVE_TABLE
        ];
    }

    public static function isArchiveRequested(array $queryParams): bool
    {
        return filter_var(
            $queryParams['archive'] ?? false,
            FILTER_VALIDATE_BOOLEAN
        );
    }

    public static function fromRequest(array $queryParams): string
    {
        return self::isArchiveRequested($queryParams)
            ? self::ARCHIVE_TABLE
            : self::DEFAULT_TABLE;
    }

    /**
     * Reject anything that is not one of the whitelisted table names.
     */
    public static function validate(string $table): string
    {
        if (!in_array($table, self::allowed(), true)) {
            throw new InvalidArgumentException(
                "Unsupported movie table: {$table}"
            );
        }

        return $table;
    }

    /**
     * Backtick-quote a whitelisted table name for safe identifier interpolation.
     */
    public static function quote(string $table): string
    {
        return '`' . self::validate($table) . '`';
    }

    public static function isArchive(string $table): bool
    {
        return self::validate($table) === self::ARCHIVE_TABLE;
    }

    public static function sourceName(string $table): string
    {
        return self::SOURCE_NAMES[self::validate($table)];
    }

    /**
     * Point a static SQL statement (for example one loaded from sql.json)
     * at the resolved table. Only the standalone identifier `movies` is
     * replaced, so aliases such as `movie_count` or column names containing
     * the substring are left untouched. The replacement itself comes from
     * the whitelist, never directly from request input.
     */
    public static function rewriteSql(string $sql, string $table): string
    {
        $quoted = self::quote($table);

        return preg_replace(
            '/\bmovies\b/',
            $quoted,
            $sql
        );
    }
}
