<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Movie Catalog</title>

    <?php
    $publicRoot = dirname(__DIR__, 3) . '/public';
    $bundleCss = $publicRoot . '/assets/dist/bundle.css';
    $hasBundleCss = is_file($bundleCss);
    if ($hasBundleCss):
    ?>
    <link rel="stylesheet" href="assets/dist/bundle.css?v=<?= filemtime($bundleCss) ?>">
    <?php else: ?>
    <link rel="stylesheet" href="assets/css/variables.css">
    <link rel="stylesheet" href="assets/css/base.css">
    <link rel="stylesheet" href="assets/css/table.css">
    <link rel="stylesheet" href="assets/css/pagination.css">
    <link rel="stylesheet" href="assets/css/modal.css">
    <link rel="stylesheet" href="assets/css/responsive.css">
    <link rel="stylesheet" href="assets/css/stats.css">
    <?php endif; ?>

    <link rel="stylesheet"
          href="assets/vendor/font-awesome/css/all.min.css"
          crossorigin="anonymous" />

    <link rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E" />

    <script>
        const BASE_URL = <?= json_encode($baseUrl) ?>;
    </script>
</head>
<body>
<h1 class="sr-only">Movie Catalog</h1>
