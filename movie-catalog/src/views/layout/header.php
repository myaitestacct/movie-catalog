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
<header class="app-header">
    <div class="app-brand">
        <span class="app-brand-mark" aria-hidden="true">
            <i class="fa-solid fa-clapperboard"></i>
        </span>
        <div class="app-brand-text">
            <h1>Movie Catalog</h1>
            <p class="app-tagline">Library browser</p>
        </div>
    </div>

    <div class="app-summary" role="status" aria-label="Library summary">
        <span class="app-summary-chip" id="summary-movies-chip">
            <i class="fa-solid fa-film" aria-hidden="true"></i>
            <b id="summary-movies">&ndash;</b>
            <small>titles</small>
        </span>
        <span class="app-summary-chip" id="summary-size-chip" hidden>
            <i class="fa-solid fa-database" aria-hidden="true"></i>
            <b id="summary-size">&ndash;</b>
            <small>stored</small>
        </span>
        <span class="app-summary-chip" id="summary-health-chip" hidden>
            <i class="fa-solid fa-heart-pulse" aria-hidden="true"></i>
            <b id="summary-health">&ndash;</b>
            <small>health</small>
        </span>
    </div>

    <div class="app-header-actions">
        <button
            type="button"
            id="theme-toggle"
            aria-pressed="false"
            aria-label="Switch to dark theme"
            title="Switch to dark theme"
        >
            <i class="fa-solid fa-moon" aria-hidden="true"></i>
        </button>
    </div>
</header>
