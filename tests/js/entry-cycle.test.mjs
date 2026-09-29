import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot =
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..'
  );

const scriptRoot =
  path.join(
    repositoryRoot,
    'movie-catalog/public/assets/js'
  );

const entryPoint = path.join(scriptRoot, 'app.js');

// Static and dynamic import/export specifiers: `from 'x'`, `import 'x'`,
// `import('x')`.
const SPECIFIER = /(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]/g;

function collectModules(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) return collectModules(full);

    return entry.name.endsWith('.js') ? [full] : [];
  });
}

test('no module imports the entry point back', () => {
  // The layout serves the entry with a cache key (`app.js?v=<mtime>`) while
  // internal import specifiers stay unversioned. `app.js?v=1` and `app.js`
  // are therefore two different module records: a cycle back into the entry
  // makes the browser evaluate -- and boot -- the whole application twice.
  //
  // That is not a theoretical concern; it shipped once. The symptoms were a
  // duplicated "Hide All" toolbar button and column chips that did nothing,
  // because every addEventListener-bound control was bound twice and flipped
  // its state back on each click.
  const offenders = [];

  for (const file of collectModules(scriptRoot)) {
    if (file === entryPoint) continue;

    const source = readFileSync(file, 'utf8');

    for (const match of source.matchAll(SPECIFIER)) {
      const specifier = match[1];

      // Only relative specifiers resolve inside this tree.
      if (!specifier.startsWith('.')) continue;

      const resolved =
        path.resolve(path.dirname(file), specifier);

      if (resolved === entryPoint) {
        offenders.push(
          `${path.relative(scriptRoot, file)} imports ${specifier}`
        );
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'Modules must not import app.js (the entry point). Inject what they need ' +
    'from app.js instead -- see setMovieLoader() in stats/stats.js.\n' +
    offenders.join('\n')
  );
});

test('the entry point injects the movie loader into the stats module', () => {
  const statsSource =
    readFileSync(path.join(scriptRoot, 'stats/stats.js'), 'utf8');
  const entrySource = readFileSync(entryPoint, 'utf8');

  assert.match(
    statsSource,
    /export function setMovieLoader\(/,
    'stats.js exposes an injection point instead of importing the entry'
  );

  assert.match(
    entrySource,
    /setMovieLoader\(\s*loadMovies\s*\)/,
    'app.js registers loadMovies during boot'
  );

  assert.doesNotMatch(
    statsSource,
    /await loadMovies\(/,
    'stats.js calls the injected loader'
  );
});
