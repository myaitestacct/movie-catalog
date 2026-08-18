<?php

header('Content-Type: application/json');

$defaultConfigPath = __DIR__ . '/../config/database.local.json';
$configPathFromEnv = getenv('MOVIE_DB_CONFIG');
$configPath = $configPathFromEnv !== false && trim($configPathFromEnv) !== ''
    ? $configPathFromEnv
    : $defaultConfigPath;

$localConfig = [];

if (is_file($configPath)) {
    $decodedConfig = json_decode(file_get_contents($configPath), true);

    if (!is_array($decodedConfig)) {
        error_log('Movie Catalog database configuration is invalid JSON.');
        http_response_code(500);
        echo json_encode(['error' => 'Database configuration is invalid']);
        exit;
    }

    $localConfig = isset($decodedConfig['database']) && is_array($decodedConfig['database'])
        ? $decodedConfig['database']
        : $decodedConfig;
}

$readEnv = static function (string $name, mixed $fallback = null): mixed {
    $value = getenv($name);
    return $value === false ? $fallback : $value;
};

$db = [
    'host' => $readEnv('MOVIE_DB_HOST', $localConfig['host'] ?? 'localhost'),
    'port' => $readEnv('MOVIE_DB_PORT', $localConfig['port'] ?? 3306),
    'dbname' => $readEnv('MOVIE_DB_NAME', $localConfig['dbname'] ?? null),
    'user' => $readEnv('MOVIE_DB_USER', $localConfig['user'] ?? null),
    'password' => $readEnv(
        'MOVIE_DB_PASSWORD',
        array_key_exists('password', $localConfig)
            ? $localConfig['password']
            : null
    ),
    'charset' => $readEnv(
        'MOVIE_DB_CHARSET',
        $localConfig['charset'] ?? 'utf8mb4'
    )
];

$missingRequiredConfig =
    trim((string)$db['dbname']) === '' ||
    trim((string)$db['user']) === '' ||
    $db['password'] === null;

$port = filter_var(
    $db['port'],
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1, 'max_range' => 65535]]
);

$charset = (string)$db['charset'];
$validCharset = preg_match('/^[a-zA-Z0-9_]+$/', $charset) === 1;

if ($missingRequiredConfig || $port === false || !$validCharset) {
    error_log('Movie Catalog database configuration is missing or invalid.');
    http_response_code(500);
    echo json_encode(['error' => 'Database configuration is missing or invalid']);
    exit;
}

$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $db['host'],
    $port,
    $db['dbname'],
    $charset
);

try {
    $pdo = new PDO(
        $dsn,
        (string)$db['user'],
        (string)$db['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    error_log('Movie Catalog database connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

return $pdo;
