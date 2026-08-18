# Regression tests

The test suite is dependency-free and does not connect to the movie database.

## Requirements

- Node.js 20 or newer
- PHP 8.3 or newer with PDO enabled

## Run all tests

From the repository root:

```sh
npm test
```

## Run JavaScript tests

```sh
npm run test:js
```

The JavaScript suite covers:

- title/year parsing
- column-aware highlighting
- fuzzy matching
- HTML escaping
- external URL validation
- pagination ranges

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
- title/year parsing
- normal and fuzzy SQL `LIKE` patterns
- SQL wildcard escaping

The PHP suite uses reflection to test private query-building helpers without creating a database connection.
