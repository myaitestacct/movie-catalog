# Movie Catalog

A read-only PHP/MySQL movie-library browser with a vanilla JavaScript table,
movie-detail dialogs, and collection-wide analytics. It does not import, edit,
stream, or delete movies. The real application reads an existing `movies` table;
a synthetic, database-free demo and a small development schema are also included.

Run the commands below from the **repository root** (the directory containing
`package.json`, not the nested `movie-catalog/` directory).

## 1. Install the tooling

Requirements:

- Node.js **20+** (22 LTS recommended) and npm.
- For the real application: PHP **8.3+**, with `PDO` and `pdo_mysql`; `mbstring`
  is recommended for Unicode metadata normalization.
- For the real application: MySQL **8+** or MariaDB **10.6+** and its command-line
  client. SQLite is not a substitute: the repository uses MySQL SQL functions.
- For browser tests: Chromium, installed through Playwright as described below.

```sh
node --version
npm ci
```

`npm ci` installs the versions in `package-lock.json`. After intentionally
changing dependencies, regenerate and commit the lockfile with `npm install`.
Do not commit `node_modules/`, generated bundles, credentials, or movie exports.
There are no Composer dependencies.

## 2. Quick UI demo (no PHP or database required)

```sh
npm run dev:demo
```

Open **http://localhost:4173**. This serves the real frontend and view markup with
55 deterministic fixture movies and mock JSON endpoints. It is for UI development
only: it does **not** execute the PHP APIs, validate SQL, or access your library.
Posters are placeholder images and the analytics are fixed example values.

`HOST` and `PORT` can override the address, for example:

```sh
HOST=0.0.0.0 PORT=4174 npm run dev:demo
```

Without built bundles, JavaScript and CSS are served directly from source. If you
have run a build, use `npm run build:watch` in another terminal while editing;
then reload the page. Restart the demo after changing PHP view markup.

## 3. Set up the real PHP/MySQL application

Check PHP first:

```sh
php --version
php -r 'var_export(PDO::getAvailableDrivers());'
```

The driver list must include `mysql`. For example, Ubuntu 24.04 provides the
required extensions with `php8.3-cli php8.3-mysql php8.3-mbstring`. On other
platforms install equivalent packages and enable them in the CLI's `php.ini`.

### Option A: create a disposable development catalog

Use this only for a **new local database**, never as a migration for your real
collection. The following password is an example for local development, not a
production credential. Use an administrative database account to run:

```sh
mysql -u root -p
```

```sql
CREATE DATABASE movie_catalog_dev
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'movie_catalog_dev'@'127.0.0.1' IDENTIFIED BY 'local-development-only';
GRANT SELECT ON movie_catalog_dev.* TO 'movie_catalog_dev'@'127.0.0.1';
EXIT;
```

Then load the reference schema and fictional fixtures with the administrative
account, not the read-only application account:

```sh
mysql -u root -p movie_catalog_dev < dev/schema.sql
mysql -u root -p movie_catalog_dev < dev/seed.sql
```

`schema.sql` intentionally fails if `movies` already exists. `seed.sql` is a
one-time insert, not an idempotent import. Neither file drops existing data.
On systems using socket-based root authentication, use your database's normal
administrative client command instead of `mysql -u root -p`.

### Option B: use an existing catalog

Skip both SQL files. Use a development copy of your database and a user with
`SELECT` access. [`dev/schema.sql`](dev/schema.sql) documents the columns the
application expects; it is not a production migration or an authoritative copy
of an existing catalog's schema.

Important data conventions:

- `NUM` is the unique numeric movie identifier.
- `FILEPATH` contains a Windows/Unix full path, a bare filename, or `MISSING`.
  `FILE` and `PATH` are derived response fields, not database columns.
- `FILESIZE` is stored in **MiB**, not bytes; analytics multiply by 1,048,576.
- Genres, languages, countries, and credits may contain comma-, semicolon-,
  pipe-, or slash-delimited lists.
- Health checks use stored metadata; they do not check that files exist on disk.
- Duplicate detection uses matching IMDb URLs, with the existing exclusions for
  catalog numbers `6717` and `6718` in `src/config/sql.json`.

### Configure the connection

Copy the ignored local configuration file:

```sh
cp movie-catalog/src/config/database.example.json movie-catalog/src/config/database.local.json
```

For Option A, replace its contents with:

```json
{
  "database": {
    "host": "127.0.0.1",
    "port": 3306,
    "dbname": "movie_catalog_dev",
    "user": "movie_catalog_dev",
    "password": "local-development-only",
    "charset": "utf8mb4"
  }
}
```

For Option B, supply your own development database values instead. Never commit
this file. Environment variables (`MOVIE_DB_HOST`, `MOVIE_DB_PORT`,
`MOVIE_DB_NAME`, `MOVIE_DB_USER`, `MOVIE_DB_PASSWORD`, `MOVIE_DB_CHARSET`) override
JSON settings. `MOVIE_DB_CONFIG` can point to a JSON file outside the project.
**`.env` files are not automatically loaded.** See the
[database configuration reference](movie-catalog/src/config/README.md).

### Start development

```sh
mkdir -p movie-catalog/var/cache
npm run dev
```

Open **http://localhost:8080**. This command builds JS/CSS, watches both, and
starts PHP with `movie-catalog/public` as the document root. Reload the browser
after edits; automatic browser reload is not included. Ctrl+C stops both PHP
and the watchers. The PHP process needs write access to `movie-catalog/var/cache`.

The server binds to `0.0.0.0` so container/remote previews work. On a private
workstation you can restrict it to loopback with `HOST=127.0.0.1 npm run dev`.
Use `PORT=8081 npm run dev` if port 8080 is occupied. The frontend uses same-origin
API URLs, including when the app is served from a URL subdirectory.

Useful checks (substitute your port/preview URL):

```sh
curl 'http://localhost:8080/api/movies.php?limit=2'
curl 'http://localhost:8080/api/movies.php?FILEPATH=missing&fuzzy=true'
curl 'http://localhost:8080/api/stats.php'
```

With the supplied SQL fixtures, the File search returns movie numbers **1, 2,
and 8**, not the fuzzy-only `Mission.Spring.mkv` or the hidden `/missing/` folder.

### Poster files

The current poster URL convention is `/movies/antexport/<PICTURENAME>` with
fallback `/movies/antexport/movies_0000-coming_soon.jpg`. Put your exported images,
including that fallback, under `movie-catalog/public/movies/antexport/`, or map
that URL to an existing poster directory in your web server. This directory is
ignored by Git. Images are not included in the SQL fixtures; the real catalog
can load without them, but posters will be missing until you supply the files.

## Search behavior: why did `missing` match unexpected files?

Previously the File filter used the **entire stored path**, while its cell
showed only the basename. It also inherited the global fuzzy flag: `missing`
became SQL `LIKE '%m%i%s%s%i%n%g%'`. A name such as `Mission.Spring.mkv` contains
those letters in order, without containing the word `missing`. A folder could
also satisfy the search while the displayed filename had no match. Changing
the **Title** mode did not change that global flag.

The behavior is now:

| Filter | Matching |
| --- | --- |
| Title | Selected Exact, Contains, or ordered-character Fuzzy mode; a trailing `(2016)` also filters the release year |
| File | Case-insensitive, contiguous substring of the **filename only**, independent of the fuzzy flag |
| Path | Case-insensitive, contiguous substring of the **folder path only**, independent of the fuzzy flag |
| AND / OR | Combines the active column filters; OR intentionally allows a match in any one column |

File/Path treat `%`, `_`, and `=` literally, not as user-supplied SQL wildcards.
Highlighting follows the same literal matching rule, and sorting File orders
by the displayed filename. The API keeps the `FILEPATH` parameter name for
compatibility, but its search/sort semantics now match the File column.

A File search for `missing` still legitimately includes both the `MISSING`
marker and a filename such as `Missing.Pieces.mkv`. To list **only records marked
as unavailable**, use **Analytics → Library Health → Missing Files**. If other
column filters are active in OR mode, a returned row need not match File; switch
to AND or clear the other filters to require a File match.

## Build and tests

```sh
npm run build                 # One-time minified JS/CSS build with source maps
npm run build:watch           # Rebuild assets on changes; no HTTP server
npm run test:js               # Node unit/regression tests
npm run test:php              # PHP helper/query-construction tests; no database
npx playwright install chromium
npm run test:browser          # Chromium tests against the mock API
npm test                      # JS, PHP, and browser suites, in that order
```

On a fresh Linux machine, install browser system libraries as well:
`npx playwright install --with-deps chromium`. Alternatively, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a compatible existing Chromium binary.
See [tests/README.md](tests/README.md) for coverage and limitations.

The PHP layouts automatically use `public/assets/dist/bundle.js` and
`bundle.css` when present; otherwise they load source assets. Bundles are ignored
by Git and must be rebuilt during deployment. Both bundle URLs use a file-mtime
cache key in the PHP layouts.

## Deployment and troubleshooting

- Set the web document root to **`movie-catalog/public/`**, never the repository
  root. `src/.htaccess` is only Apache defense in depth.
- There is **no application authentication**. Keep the app private or protect it
  with web-server/reverse-proxy authentication; API responses expose catalog
  details and local media paths. PHP's built-in server is for development only.
- A database-configuration error usually means the ignored JSON file is absent,
  an environment variable overrides it, or the configured account cannot connect.
  Check PHP/server logs; detailed database errors are not returned to the browser.
- `could not find driver` means `pdo_mysql` is missing from the PHP runtime used
  by the server. CLI and Apache/FPM can use different PHP installations.
- Statistics are collection-wide, not filtered-table statistics. Their disk cache
  defaults to 300 seconds in `src/config/config.json`. After changing development
  data, request `/api/stats.php?refresh=true` to bypass and clear the cache.
- A missing browser binary/library is an environment/setup failure, not a failing
  UI assertion. Install Chromium and its dependencies before running Playwright.
- If source edits are not visible, check whether existing bundles are being served
  and run `npm run build:watch` or `npm run dev`, then reload the page.
