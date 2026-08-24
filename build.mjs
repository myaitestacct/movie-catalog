#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'movie-catalog/public');
const jsEntry = path.join(publicDir, 'assets/js/app.js');
const cssEntry = path.join(publicDir, 'assets/css/bundle-entry.css');
const outDir = path.join(publicDir, 'assets/dist');

mkdirSync(outDir, { recursive: true });

console.log('Building JS bundle...');
await build({
  entryPoints: [jsEntry],
  bundle: true,
  minify: true,
  sourcemap: true,
  format: 'esm',
  target: ['es2020'],
  outfile: path.join(outDir, 'bundle.js'),
  logLevel: 'info',
  metafile: false,
});

console.log('Building CSS bundle...');
await build({
  entryPoints: [cssEntry],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: path.join(outDir, 'bundle.css'),
  logLevel: 'info',
});

console.log(`\nBundles written to ${outDir}`);
console.log(' - bundle.js');
console.log(' - bundle.css');
console.log('\nUpdate header.php/footer.php will auto-use dist files when present.');
