# Database configuration

Database credentials are intentionally excluded from `config.json` and from Git.

## Option 1: Environment variables (recommended)

Set these variables in the PHP/Apache environment:

- `MOVIE_DB_HOST` (optional; defaults to `localhost`)
- `MOVIE_DB_PORT` (optional; defaults to `3306`)
- `MOVIE_DB_NAME` (required)
- `MOVIE_DB_USER` (required)
- `MOVIE_DB_PASSWORD` (required, but it may be explicitly empty for local development)
- `MOVIE_DB_CHARSET` (optional; defaults to `utf8mb4`)

Restart Apache after changing its environment.

## Option 2: Ignored local JSON file

Copy `database.example.json` to `database.local.json` and replace the example values:

```sh
cp database.example.json database.local.json
```

`database.local.json` is ignored by Git and must never be committed. The documented nested `{"database": {...}}` format is recommended; the loader also accepts the earlier flat format for compatibility.

## Option 3: External configuration file

Set `MOVIE_DB_CONFIG` to an absolute path to a JSON file outside the web root. The file uses the same format as `database.example.json`.

Environment variables take precedence over values from the JSON file.

## Web server

Configure the web server document root as the project's `public/` directory. The `src/.htaccess` rule is defense in depth for Apache deployments that accidentally expose the project root; it is not a substitute for the correct document root.
