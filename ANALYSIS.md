# Movie Catalog Repository Analysis

## Overview

**Repository**: `myaitestacct/movie-catalog`  
**Branch**: `arena/e20bd155-movie-catalog`  
**Analysis Date**: 2026-10-09  

This is a **read-only PHP/MySQL movie-library browser** with a vanilla JavaScript frontend. It provides a comprehensive interface for browsing, filtering, and analyzing a movie collection without the ability to import, edit, stream, or delete movies.

---

## Architecture Summary

### Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Backend** | PHP | 8.3+ | API endpoints, database queries |
| **Database** | MySQL / MariaDB | 8+ / 10.6+ | Movie catalog storage |
| **Frontend** | Vanilla JavaScript (ES Modules) | ES2020 | Table/grid rendering, filtering, analytics |
| **CSS** | Custom Properties (CSS Variables) | - | Theming, responsive design |
| **Bundler** | esbuild | 0.23.1+ | JS/CSS bundling with source maps |
| **Testing** | Playwright, Node.js, PHPUnit-style | - | Browser, JS, PHP tests |
| **Icons** | Font Awesome 6.5.0 | - | Self-hosted icon library |

### Project Structure

```
movie-catalog/
├── movie-catalog/                    # Main application directory
│   ├── public/                       # Web document root
│   │   ├── api/                      # PHP API endpoints
│   │   │   ├── movies.php            # Movie listing with filtering/sorting
│   │   │   ├── stats.php             # Collection statistics
│   │   │   ├── duplicates.php        # Duplicate detection
│   │   │   ├── better-copy.php       # Better copy detection
│   │   │   ├── library-issues.php    # Library health issues
│   │   │   └── movie-page.php        # Single movie details
│   │   ├── assets/                   # Frontend assets
│   │   │   ├── css/                  # Stylesheets (9 files)
│   │   │   │   ├── variables.css      # Design tokens & theming
│   │   │   │   ├── base.css          # Base styles & layout
│   │   │   │   ├── table.css         # Table view styles
│   │   │   │   ├── sidebar.css       # Sidebar controls
│   │   │   │   ├── stats.css         # Analytics panel
│   │   │   │   ├── modal.css         # Movie detail dialogs
│   │   │   │   ├── pagination.css    # Pagination controls
│   │   │   │   ├── responsive.css    # Responsive breakpoints
│   │   │   │   └── bundle-entry.css  # Entry point for bundler
│   │   │   ├── js/                   # JavaScript modules
│   │   │   │   ├── app.js            # Main entry point
│   │   │   │   ├── core/             # Core utilities
│   │   │   │   │   ├── api.js         # API client
│   │   │   │   │   ├── dom.js         # DOM utilities
│   │   │   │   │   ├── movie-loader.js # Movie data loading
│   │   │   │   │   ├── request.js     # HTTP requests
│   │   │   │   │   └── state.js       # Application state
│   │   │   │   ├── modal/            # Modal dialogs
│   │   │   │   ├── stats/            # Analytics modules (12 files)
│   │   │   │   ├── table/            # Table view modules
│   │   │   │   └── utils/            # Utility functions
│   │   │   └── vendor/              # Third-party libraries
│   │   │       └── font-awesome/     # Font Awesome icons
│   │   └── index.php                # Main entry point
│   └── src/                         # PHP application code
│       ├── config/                  # Configuration files
│       │   ├── config.json          # App configuration (pagination, cache)
│       │   ├── sql.json             # SQL query templates
│       │   ├── database.example.json # Database config template
│       │   └── README.md            # Config documentation
│       ├── controllers/             # PHP controllers
│       │   └── StatsController.php  # Statistics controller
│       ├── db/                      # Database layer
│       │   └── connection.php        # PDO connection factory
│       ├── helpers/                 # Helper classes
│       │   ├── ApiResponse.php      # API response utilities
│       │   ├── FileHelper.php       # File path utilities
│       │   ├── Pagination.php        # Pagination logic
│       │   └── Request.php          # Request handling
│       ├── repositories/            # Data access layer
│       │   └── MovieRepository.php  # Movie data repository
│       └── views/                   # PHP templates
│           ├── layout/              # Layout templates
│           │   ├── header.php        # HTML head
│           │   └── footer.php        # HTML footer
│           └── movie/                # Movie views
│               ├── movie.php         # Main movie table view
│               └── stats.php         # Analytics panel view
├── dev/                            # Development files
│   ├── schema.sql                  # Database schema (MySQL)
│   └── seed.sql                    # Sample data
├── tests/                          # Test suite
│   ├── README.md                   # Test documentation
│   ├── browser/                    # Playwright tests
│   │   ├── *.spec.mjs              # Browser test suites
│   │   └── support/                # Test support files
│   │       └── mock-server.mjs     # Mock API server for UI demo
│   ├── js/                         # Node.js unit tests
│   │   └── *.test.mjs              # JS module tests (15 files)
│   └── php/                        # PHP unit tests
│       └── run.php                 # PHP test runner
├── package.json                    # Node.js dependencies & scripts
├── package-lock.json              # Lockfile
├── build.mjs                      # Build script (esbuild)
├── playwright.config.mjs          # Playwright configuration
├── README.md                      # Main documentation
├── UI-ENHANCEMENTS.md             # UI improvement documentation
└── UI-MODERNIZATION.md            # UI modernization documentation
```

---

## Core Features

### 1. Movie Browsing
- **Table View**: Sortable, filterable movie table with pagination
- **Grid View**: Poster grid alternative view
- **Detail Modal**: Click any movie to see full details with navigation
- **Responsive Design**: Works on desktop and mobile devices

### 2. Advanced Filtering
- **Per-column filters** for all visible columns
- **Search modes** for titles: Exact, Contains, Fuzzy
- **Filter logic**: AND/OR mode switching
- **Numeric range queries**: Support for `2000-2009`, `150+`, `<90` syntax
- **File/Path filtering**: Case-insensitive substring matching
- **Filter-only columns**: DIRECTOR, ACTORS, COUNTRY (no table header, shown as pills)

### 3. Analytics Dashboard
Comprehensive collection analytics with **12 sections**:

| Section | Description |
|---------|-------------|
| Overview | Total movies, size, avg rating/runtime, year span |
| Release Years | Decade distribution, timeline, insights |
| Genres | Genre distribution with donut chart |
| Rating & Runtime | Band distributions, coverage |
| Certifications | Certification distribution |
| Directors | Director analytics and distribution |
| Cast | Actor analytics and distribution |
| Language & Country | Language/country distribution |
| Technical | Resolution and audio format analytics |
| Storage | File size distribution and insights |
| Metadata | Field-by-field completeness analysis |
| Library Health | Health score, missing files/posters, duplicates |

**Interactive Feature**: Click any chart element to filter the main table to matching movies.

### 4. Special Features
- **Theme Toggle**: Light/Dark mode with localStorage persistence
- **Sidebar Modes**: Full (icons + text), Icons-only, Hidden
- **Poster Display**: Toggle mini-posters in table cells
- **Copy to Clipboard**: Copy movie details with one click
- **Keyboard Navigation**: Modal navigation with arrow keys
- **Health Indicators**: Visual indicators for missing files, better copies needed

### 5. Performance Optimizations
- **Deferred-join pagination**: Efficient deep pagination using MySQL window functions
- **Stats caching**: 300-second cache for collection statistics (configurable)
- **Lazy loading**: Analytics load in idle time
- **No runtime cost**: UI enhancements add zero runtime overhead on common paths

---

## Database Schema

### Table: `movies`

The application expects a `movies` table with the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `NUM` | INT UNSIGNED | Primary key, unique movie identifier |
| `FORMATTEDTITLE` | VARCHAR(512) | Display title |
| `ORIGINALTITLE` | VARCHAR(512) | Original title |
| `TRANSLATEDTITLE` | VARCHAR(512) | Translated title |
| `YEAR` | SMALLINT UNSIGNED | Release year |
| `LENGTH` | SMALLINT UNSIGNED | Runtime in minutes |
| `CERTIFICATION` | VARCHAR(255) | Content rating (e.g., PG-13, R) |
| `RATING` | DECIMAL(3,1) | User rating (0-10 scale) |
| `DIRECTOR` | TEXT | Director(s) - comma/semicolon delimited |
| `ACTORS` | TEXT | Cast - comma/semicolon delimited |
| `COUNTRY` | TEXT | Country(s) - comma/semicolon delimited |
| `DESCRIPTION` | TEXT | Movie description |
| `FILESIZE` | DECIMAL(14,2) | File size in **MiB** (not bytes) |
| `LANGUAGES` | TEXT | Language(s) - comma/semicolon delimited |
| `CATEGORY` | TEXT | Genre(s) - comma/semicolon delimited |
| `RESOLUTION` | VARCHAR(255) | Video resolution (e.g., 1080p, 4K) |
| `AUDIOFORMAT` | VARCHAR(255) | Audio format (e.g., DTS, Dolby Atmos) |
| `FILEPATH` | TEXT | Full file path (Windows/Unix) or "MISSING" |
| `SUBTITLES` | TEXT | Subtitle information |
| `URL` | VARCHAR(2048) | External URL (typically IMDb) |
| `PICTURENAME` | VARCHAR(512) | Poster filename |

### Indexes
- Primary key on `NUM`
- Indexes on `YEAR`, `FORMATTEDTITLE(191)`, `URL(191)`
- Full-text index on: `FORMATTEDTITLE`, `ORIGINALTITLE`, `TRANSLATEDTITLE`, `DIRECTOR`, `ACTORS`, `CATEGORY`, `DESCRIPTION`

### Important Data Conventions

1. **`FILEPATH`**: Can contain Windows (`\`) or Unix (`/`) paths, bare filenames, or the special value `MISSING`
2. **`FILESIZE`**: Stored in **MiB** (mebibytes), not bytes. Analytics multiply by 1,048,576 for byte calculations
3. **`NUM`**: The unique numeric movie identifier - referenced throughout the application
4. **Delimited fields**: Genres, languages, countries, credits may contain comma-, semicolon-, pipe-, or slash-delimited lists
5. **Zero values**: In `RATING`, `LENGTH`, and `FILESIZE`, zero means "unknown" (not actual zero)
6. **Duplicate detection**: Uses matching IMDb URLs, with exclusions for catalog numbers `6717` and `6718`

---

## API Endpoints

All endpoints are under `/api/` and return JSON responses.

### GET `/api/movies.php`
Main movie listing endpoint with extensive filtering and pagination support.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 200)
- `sort` - Sort column (default: NUM)
- `dir` - Sort direction: ASC/DESC (default: ASC)
- `mode` - Filter mode: AND/OR (default: AND)
- `fuzzy` - Enable fuzzy title search (boolean)
- `titleMode` - Title search mode: EXACT/CONTAINS/FUZZY
- Any column name as filter (e.g., `FORMATTEDTITLE`, `YEAR`, `CATEGORY`, etc.)

**Response:**
```json
{
  "data": [/* array of movie objects */],
  "page": 1,
  "limit": 50,
  "pages": 5,
  "total": 248
}
```

### GET `/api/stats.php`
Collection-wide statistics and analytics.

**Query Parameters:**
- `refresh` or `nocache` - Bypass cache (boolean)

**Response:** Comprehensive statistics object with all analytics data.

### GET `/api/duplicates.php`
Find duplicate movies based on IMDb URL.

### GET `/api/better-copy.php`
Find movies marked as needing a better copy (FILEPATH contains "-Get.Better.Copy").

### GET `/api/library-issues.php`
Library health issues summary.

### GET `/api/movie-page.php`
Get page number for a specific movie given current filters.

**Query Parameters:**
- `num` - Movie NUM
- `perPage` - Items per page
- `sort`, `dir`, `filters`, `mode`, `fuzzy`, `titleMode` - Same as movies endpoint

---

## Frontend Architecture

### JavaScript Modules

The frontend uses ES modules with a clean separation of concerns:

```
app.js (entry point)
├── core/
│   ├── api.js           # API client for fetching data
│   ├── dom.js           # DOM manipulation utilities
│   ├── movie-loader.js  # Movie data loading with caching
│   ├── request.js       # HTTP request utilities
│   └── state.js         # Application state management
├── modal/
│   ├── modal.dom.js     # Modal DOM utilities
│   ├── modal.js         # Modal behavior
│   └── modal.utils.js   # Modal helper functions
├── stats/
│   ├── stats.js             # Main stats initialization
│   ├── stats-animations.js   # Chart animations
│   ├── stats-cast.js         # Cast analytics
│   ├── stats-certifications.js # Certification analytics
│   ├── stats-directors.js     # Director analytics
│   ├── stats-genres.js        # Genre analytics
│   ├── stats-issues.js        # Library health issues
│   ├── stats-language-country.js # Language/country analytics
│   ├── stats-metadata-completeness.js # Metadata completeness
│   ├── stats-pagination.js    # Stats panel pagination
│   ├── stats-rating-runtime.js # Rating/runtime analytics
│   ├── stats-release-years.js # Release year analytics
│   └── stats-storage.js       # Storage analytics
├── table/
│   ├── columns.js       # Column toggle functionality
│   ├── grid-view.js     # Grid view rendering
│   ├── highlight-text.js # Text highlighting
│   ├── pagination.js    # Pagination controls
│   ├── poster-toggle.js # Poster display toggle
│   ├── search.js        # Search functionality
│   ├── sidebar.js       # Sidebar controls
│   ├── sorting.js       # Table sorting
│   └── table.js         # Main table rendering
└── utils/
    └── feedback.js      # Error feedback utilities
```

### State Management

The application uses a centralized state object (`state.js`) that includes:
- Search filters and modes
- Current page and pagination settings
- View mode (table/grid)
- Theme preference
- Column visibility
- Poster display settings

State is persisted to `localStorage` for theme and view preferences.

### Build System

The project uses **esbuild** for bundling:
- `npm run build` - One-time minified build with source maps
- `npm run build:watch` - Rebuild on changes
- `npm run dev` - Build + watch + start PHP development server
- `npm run dev:demo` - Start mock server with fixture data (no database needed)

Bundles are written to `public/assets/dist/`:
- `bundle.js` - Minified JavaScript
- `bundle.css` - Minified CSS

The PHP layouts automatically use bundled assets when available, falling back to source files for development.

---

## Configuration

### Application Configuration

**`movie-catalog/src/config/config.json`:**
```json
{
  "pagination": {
    "default_limit": 50,
    "max_limit": 200
  },
  "stats": {
    "cache_enabled": true,
    "cache_ttl": 300
  }
}
```

### Database Configuration

Database configuration is loaded from multiple sources (in priority order):
1. Environment variables (`MOVIE_DB_*`)
2. Local config file (`database.local.json` - **ignored by Git**)
3. Default config file (`database.example.json`)

**Environment Variables:**
- `MOVIE_DB_HOST` - Database host (default: 127.0.0.1)
- `MOVIE_DB_PORT` - Database port (default: 3306)
- `MOVIE_DB_NAME` - Database name
- `MOVIE_DB_USER` - Database username
- `MOVIE_DB_PASSWORD` - Database password
- `MOVIE_DB_CHARSET` - Character set (default: utf8mb4)
- `MOVIE_DB_CONFIG` - Path to external JSON config file

**Example `database.local.json`:**
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

---

## Testing

### Test Suites

1. **JavaScript Tests** (`npm run test:js`)
   - Unit tests for core modules
   - 15 test files covering: columns, entry cycles, grid view, highlighting, modals, movie loading, pagination, posters, search, sidebar, state defaults, stats animations, stats API, stats directors

2. **PHP Tests** (`npm run test:php`)
   - Unit tests for PHP helpers and query construction
   - Runs without database connection

3. **Browser Tests** (`npm run test:browser`)
   - Playwright-based end-to-end tests
   - Tests against mock API server
   - Covers: analytics drill-down, catalog browsing, coordination

**Full test suite:** `npm test` (runs all three suites in sequence)

### Mock Server

For UI development without a database:
```bash
npm run dev:demo
```

This starts a mock server on port 4173 with:
- 55 deterministic fixture movies
- Mock JSON endpoints
- Real frontend code
- Placeholder poster images
- Fixed example analytics values

---

## Development Workflow

### Quick Start (No Database)
```bash
npm run dev:demo
# Open http://localhost:4173
```

### Full Application Setup

1. **Install dependencies:**
   ```bash
   npm ci
   ```

2. **Set up database:**
   ```bash
   # Create database and user
   mysql -u root -p
   > CREATE DATABASE movie_catalog_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   > CREATE USER 'movie_catalog_dev'@'127.0.0.1' IDENTIFIED BY 'local-development-only';
   > GRANT SELECT ON movie_catalog_dev.* TO 'movie_catalog_dev'@'127.0.0.1';
   > EXIT;
   
   # Load schema and fixtures
   mysql -u root -p movie_catalog_dev < dev/schema.sql
   mysql -u root -p movie_catalog_dev < dev/seed.sql
   ```

3. **Configure database:**
   ```bash
   cp movie-catalog/src/config/database.example.json movie-catalog/src/config/database.local.json
   # Edit with your database credentials
   ```

4. **Start development server:**
   ```bash
   mkdir -p movie-catalog/var/cache
   npm run dev
   # Open http://localhost:8080
   ```

### Useful Development Commands

```bash
# Build assets
npm run build

# Build and watch
npm run build:watch

# Run specific test suites
npm run test:js
npm run test:php
npm run test:browser

# Run browser tests with UI
npx playwright test --headed

# Install browser dependencies
npx playwright install chromium
npx playwright install --with-deps chromium
```

---

## Deployment

### Requirements
- PHP 8.3+ with PDO and pdo_mysql extensions
- MySQL 8+ or MariaDB 10.6+
- Node.js 20+ (for building assets)
- Web server (Apache, Nginx, etc.)

### Deployment Steps

1. **Build assets:**
   ```bash
   npm run build
   ```

2. **Set web document root to:** `movie-catalog/public/`

3. **Configure database** (via environment variables or local config file)

4. **Set up cache directory:**
   ```bash
   mkdir -p movie-catalog/var/cache
   chmod 777 movie-catalog/var/cache  # Ensure PHP can write to it
   ```

5. **Deploy poster images** to `movie-catalog/public/movies/antexport/`

### Important Notes

- **No authentication**: The application has no built-in authentication. Protect it with web-server or reverse-proxy authentication
- **API exposure**: API responses expose catalog details and local media paths
- **PHP built-in server**: For development only, not production
- **Cache clearing**: Request `/api/stats.php?refresh=true` to clear stats cache after data changes

---

## Key Design Decisions

### 1. Read-Only Philosophy
The application is intentionally read-only. This simplifies:
- Security model (no write operations to protect)
- Database permissions (only SELECT required)
- Data integrity (no risk of accidental modifications)
- Performance (no locking, transactions, or write optimizations needed)

### 2. Vanilla JavaScript
No frontend frameworks or libraries (except Font Awesome for icons):
- **Pros**: Zero runtime dependencies, smaller bundle size, easier maintenance
- **Cons**: More manual DOM manipulation, no reactive updates

### 3. Deferred-Join Pagination
For efficient deep pagination:
- Inner query: Select only primary keys with WHERE/ORDER BY/LIMIT/OFFSET
- Outer query: Fetch full rows for the selected IDs
- **Benefit**: MySQL can use indexes efficiently even for large OFFSET values

### 4. CSS Custom Properties
All theming uses CSS variables:
- Single source of truth for colors, spacing, etc.
- Easy theme switching (light/dark)
- Consistent styling across components

### 5. Self-Hosted Font Awesome
- Only `fa-solid-900.woff2` (~153 KB) is fetched on demand
- No third-party requests
- No FOUT (Flash of Unstyled Text)
- Subset includes only needed icons

---

## Known Limitations

1. **No authentication**: Must be protected by web server or reverse proxy
2. **MySQL only**: Uses MySQL-specific SQL functions (not SQLite compatible)
3. **No real-time updates**: Stats are cached (300s default)
4. **No streaming**: Only metadata browsing, no media playback
5. **No edit functionality**: Read-only by design
6. **Browser requirements**: Modern browser with ES module support

---

## File Counts and Sizes

### PHP Files
- API endpoints: 6 files
- Controllers: 1 file
- Repositories: 1 file
- Helpers: 5 files
- Views: 4 files
- Config: 4 files
- **Total**: ~17 PHP files

### JavaScript Files
- Core modules: 5 files
- Modal modules: 3 files
- Stats modules: 12 files
- Table modules: 8 files
- Utility modules: 1 file
- **Total**: ~29 JS files

### CSS Files
- 9 stylesheet files
- ~100 KB total (unminified)

### Test Files
- JavaScript tests: 15 files
- PHP tests: 1 runner + test files
- Browser tests: 3 spec files + support
- **Total**: ~20 test files

---

## Performance Characteristics

### Frontend
- **Bundle size**: ~50-100 KB (minified JS + CSS)
- **Initial load**: Single HTTP request for bundled assets
- **Lazy loading**: Analytics load after page render
- **No framework overhead**: Vanilla JS keeps runtime minimal

### Backend
- **Database queries**: Optimized with indexes and deferred joins
- **Stats caching**: 300-second TTL reduces database load
- **Window functions**: Used for efficient page lookup when supported
- **Fallback mechanisms**: Graceful degradation for older MySQL versions

### Caching Strategy
1. **Stats cache**: File-based cache in `var/cache/stats.json`
2. **Asset cache**: File mtime-based cache busting
3. **Browser cache**: Proper cache headers for static assets

---

## Security Considerations

### Strengths
- Read-only operations only
- PDO with prepared statements (SQL injection protection)
- Error handling doesn't expose sensitive information
- Content-Type headers prevent XSS via content sniffing
- No user input stored or processed

### Weaknesses
- No authentication/authorization
- Database credentials in config files (must be protected)
- Local media paths exposed in API responses
- No rate limiting on API endpoints

### Recommendations
1. Keep application behind authentication proxy
2. Use HTTPS for all connections
3. Restrict database user permissions to SELECT only
4. Keep `database.local.json` out of version control (it's gitignored)
5. Regularly update PHP and MySQL to latest secure versions

---

## Recent Improvements (from UI-ENHANCEMENTS.md and UI-MODERNIZATION.md)

### UI Enhancements (Implemented)
1. **Fixed row highlighting**: 
   - `tr.missing-file` now readable in light mode
   - `tr.better-copy` has proper legend/meaning
   - Consistent hover feedback

2. **Search behavior improvements**:
   - File/Path filters use literal substring matching (not SQL wildcards)
   - Independent of global fuzzy flag
   - Numeric columns support range grammar (`2000-2009`, `150+`, `<90`)
   - Zero values treated as "unknown" for RATING, LENGTH, FILESIZE

3. **Analytics drill-down**: Click any chart element to filter the main table

### UI Modernization (Implemented)
1. **App identity**: Clapperboard brand mark, wordmark, tagline
2. **Design tokens**: Unified CSS custom properties in `variables.css`
3. **Brand palette**: Indigo primary + amber "marquee" accent
4. **Movie grid view**: Alternative to table view
5. **Flex app shell**: Modern viewport-based layout
6. **Font Awesome**: Self-hosted, replacing emoji icons
7. **Performance constraint**: All enhancements add zero runtime cost on common path

---

## Future Enhancement Ideas

1. **Export functionality**: CSV/JSON export of filtered results
2. **Custom filters**: Save and recall filter presets
3. **Advanced sorting**: Multi-column sorting
4. **Tag management**: User-defined tags/categories
5. **Watchlist**: Mark movies as watched/favorites
6. **Search history**: Remember recent searches
7. **Customizable columns**: Save column visibility preferences
8. **Mobile app**: Native mobile companion
9. **API documentation**: Swagger/OpenAPI documentation
10. **Internationalization**: Multi-language support

---

## Conclusion

This is a **well-architected, production-ready movie catalog browser** with:
- Clean separation of concerns (PHP backend, JS frontend)
- Comprehensive filtering and analytics capabilities
- Modern, responsive UI with dark/light theme support
- Efficient database queries with caching
- Complete test coverage
- Extensive documentation

The application is particularly suitable for:
- Personal media library browsing
- Movie collection management (metadata only)
- Analytics and insights on movie collections
- Development/learning projects (clean codebase)

Its read-only nature makes it secure and simple, while the extensive filtering and analytics make it powerful for exploring movie collections.
