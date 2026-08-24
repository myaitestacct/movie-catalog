<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
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
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          crossorigin="anonymous" />

    <script>
        const BASE_URL = <?= json_encode($baseUrl) ?>;
    </script>
</head>
<body>
