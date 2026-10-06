import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The theme toggle is markup plus one small handler, so there is nothing to
// exercise in isolation -- but *where* it lives is a contract worth pinning:
// it sits in the sidebar header (top of the left panel), and its label comes
// from the view, not from a JS innerHTML rewrite.

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

const readSource = relativePath =>
  readFileSync(path.join(repositoryRoot, relativePath), 'utf8');

const movieView = readSource('movie-catalog/src/views/movie/movie.php');
const appSource = readSource('movie-catalog/public/assets/js/app.js');

test('the theme toggle sits inside the sidebar header', () => {
  const headerIndex = movieView.indexOf('class="sidebar-header"');
  const contentIndex = movieView.indexOf('class="sidebar-content"');
  const toggleIndex = movieView.indexOf('id="theme-toggle"');

  assert.notEqual(headerIndex, -1, 'the sidebar header must exist');
  assert.notEqual(contentIndex, -1, 'the scrollable sidebar body must exist');
  assert.notEqual(toggleIndex, -1, 'the theme toggle must exist');

  assert.ok(
    toggleIndex > headerIndex,
    'the theme toggle must be inside the sidebar header, not above it'
  );

  assert.ok(
    toggleIndex < contentIndex,
    'the theme toggle must come before the scrollable controls, i.e. stay ' +
      'pinned at the top of the panel while the body scrolls'
  );
});

test('the sidebar has exactly one theme toggle', () => {
  const first = movieView.indexOf('id="theme-toggle"');

  assert.equal(
    movieView.indexOf('id="theme-toggle"', first + 1),
    -1,
    'a second #theme-toggle would break the single-handler assumption in app.js'
  );
});

test('app.js swaps only the icon and keeps the markup label', () => {
  assert.equal(
    /themeToggle\.innerHTML/.test(appSource),
    false,
    'rewriting themeToggle.innerHTML drops the static "Theme" label and ' +
      're-inserts markup on every boot'
  );

  assert.ok(
    /themeToggle\.querySelector\(\s*'i'\s*\)/.test(appSource),
    'app.js is expected to swap the icon element it finds in the markup'
  );
});
