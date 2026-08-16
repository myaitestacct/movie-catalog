<?php
header('Content-Type: application/json');
$configPath = __DIR__ . '/../config/config.json';

if (!file_exists($configPath)) {
    //header('Content-Type: application/json');
    echo json_encode(['error' => 'Config file not found']);
    exit;
}

$config = json_decode(file_get_contents($configPath), true);

if (!$config || !isset($config['database'])) {
    //header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid config file']);
    exit;
}

$db = $config['database'];

$dsn = sprintf(
    'mysql:host=%s;dbname=%s;charset=%s',
    $db['host'],
    $db['dbname'],
    $db['charset']
);

try {
    $pdo = new PDO(
        $dsn,
        $db['user'],
        $db['password'],
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false
        ]
    );
    //$pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);
    error_log("Database connection successful");
} catch (PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => 'DB connection failed']);
    exit;
}

/**
 * 🔴 THIS IS THE IMPORTANT PART
 * Without this, require() returns `1`
 */
return $pdo;
