# Regression tests

The default suite does **not** connect to a movie database. Node and PHP tests
exercise focused modules directly. Playwright loads the real frontend and view
markup against a deterministic local mock API. See the root [README](../README.md)
for installation, the database-free demo, and a real PHP/MySQL development setup.

## Requirements and install

- Node.js 20 or newer (22 LTS recommended), with npm.
- PHP 8.3 or newer with PDO enabled for the PHP helper tests.
- Chromium and its system dependencies for browser tests.

From the repository root:

```sh
npm ci
npx playwright install chromium
```

On a fresh Linux CI host, install Chromium's operating-system dependencies too:

```sh
npx playwright install --with-deps chromium
```

If a compatible Chromium binary is already installed:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm run test:browser
```

Do not replace lockfile installation with an untracked dependency upgrade to
work around missing browser binaries. Dependency resolution and browser/system
library installation are separate steps.

## Run the suites

```sh
npm test                       # JS, PHP, then browser tests; stops on failure
npm run test:js                 # Node's built-in test runner
npm run test:php                # php tests/php/run.php
npm run test:browser            # Headless Chromium
npm run test:browser:headed     # Visible browser, requires a graphical session
npm run build                  # Validate production bundles separately
```

On constrained machines use `npm run test:browser -- --workers=2`.

### JavaScript regression coverage

- API parsing, validation, cancellation signals, and safe external URLs.
- Title/year parsing, ordered-character fuzzy matching, and HTML escaping.
- Column visibility, pagination, poster fallback, and movie-modal controls.
- Movie-loader query snapshots and request freshness: late successes/failures,
  aborts, superseded animation delays, state changes during debounce, and retries.
- Explicit `true`/`false` load completion for analytics page jumps.
- Multi-column edits inside one debounce interval without losing a filter.
- Literal File/Path highlighting even when title fuzzy search is enabled.
- Dashboard animations, issue grouping, and selected analytics view models.

Movie-loader tests use deferred promises, including a transport that deliberately
ignores abort. They verify freshness independently of network cancellation.

### PHP regression coverage

- Windows, Unix, and mixed path splitting.
- Pagination bounds and offsets.
- Trailing title/year parsing and escaped SQL `LIKE` patterns.
- File filtering uses a basename expression and literal, case-insensitive
  contains matching, independent of both fuzzy flags and title modes.
- File sorting uses that basename with a stable movie-number tiebreaker.
- Path filtering, AND/OR query composition, and literal `%`, `_`, `=` characters.
- Title fuzzy search remains independent of File search.
- Analytics aggregation, health scoring, and disk-cache write/read/clear behavior.

The suite uses reflection to exercise private query-building and aggregation
helpers without constructing a database connection. It checks the **generated
SQL and parameters**, not SQL execution or database-specific collation behavior.
For a real API smoke test, follow the root README's disposable MySQL/MariaDB
setup and File-filter examples. Browser mock tests are not a substitute for this.

### Browser regression coverage

- Initial rendering, pagination, title modes, highlighting, and clearing filters.
- Multi-field debounce behavior and out-of-order response protection.
- Movie-detail content, poster paths, keyboard navigation, wrap confirmation,
  background isolation, and focus restoration.
- Analytics and issue drill-down; cross-page jumps reveal and highlight the movie.
- File filter examples: the `MISSING` marker, real substring matches, fuzzy-only
  filenames, hidden folder matches, wildcard characters, and OR semantics.
- Theme/column preferences and error/retry recovery.

`playwright.config.mjs` automatically starts
`tests/browser/support/mock-server.mjs`. It serves the current view fragments,
CSS, and JavaScript with synthetic movies, statistics, and placeholder posters.
Its movie-page fixture applies the same mock filtering/sorting as movie listing.
No PHP, credentials, or live database are needed for browser tests.

The mock server follows the PHP layout's asset selection: built bundles are used
when present, otherwise source files are used. Run browser tests on a fresh
checkout for source coverage, and again after `npm run build` for bundle coverage.
Always rebuild existing bundles after frontend edits, or run `npm run build:watch`.

Failure artifacts are written to `test-results/`; Playwright HTML reports, when
selected, use `playwright-report/`. Both directories and generated bundles are
ignored by Git.
