<?php
// Use bundled JS if available (production), otherwise load ES modules individually (dev)
$publicRoot = dirname(__DIR__, 3) . '/public';
$bundleJs = $publicRoot . '/assets/dist/bundle.js';
$hasBundleJs = is_file($bundleJs);
$appJs = $publicRoot . '/assets/js/app.js';

// Source mode serves app.js as an ES module that imports the rest of the
// app; only app.js itself appears in this markup. Key its version on the
// newest file anywhere under assets/js so an edited submodule (stats.js,
// table.js, ...) cannot keep being served from the browser's module cache.
$sourceJsVersion = 0;
if (!$hasBundleJs && is_dir($publicRoot . '/assets/js')) {
    try {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(
                $publicRoot . '/assets/js',
                FilesystemIterator::SKIP_DOTS
            )
        );

        foreach ($files as $file) {
            if ($file->isFile()) {
                $sourceJsVersion = max($sourceJsVersion, $file->getMTime());
            }
        }
    } catch (Throwable $e) {
        $sourceJsVersion = 0;
    }
}

if ($sourceJsVersion === 0 && is_file($appJs)) {
    $sourceJsVersion = filemtime($appJs);
}
?>
<?php if ($hasBundleJs): ?>
<script type="module" src="assets/dist/bundle.js?v=<?= filemtime($bundleJs) ?>"></script>
<?php else: ?>
<script type="module" src="assets/js/app.js<?= $sourceJsVersion ? '?v=' . $sourceJsVersion : '' ?>"></script>
<?php endif; ?>
</body>
</html>
