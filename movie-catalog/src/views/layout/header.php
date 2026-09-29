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
    // Source stylesheets get the same mtime cache key as the bundle. Without
    // it a browser can pair freshly rendered view markup with a stale cached
    // stylesheet — e.g. a toolbar control whose CSS rule it has never seen.
    $sourceCss = ['variables', 'base', 'table', 'pagination', 'modal', 'responsive', 'stats'];
    if ($hasBundleCss):
    ?>
    <link rel="stylesheet" href="assets/dist/bundle.css?v=<?= filemtime($bundleCss) ?>">
    <?php else: ?>
    <?php foreach ($sourceCss as $name): $file = $publicRoot . '/assets/css/' . $name . '.css'; ?>
    <link rel="stylesheet" href="assets/css/<?= $name ?>.css<?= is_file($file) ? '?v=' . filemtime($file) : '' ?>">
    <?php endforeach; ?>
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
