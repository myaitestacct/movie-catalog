<?php

$baseUrl = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
require_once __DIR__ . '/../src/helpers/Request.php';
require_once __DIR__ . '/../src/views/layout/header.php';
require_once __DIR__ . '/../src/views/movie/stats.php';
require_once __DIR__ . '/../src/views/movie/movie.php';
require_once __DIR__ . '/../src/views/layout/footer.php';
