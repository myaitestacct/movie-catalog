<?php
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$issueType = (string)($_GET['type'] ?? '');
$fieldKey = (string)($_GET['field'] ?? '');

$allowedIssueTypes = [
'missing-files',
'missing-posters',
'incomplete-metadata',
'metadata-field'
];

$allowedMetadataFields = [
'title',
'year',
'rating',
'runtime',
'url',
'description',
'director',
'cast',
'certification',
'languages',
'country',
'file-size',
'resolution',
'audio-format'
];

if (
!in_array($issueType, $allowedIssueTypes, true) ||
(
$issueType === 'metadata-field' &&
!in_array($fieldKey, $allowedMetadataFields, true)
)
) {
http_response_code(400);
echo json_encode([
'error' => true,
'message' => 'Unsupported library issue type'
]);
exit;
}

$root = dirname(__DIR__, 2);

try {
require_once $root . '/src/helpers/ApiResponse.php';
ApiResponse::configure();

$pdo = require $root . '/src/db/connection.php';
require_once $root . '/src/controllers/StatsController.php';

$controller = new StatsController($pdo);

$rows = $issueType === 'metadata-field'
? $controller->getMetadataIssueRows($fieldKey)
: $controller->getLibraryIssueRows($issueType);

echo json_encode($rows, JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
if (class_exists('ApiResponse')) {
ApiResponse::serverError(
'Library issue rows API failed',
$e,
'Unable to load library issue movies'
);
}

error_log('Library issue API failed before initialization: ' . (string)$e);
http_response_code(500);

echo json_encode([
'error' => true,
'message' => 'Unable to load library issue movies'
]);
}
