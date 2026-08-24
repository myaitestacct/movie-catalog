<?php
// Use bundled JS if available (production), otherwise load ES modules individually (dev)
$publicRoot = dirname(__DIR__, 3) . '/public';
$bundleJs = $publicRoot . '/assets/dist/bundle.js';
$hasBundleJs = is_file($bundleJs);
?>
<?php if ($hasBundleJs): ?>
<script type="module" src="assets/dist/bundle.js"></script>
<?php else: ?>
<script type="module" src="assets/js/app.js"></script>
<?php endif; ?>
</body>
</html>
