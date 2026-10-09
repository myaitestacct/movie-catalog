# Movie Catalog - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │   HTML/CSS       │  │   JavaScript     │  │   Font Awesome   │   │
│  │   (9 CSS files)  │  │   (29 JS files)  │  │   (Self-hosted)  │   │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │
│           │                     │                       │               │
│           └─────────────────────┼───────────────────────┘               │
│                                     │                                   │
│                                     ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    ES MODULES (ES2020)                         │   │
│  │  app.js (entry) → imports all modules                           │   │
│  │  ├── core/        : API client, state, DOM utils                │   │
│  │  ├── modal/       : Movie detail dialogs                        │   │
│  │  ├── stats/       : 12 analytics modules                        │   │
│  │  ├── table/       : Table rendering, filtering, sorting         │   │
│  │  └── utils/       : Helper functions                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         WEB SERVER                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Document Root: movie-catalog/public/                                 │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │  index.php       │  │  api/*.php       │  │  assets/         │   │
│  │  (Entry point)   │  │  (6 endpoints)    │  │  (JS/CSS/fonts)  │   │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │
│           │                     │                       │               │
│           └─────────────────────┼───────────────────────┘               │
│                                     │                                   │
│                                     ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    PHP APPLICATION                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │   │
│  │  │  src/views/      │  │  src/controllers/ │  │  src/config/ │  │   │
│  │  │  (Templates)     │  │  (StatsController)│  │  (JSON files)│  │   │
│  │  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘  │   │
│  │           │                     │                     │         │   │
│  │           └─────────────────────┼─────────────────────┘         │   │
│  │                                     │                             │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                    │   │
│  │  │  src/repositories/│  │  src/helpers/    │                    │   │
│  │  │  (MovieRepo)     │  │  (5 helpers)     │                    │   │
│  │  └────────┬────────┘  └────────┬────────┘                    │   │
│  │           │                     │                             │   │
│  │           └─────────────────────┼─────────────────────┐         │   │
│  │                                     ▼                         ▼         │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │                    src/db/connection.php                   │   │   │
│  │  │  (PDO connection factory with config resolution)       │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ TCP/IP
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         MYSQL DATABASE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Database: movie_catalog_dev (or user's catalog)                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Table: movies                                                 │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │   │
│  │  │  NUM    │ │ TITLE   │ │ YEAR    │ │ ...     │ 24        │   │
│  │  │ (PK)    │ │ (idx)   │ │ (idx)   │ │         │ columns   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │   │
│  │                                                                  │   │
│  │  Indexes: NUM (PK), YEAR, FORMATTEDTITLE, URL, FULLTEXT        │   │
│  │  Fulltext: FORMATTEDTITLE, ORIGINALTITLE, DIRECTOR, ACTORS,      │   │
│  │           CATEGORY, DESCRIPTION                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Cache: var/cache/stats.json (300s TTL)                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Movie Listing Flow

```
User Action: Load movie table
       │
       ▼
┌─────────────────────┐
│  Browser: app.js      │
│  - Parse URL params   │
│  - Load from state    │
│  - Trigger fetch      │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  core/movie-loader.js│
│  - Build query params │
│  - Call API           │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  core/api.js         │
│  - HTTP GET          │
│  - /api/movies.php   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  public/api/movies.php│
│  - Parse $_GET params│
│  - Validate input    │
│  - Create repository │
│  - Call getMovies()  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  MovieRepository      │
│  - Build WHERE clause│
│  - Build ORDER BY    │
│  - Deferred join     │
│    (inner + outer)  │
│  - Return movies     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  MySQL Database      │
│  - Execute queries   │
│  - Return results    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  JSON Response       │
│  { data, page, limit,│
│    pages, total }    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Browser: table.js    │
│  - Render table      │
│  - Update pagination │
│  - Apply filters     │
└─────────────────────┘
```

### Analytics Flow

```
User Action: Open analytics panel
       │
       ▼
┌─────────────────────┐
│  stats/stats.js      │
│  - Check cache       │
│  - If stale, fetch    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  core/api.js         │
│  - HTTP GET          │
│  - /api/stats.php    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  public/api/stats.php│
│  - Check cache flag  │
│  - If refresh=true:   │
│    - Clear cache     │
│  - Create controller │
│  - Call getStats()   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  StatsController      │
│  - Check file cache  │
│  - If valid, return  │
│  - Else, query DB    │
│  - Build response    │
│  - Write to cache    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  MySQL: Multiple     │
│  - Stats aggregate   │
│  - Genre analytics   │
│  - Health checks     │
│  - etc.              │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  JSON Response       │
│  { total_movies,     │
│    average_rating,   │
│    genre_analytics,  │
│    ... }            │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Browser: 12 stats   │
│  modules render      │
│  charts and cards    │
└─────────────────────┘
```

### Drill-Down Flow (Analytics → Filter)

```
User Action: Click genre bar in analytics
       │
       ▼
┌─────────────────────┐
│  stats/stats-genres.js│
│  - Handle click       │
│  - Extract filter     │
│  - Close panel        │
│  - Apply filter       │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  core/state.js       │
│  - Update search     │
│    filters           │
│  - Set mode=AND      │
│  - Persist state     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  table/search.js     │
│  - Update inputs     │
│  - Add filter pill   │
│  - Trigger reload    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  table/table.js      │
│  - Reset to page 1   │
│  - Fetch movies      │
│  - Re-render table   │
└─────────────────────┘
```

---

## Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│  ENTRY POINT: app.js                                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────────────────────────────────────────┐
    │                         CORE MODULES                            │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
    │  │ api.js    │ │ dom.js    │ │ state.js  │ │ request.js│        │
    │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘        │
    │       │            │            │            │                │
    │       └────────────┴────────────┴────────────┘                │
    │                                    │                              │
    │                                    ▼                              │
    │  ┌─────────────────────────────────────────────────────┐    │
    │  │                    movie-loader.js                       │    │
    │  │  (Uses api.js, state.js, request.js)                    │    │
    │  └─────────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────────────┬───────────────────────┐
              │                       │                       │
    ┌─────────▼─────────┐   ┌─────────▼─────────┐   ┌─────────▼─────────┐
    │    TABLE MODULES    │   │    STATS MODULES    │   │    MODAL MODULES    │
    │                     │   │                     │   │                     │
    │  ┌─────────────┐    │   │  ┌─────────────┐    │   │  ┌─────────────┐    │
    │  │ table.js    │◄───┼───┤  │ stats.js    │    │   │  │ modal.js    │    │
    │  └──────┬──────┘    │   │  └──────┬──────┘    │   │  └──────┬──────┘    │
    │         │           │   │         │           │   │         │           │
    │  ┌──────▼──────┐   │   │  ┌──────▼──────┐   │   │  ┌──────▼──────┐    │
    │  │ search.js   │   │   │  │ stats-*.js │   │   │  │ modal.dom.js│    │
    │  └──────┬──────┘   │   │  │ (12 files) │   │   │  └─────────────┘    │
    │         │           │   │  └─────────────┘   │   │                     │
    │  ┌──────▼──────┐   │   │                    │   │  ┌─────────────┐    │
    │  │ sorting.js  │   │   │                    │   │  │modal.utils.js│    │
    │  └──────┬──────┘   │   │                    │   │  └─────────────┘    │
    │         │           │   │                    │   │                     │
    │  ┌──────▼──────┐   │   │                    │   └─────────────────────┘
    │  │ pagination.js│   │   │                    │
    │  └──────┬──────┘   │   │                    │
    │         │           │   │                    │
    │  ┌──────▼──────┐   │   │                    │
    │  │ columns.js  │   │   │                    │
    │  └──────┬──────┘   │   │                    │
    │         │           │   │                    │
    │  ┌──────▼──────┐   │   │                    │
    │  │ poster-      │   │   │                    │
    │  │ toggle.js   │   │   │                    │
    │  └──────┬──────┘   │   │                    │
    │         │           │   │                    │
    │  ┌──────▼──────┐   │   │                    │
    │  │ grid-view.js │   │   │                    │
    │  └─────────────┘   │   │                    │
    │                     │   │                    │
    └─────────────────────┘   └─────────────────────┘   └─────────────────────┘
                              │
              ┌───────────────────────┴───────────────────────┐
              │                                           │
              ▼                                           ▼
    ┌─────────────────────────────────┐   ┌─────────────────────────────┐
    │       UTILS MODULES               │   │       SIDEBAR MODULE          │
    │  ┌─────────────────────────────┐ │   │  ┌───────────────────────┐  │
    │  │    feedback.js                │ │   │  │    sidebar.js           │  │
    │  │    (Error handling)           │ │   │  └───────────────────────┘  │
    │  └─────────────────────────────┘ │   └─────────────────────────────┘
    └─────────────────────────────────┘
```

---

## Class/Module Responsibilities

### PHP Backend

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONTROLLERS Layer                                                   │
├─────────────────────────────────────────────────────────────────────┤
│  StatsController                                                     │
│  - Orchestrate stats collection                                      │
│  - Manage cache                                                       │
│  - Build comprehensive response                                       │
│  - Handle library issues                                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  REPOSITORIES Layer                                                   │
├─────────────────────────────────────────────────────────────────────┤
│  MovieRepository                                                     │
│  - Build SQL queries                                                 │
│  - Parse filter values (numeric ranges, title modes, etc.)           │
│  - Execute deferred-join pagination                                   │
│  - Handle window functions (for page lookup)                         │
│  - Return movie data with derived fields (PATH, FILE)                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────────────┬───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│  HELPERS Layer       │   │  CONFIG Layer        │   │  DB Layer            │
├─────────────────────┤   ├─────────────────────┤   ├─────────────────────┤
│  ApiResponse          │   │  config.json         │   │  connection.php       │
│  - Configure PHP      │   │  - Pagination limits │   │  - PDO factory       │
│  - Error handling     │   │  - Cache settings    │   │  - Config resolution │
│  FileHelper           │   │  sql.json            │   │  - Connection pooling │
│  - Path splitting     │   │  - Query templates   │   │  - Error handling    │
│  Pagination           │   └─────────────────────┘   └─────────────────────┘
│  - Offset calculation │
│  - Limit validation   │
│  Request             │
│  - Input parsing      │
└─────────────────────┘
```

### JavaScript Frontend

```
┌─────────────────────────────────────────────────────────────────────┐
│  CORE Layer                                                           │
├─────────────────────────────────────────────────────────────────────┤
│  state.js                                                           │
│  - Centralized application state                                      │
│  - Search filters, view mode, theme, pagination                      │
│  - localStorage persistence                                          │
├─────────────────────────────────────────────────────────────────────┤
│  api.js                                                             │
│  - HTTP client for API endpoints                                     │
│  - Request/response handling                                          │
│  - Error management                                                   │
├─────────────────────────────────────────────────────────────────────┤
│  movie-loader.js                                                     │
│  - High-level data loading                                            │
│  - Caching strategies                                                │
│  - Coordinates between modules                                        │
├─────────────────────────────────────────────────────────────────────┤
│  dom.js                                                              │
│  - DOM manipulation utilities                                          │
│  - Event delegation                                                  │
│  - Element creation                                                   │
├─────────────────────────────────────────────────────────────────────┤
│  request.js                                                          │
│  - Low-level HTTP requests                                           │
│  - Query string building                                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────────────────────────────────────────┐
    │  FEATURE LAYERS                                                  │
    ├─────────────────────────────────────────────────────────────┤
    │  TABLE Layer                                                     │
    │  - table.js: Main rendering                                      │
    │  - search.js: Filter input and processing                        │
    │  - sorting.js: Column sorting                                     │
    │  - pagination.js: Page navigation                                 │
    │  - columns.js: Column visibility toggle                          │
    │  - grid-view.js: Alternative grid rendering                      │
    │  - poster-toggle.js: Poster display in cells                     │
    │  - sidebar.js: Sidebar controls and interactions                 │
    ├─────────────────────────────────────────────────────────────┤
    │  STATS Layer                                                     │
    │  - stats.js: Main initialization and coordination                │
    │  - stats-*.js: Individual chart types and analytics              │
    │    - animations, cast, certifications, directors, genres       │
    │    - issues, language-country, metadata-completeness            │
    │    - pagination, rating-runtime, release-years, storage        │
    ├─────────────────────────────────────────────────────────────┤
    │  MODAL Layer                                                     │
    │  - modal.js: Main modal behavior                                 │
    │  - modal.dom.js: DOM-specific utilities                          │
    │  - modal.utils.js: Helper functions                               │
    └─────────────────────────────────────────────────────────────┘
```

---

## Configuration Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│  DATABASE CONFIGURATION (Priority: Highest → Lowest)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Environment Variables (MOVIE_DB_*)                               │
│     └── MOVIE_DB_HOST, MOVIE_DB_PORT, MOVIE_DB_NAME, etc.             │
│                                                                         │
│  2. External Config File (MOVIE_DB_CONFIG env var)                   │
│     └── Path to custom JSON file outside project                      │
│                                                                         │
│  3. Local Config File                                                │
│     └── movie-catalog/src/config/database.local.json                │
│         (IGNORED by Git - must be created manually)                  │
│                                                                         │
│  4. Example Config File                                               │
│     └── movie-catalog/src/config/database.example.json               │
│         (Template for creating local config)                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  APPLICATION CONFIGURATION                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  movie-catalog/src/config/config.json                               │
│  {                                                                     │
│    "pagination": { "default_limit": 50, "max_limit": 200 },         │
│    "stats": { "cache_enabled": true, "cache_ttl": 300 }            │
│  }                                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  SQL QUERIES                                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  movie-catalog/src/config/sql.json                                    │
│  - Predefined SQL queries as templates                               │
│  - Used by StatsController                                          │
│  - Includes: stats, categories, languages, health, duplicates, etc.   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow Summary

### Normal Page Load

```
Browser Request
    │
    ▼
PHP: index.php
    │
    ├──► header.php (HTML head with CSS)
    │
    ├──► stats.php (Analytics panel HTML)
    │
    ├──► movie.php (Movie table HTML)
    │
    └──► footer.php (HTML footer with JS)
    │
    ▼
Browser loads app.js (or bundle.js)
    │
    ▼
app.js initializes modules
    │
    ├──► state.js loads from localStorage
    │
    ├──► movie-loader.js fetches initial data
    │       │
    │       ▼
    │    api/movies.php (with default params)
    │       │
    │       ▼
    │    MovieRepository.getMovies()
    │       │
    │       ▼
    │    MySQL query (deferred join)
    │
    └──► table.js renders movie table
    │
    ▼
User sees movie table with pagination
```

### Lazy Analytics Load

```
Page loaded, browser idle
    │
    ▼
stats.js checks if stats loaded
    │
    ▼
If not loaded:
    │
    ▼
api/stats.php
    │
    ▼
StatsController.getStats()
    │
    ├──► Check cache file (var/cache/stats.json)
    │       │
    │       ├──► If valid: return cached data
    │       │
    │       └──► If stale: query database
    │               │
    │               ├──► Multiple SQL queries
    │               │
    │               └──► Build response object
    │
    └──► Write to cache file
    │
    ▼
JSON response with all analytics data
    │
    ▼
stats.js distributes data to 12 modules
    │
    ▼
Each module renders its charts/cards
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHP ERROR HANDLING                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  API Endpoint (e.g., movies.php)                                      │
│      │                                                               │
│      ├──► try { ... } catch (Throwable $e)                            │
│      │       │                                                       │
│      │       └──► ApiResponse::serverError()                          │
│      │               │                                               │
│      │               ├──► error_log() the error                        │
│      │               ├──► http_response_code(500)                     │
│      │               └──► JSON response with error message            │
│      │                                                               │
│      └──► ApiResponse::configure() at start                           │
│          ├──► ini_set('display_errors', '0')                           │
│          ├──► ini_set('log_errors', '1')                              │
│          └──► error_reporting(E_ALL)                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  JAVASCRIPT ERROR HANDLING                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  core/api.js                                                           │
│      │                                                               │
│      ├──► fetch() with try/catch                                      │
│      │       │                                                       │
│      │       ├──► On success: return data                              │
│      │       │                                                           │
│      │       └──► On error:                                            │
│      │               ├──► Log to console                               │
│      │               └──► Call showError() from feedback.js             │
│      │                                                               │
│  utils/feedback.js                                                    │
│      │                                                               │
│      ├──► showError(message, details?)                                │
│      │       │                                                       │
│      │       ├──► Create error element                                │
│      │       ├──► Add to DOM                                          │
│      │       └──► Auto-dismiss after timeout                          │
│      │                                                               │
│      └──► clearError()                                                │
│              └──► Remove error element                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Interactions

### 1. Filter Application
```
User types in filter input
    │
    ▼
search.js detects change
    │
    ▼
Update state.search[column]
    │
    ▼
Debounce (if applicable)
    │
    ▼
Trigger table reload
    │
    ▼
movie-loader.js fetches with new filters
    │
    ▼
API returns filtered movies
    │
    ▼
Table re-renders
```

### 2. Sorting
```
User clicks column header
    │
    ▼
sorting.js handles click
    │
    ▼
Update state.sort and state.dir
    │
    ▼
Trigger table reload
    │
    ▼
movie-loader.js fetches with new sort/dir
    │
    ▼
API returns sorted movies
    │
    ▼
Table re-renders
```

### 3. Pagination
```
User clicks page number
    │
    ▼
pagination.js handles click
    │
    ▼
Update state.page
    │
    ▼
Trigger table reload
    │
    ▼
movie-loader.js fetches with new page
    │
    ▼
API returns page of movies
    │
    ▼
Table re-renders
```

### 4. View Switching
```
User clicks Table/Grid button
    │
    ▼
app.js handles click
    │
    ▼
Update state.view
    │
    ▼
storeView() to localStorage
    │
    ▼
Toggle CSS classes on wrappers
    │
    ▼
If grid: renderGridView() or use cached
    │
    ▼
If table: renderTable()
```

### 5. Theme Toggle
```
User clicks theme button
    │
    ▼
sidebar.js handles click
    │
    ▼
Toggle theme class on :root
    │
    ▼
Update localStorage.theme
    │
    ▼
Update button aria-pressed
    │
    ▼
CSS variables automatically update
```

---

## Performance Optimizations

### 1. Deferred-Join Pagination
```
Instead of:
  SELECT * FROM movies 
  WHERE ... 
  ORDER BY ... 
  LIMIT 50 OFFSET 1000

Which scans 1050 rows, we do:

  -- Inner query: Only select IDs
  SELECT NUM FROM movies 
  WHERE ... 
  ORDER BY ... 
  LIMIT 50 OFFSET 1000
  
  -- Outer query: Fetch full data for selected IDs
  SELECT * FROM movies 
  WHERE NUM IN (id1, id2, ..., id50)
```

### 2. Window Functions for Page Lookup
```
To find which page a movie is on without scanning all pages:

  SELECT ranked.rn
  FROM (
    SELECT NUM, 
           ROW_NUMBER() OVER (ORDER BY ...) AS rn
    FROM movies
    WHERE ...
  ) AS ranked
  WHERE ranked.NUM = :targetNum
  LIMIT 1

Then: page = floor((rn - 1) / perPage) + 1
```

### 3. Stats Caching
```
First request:
  Check file: var/cache/stats.json
  If exists and < 300s old: return cached
  Else: query database, write to cache, return

Subsequent requests:
  Return cached (if within TTL)
  
Cache bypass:
  /api/stats.php?refresh=true
  Clears cache and forces fresh query
```

### 4. Asset Versioning
```
For bundled assets:
  <script src="bundle.js?v=1234567890">
  (filemtime of bundle file)

For source mode:
  <script src="app.js?v=1234567890">
  (max mtime of all JS files)

Prevents browser from caching stale assets with fresh markup
```

---

## Build Process

```
┌─────────────────────────────────────────────────────────────────────┐
│  BUILD SCRIPT: build.mjs                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Input:                                                                 │
│    - movie-catalog/public/assets/js/app.js (entry)                   │
│    - movie-catalog/public/assets/css/bundle-entry.css (entry)       │
│    - All imported modules                                              │
│                                                                         │
│  Process:                                                              │
│    esbuild.build({                                                     │
│      entryPoints: [app.js, bundle-entry.css],                        │
│      bundle: true,                                                    │
│      minify: true,                                                    │
│      sourcemap: true,                                                 │
│      format: 'esm',                                                   │
│      target: ['es2020'],                                             │
│      outfile: 'public/assets/dist/bundle.js/css'                     │
│    })                                                                 │
│                                                                         │
│  Output:                                                              │
│    - public/assets/dist/bundle.js (minified, ~50-100 KB)             │
│    - public/assets/dist/bundle.css (minified)                       │
│    - public/assets/dist/bundle.js.map (source map)                  │
│    - public/assets/dist/bundle.css.map (source map)                  │
│                                                                         │
│  Watch Mode:                                                          │
│    esbuild.context().watch() - Rebuilds on file changes                │
│                                                                         │
│  Serve Mode:                                                         │
│    Spawns PHP built-in server: php -S 0.0.0.0:8080 -t public/         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Test Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  TEST SUITES                                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. JAVASCRIPT TESTS (Node.js)                                       │
│     ├─ tests/js/*.test.mjs (15 files)                                │
│     ├─ Run: npm run test:js                                          │
│     └─ Covers: modules, utilities, state, search, pagination, etc.    │
│                                                                         │
│  2. PHP TESTS                                                         │
│     ├─ tests/php/run.php (test runner)                               │
│     ├─ Run: npm run test:php                                         │
│     └─ Covers: helpers, query building, repositories                  │
│                                                                         │
│  3. BROWSER TESTS (Playwright)                                       │
│     ├─ tests/browser/*.spec.mjs (3 files)                            │
│     ├─ tests/browser/support/mock-server.mjs (mock API)             │
│     ├─ Run: npm run test:browser                                     │
│     └─ Covers: E2E tests against real UI                             │
│                                                                         │
│  Full Suite: npm test (runs all three in sequence)                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  MOCK SERVER (for UI development and browser tests)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  tests/browser/support/mock-server.mjs                              │
│  ├─ Serves on port 4173 (default)                                    │
│  ├─ 55 fixture movies (deterministic)                                │
│  ├─ Mock API endpoints: /api/movies.php, /api/stats.php, etc.        │
│  ├─ Real frontend code (from public/)                               │
│  └─ No database required                                              │
│                                                                         │
│  Run: npm run dev:demo                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Summary

This architecture provides:

1. **Clean Separation**: PHP backend + JS frontend with clear boundaries
2. **Modular Design**: Small, focused modules with single responsibilities
3. **Performance**: Deferred joins, caching, lazy loading
4. **Testability**: Complete test coverage at all levels
5. **Maintainability**: Well-documented, consistent patterns
6. **Extensibility**: Easy to add new features or modify existing ones
7. **User Experience**: Responsive, fast, feature-rich interface
