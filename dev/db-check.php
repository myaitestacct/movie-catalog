<?php

declare(strict_types=1);

/**
 * Command-only database connectivity diagnostic.
 *
 * Run from the repository root:
 *
 *     php dev/db-check.php
 *
 * It resolves the same configuration the API uses (database.local.json plus
 * MOVIE_DB_* / MOVIE_ARCHIVE_DB_* environment variables), masks every
 * password, attempts the PDO connections, and prints the exact SQLSTATE with
 * a remediation hint. The script never outputs credentials and refuses to run
 * over HTTP.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This diagnostic is a command-line script only.\n");
}

$root = dirname(__DIR__);

require_once $root . '/src/helpers/MovieTable.php';
require_once $root . '/src/db/ConnectionFactory.php';

function out(string $message = ''): void
{
    echo $message . "\n";
}

function maskPassword(?string $password): string
{
    if ($password === null) {
        return '(not set)';
    }

    if ($password === '') {
        return '(empty)';
    }

    return str_repeat('*', max(4, strlen($password)));
}

function printBlock(string $label, ?array $block): void
{
    out("--- {$label} ---");

    if ($block === null) {
        out("  not configured (archive requests would reuse the main connection)");
        out();
        return;
    }

    out("  host:     {$block['host']}");
    out("  port:     {$block['port']}");
    out("  dbname:   {$block['dbname']}");
    out("  user:     {$block['user']}");
    out('  password: ' . maskPassword($block['password']));
    out("  charset:  {$block['charset']}");
    out();
}

function remediationHint(string $message): string
{
    if (stripos($message, 'could not find driver') !== false) {
        return '  -> The pdo_mysql PHP extension is missing. Enable it in php.ini and restart PHP.';
    }

    if (preg_match('/\[(\d+)\]/', $message, $matches)) {
        return match ($matches[1]) {
            '2002' => '  -> MySQL is not reachable on that host/port. Start the server or fix the socket/port.',
            '1045' => '  -> Access denied. Verify the user/password and its grants for this host.',
            '1049' => '  -> Unknown database. Create it (CREATE DATABASE) or correct the dbname.',
            '1044' => '  -> The user lacks privileges on that database.',
            '2006' => '  -> The server closed the connection (check connectivity and max_allowed_packet).',
            default => ''
        };
    }

    return '';
}

function tryConnection(string $label, ?array $block): int
{
    if ($block === null) {
        out("[{$label}] skipped: no archive database configured");
        out();
        return 0;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $block['host'],
        $block['port'],
        $block['dbname'],
        $block['charset']
    );

    out("[{$label}] DSN: {$dsn}");

    try {
        new PDO(
            $dsn,
            $block['user'],
            $block['password'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );

        out("[{$label}] OK: connection succeeded");
        out();
        return 0;
    } catch (Throwable $error) {
        out("[{$label}] FAILED: " . $error->getMessage());

        $hint = remediationHint($error->getMessage());

        if ($hint !== '') {
            out($hint);
        }

        out();
        return 1;
    }
}

out('Movie Catalog database diagnostic');
out('PHP ' . PHP_VERSION . ' | pdo_mysql loaded: ' .
    (extension_loaded('pdo_mysql') ? 'yes' : 'NO'));

$configPath = ConnectionFactory::activeConfigPath();
out('Config path: ' . $configPath);
out('Config file exists: ' . (is_file($configPath) ? 'yes' : 'NO'));

foreach (
    [
        'MOVIE_DB_CONFIG',
        'MOVIE_DB_HOST',
        'MOVIE_DB_NAME',
        'MOVIE_DB_USER',
        'MOVIE_ARCHIVE_DB_HOST',
        'MOVIE_ARCHIVE_DB_NAME',
        'MOVIE_ARCHIVE_DB_USER'
    ] as $variable
) {
    $value = getenv($variable);
    out("env {$variable}: " . ($value === false ? '(not set)' : $value));
}

out();

try {
    $mainBlock = ConnectionFactory::resolvedDefaultBlock();
} catch (Throwable $error) {
    out('Main connection block is invalid: ' . $error->getMessage());
    out('Create src/config/database.local.json from database.example.json, ' .
        'or set the MOVIE_DB_* environment variables.');
    exit(1);
}

try {
    $archiveBlock = ConnectionFactory::resolvedArchiveBlock();
} catch (Throwable $error) {
    out('Archive connection block is invalid: ' . $error->getMessage());
    out();
    $archiveBlock = null;
}

printBlock('main database (the "database" block)', $mainBlock);
printBlock('archive database (the "archive_database" block)', $archiveBlock);

$failures = 0;
$failures += tryConnection('main', $mainBlock);
$failures += tryConnection('archive', $archiveBlock);

if ($failures > 0) {
    out("Result: {$failures} connection(s) failed. Use the hints above and " .
        're-run this script after each change.');
    exit(1);
}

out('Result: every configured connection succeeded.');
exit(0);
