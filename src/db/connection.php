<?php

// Backward-compatible entry point: returns the main library PDO connection.
// Archive requests build their own connection through ConnectionFactory
// (see the API endpoints and src/db/ConnectionFactory.php).
require_once __DIR__ . '/ConnectionFactory.php';

return ConnectionFactory::default();
