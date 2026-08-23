# Regression tests

The regression suite does not connect to the movie database. JavaScript and PHP tests exercise focused modules directly, while Playwright loads the real browser modules and view markup against a deterministic local mock API.

## Requirements

- Node.js 20 or newer
- PHP 8.3 or newer with PDO enabled
- Chromium for the browser suite

Install the Node.js dependency and Playwright browser once from the repository root:

```sh
npm install
npx playwright install chromium
```

On a fresh Linux CI host, Playwright can install Chromium and its operating-system dependencies together:

```sh
npx playwright install --with-deps chromium
```

## Run all tests

```sh
npm test
```

This runs the JavaScript, PHP, and browser suites in that order.

## Run JavaScript tests

```sh
npm run test:js
```

The JavaScript suite covers:

- API response parsing, validation, cancellation, and diagnostics
- safe external URLs and movie-poster behavior
- title/year parsing, column-aware highlighting, and HTML escaping
- pagination ranges and grouped issue rows
- modal numeric values and request freshness
- dashboard animations and all analytics view models
- metadata completeness normalization, ordering, and compatibility behavior

## Run PHP tests

```sh
npm run test:php
```

Or directly:

```sh
php tests/php/run.php
```

The PHP suite covers:

- Windows, Unix, and mixed file-path splitting
- pagination bounds and offsets
- title/year parsing and search query construction
- normal and fuzzy SQL `LIKE` patterns and wildcard escaping
- analytics aggregation, including independent metadata-field gaps

The PHP suite uses reflection to test private query-building and aggregation helpers without creating a database connection.

## Run browser tests

```sh
npm run test:browser
```

To watch the scenarios in a visible browser:

```sh
npm run test:browser:headed
```

If Chromium is already installed outside Playwright, point the suite to it explicitly:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm run test:browser
```

The Playwright suite covers:

- initial catalog rendering and server-backed pagination
- debounced title filtering and match highlighting
- movie-detail modal content, keyboard navigation, focus restoration, and poster paths
- analytics rendering and keyboard-accessible metadata drill-down
- theme and optional-column preference persistence
- API failure messaging and retry recovery

`playwright.config.mjs` starts `tests/browser/support/mock-server.mjs` automatically. The server composes the current PHP view fragments into a page, serves the real CSS and JavaScript from `movie-catalog/public`, and supplies deterministic API fixtures. Browser tests therefore remain repeatable and do not require PHP, credentials, or a live movie database.

Playwright writes failure artifacts under `test-results/`; HTML reports use `playwright-report/`. Both directories are ignored by Git.
