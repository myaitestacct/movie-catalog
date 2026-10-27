# Database configuration

For a complete local setup, including a disposable database schema and fixtures,
see the [repository README](../../../README.md).

Database credentials are intentionally excluded from `config.json` and from Git.

## Option 1: Environment variables (recommended)

Set these variables in the PHP/Apache environment:

- `MOVIE_DB_HOST` (optional; defaults to `localhost`)
- `MOVIE_DB_PORT` (optional; defaults to `3306`)
- `MOVIE_DB_NAME` (required)
- `MOVIE_DB_USER` (required)
- `MOVIE_DB_PASSWORD` (required, but it may be explicitly empty for local development)
- `MOVIE_DB_CHARSET` (optional; defaults to `utf8mb4`)

Restart the PHP development server or Apache/FPM after changing its environment.
The application does not load `.env` files automatically.

## Option 2: Ignored local JSON file

Copy `database.example.json` to `database.local.json` and replace the example values:

```sh
cp database.example.json database.local.json
```

`database.local.json` is ignored by Git and must never be committed. The documented nested `{"database": {...}}` format is recommended; the loader also accepts the earlier flat format for compatibility. Because the file is ignored, a fresh clone or deployment does not include it — it must be created on each environment. Run `php dev/db-check.php` to verify the file is found and that both connection blocks can actually connect.

## Optional: separate archive database

The hidden `paripakva` archive view (Ctrl+Shift+K) can connect to its own
database. Add an `archive_database` block next to `database` in
`database.local.json` using the same shape:

```json
{
  "database": {
    "host": "localhost",
    "dbname": "movies",
    "user": "root",
    "password": "",
    "charset": "utf8mb4"
  },
  "archive_database": {
    "host": "localhost",
    "dbname": "paripakva",
    "user": "root",
    "password": "",
    "charset": "utf8mb4"
  }
}
```

The `archive_database` block is optional. Without it, archive requests reuse
the main connection and read the `paripakva` table from the same database.
Equivalent environment variables use the `MOVIE_ARCHIVE_DB_` prefix:
`MOVIE_ARCHIVE_DB_HOST`, `MOVIE_ARCHIVE_DB_PORT`, `MOVIE_ARCHIVE_DB_NAME`,
`MOVIE_ARCHIVE_DB_USER`, `MOVIE_ARCHIVE_DB_PASSWORD`, and
`MOVIE_ARCHIVE_DB_CHARSET`. See `src/db/ConnectionFactory.php`.

## Option 3: External configuration file

Set `MOVIE_DB_CONFIG` to an absolute path to a JSON file outside the web root. The file uses the same format as `database.example.json`.

Environment variables take precedence over values from the JSON file.

## Web server

Configure the web server document root as the project's `public/` directory. The `src/.htaccess` rule is defense in depth for Apache deployments that accidentally expose the project root; it is not a substitute for the correct document root.
