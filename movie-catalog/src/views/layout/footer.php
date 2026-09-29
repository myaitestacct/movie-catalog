<?php
// Use bundled JS if available (production), otherwise load ES modules individually (dev)
$publicRoot = dirname(__DIR__, 3) . '/public';
$bundleJs = $publicRoot . '/assets/dist/bundle.js';
$hasBundleJs = is_file($bundleJs);
// Same mtime cache key as the bundle: a stale cached app.js next to freshly
// rendered view markup is how a new toolbar button ends up doing nothing.
// (In source mode the imported submodules are not versioned; run
// `npm run build`/`npm run dev` for a fully cache-keyed bundle.)
$appJs = $publicRoot . '/assets/js/app.js';
?>
<?php if ($hasBundleJs): ?>
<script type="module" src="assets/dist/bundle.js?v=<?= filemtime($bundleJs) ?>"></script>
<?php else: ?>
<script type="module" src="assets/js/app.js<?= is_file($appJs) ? '?v=' . filemtime($appJs) : '' ?>"></script>
<?php endif; ?>
</body>
</html>
