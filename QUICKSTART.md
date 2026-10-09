# Movie Catalog - Quick Start Guide

## TL;DR - Get Started in 30 Seconds

For a **database-free demo** with mock data:
```bash
npm run dev:demo
# Open http://localhost:4173
```

For the **full application** with your own database:
```bash
# 1. Install dependencies
npm ci

# 2. Set up database (see below)

# 3. Configure connection
cp movie-catalog/src/config/database.example.json movie-catalog/src/config/database.local.json
# Edit with your DB credentials

# 4. Start development server
mkdir -p movie-catalog/var/cache
npm run dev
# Open http://localhost:8080
```

---

## Installation

### Prerequisites

| Component | Version | Check Command |
|-----------|---------|---------------|
| Node.js | 20+ (22 LTS recommended) | `node --version` |
| npm | Latest | `npm --version` |
| PHP | 8.3+ | `php --version` |
| MySQL | 8+ or MariaDB 10.6+ | `mysql --version` |
| PDO_mysql | Required | `php -r 'var_export(PDO::getAvailableDrivers());'` |

**Ubuntu 24.04 Example:**
```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PHP 8.3 with required extensions
sudo apt install -y php8.3-cli php8.3-mysql php8.3-mbstring

# Install MySQL
sudo apt install -y mysql-server
```

### Install Dependencies

```bash
# From repository root (where package.json is)
npm ci
```

This installs:
- esbuild (bundler)
- Playwright (browser testing)

---

## Database Setup

### Option A: Quick Demo Database (Recommended for Development)

```bash
# Connect to MySQL as admin
mysql -u root -p

# Create database and user
CREATE DATABASE movie_catalog_dev 
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'movie_catalog_dev'@'127.0.0.1' 
  IDENTIFIED BY 'local-development-only';

GRANT SELECT ON movie_catalog_dev.* 
  TO 'movie_catalog_dev'@'127.0.0.1';

EXIT;

# Load schema and sample data
mysql -u root -p movie_catalog_dev < dev/schema.sql
mysql -u root -p movie_catalog_dev < dev/seed.sql
```

### Option B: Use Your Existing Catalog

Skip the SQL files above. Just configure the connection to point to your existing database with a user that has SELECT permissions.

**Important**: Your `movies` table must have the columns listed in [schema.sql](dev/schema.sql).

---

## Configuration

### Database Configuration

Create local config file:
```bash
cp movie-catalog/src/config/database.example.json \
  movie-catalog/src/config/database.local.json
```

Edit with your credentials:
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

**Alternative**: Use environment variables instead:
```bash
export MOVIE_DB_HOST=127.0.0.1
export MOVIE_DB_PORT=3306
export MOVIE_DB_NAME=movie_catalog_dev
export MOVIE_DB_USER=movie_catalog_dev
export MOVIE_DB_PASSWORD=local-development-only
```

### Application Configuration

Edit `movie-catalog/src/config/config.json` to customize:
```json
{
  "pagination": {
    "default_limit": 50,   // Items per page
    "max_limit": 200       // Maximum allowed
  },
  "stats": {
    "cache_enabled": true,
    "cache_ttl": 300       // Cache duration in seconds
  }
}
```

---

## Running the Application

### Development Mode

```bash
# Start with hot reload and PHP server
npm run dev

# Or start individually:
# Terminal 1: Build and watch assets
npm run build:watch

# Terminal 2: Start PHP server
php -S 0.0.0.0:8080 -t movie-catalog/public
```

Open: **http://localhost:8080**

### Demo Mode (No Database)

```bash
# Start mock server with fixture data
npm run dev:demo
```

Open: **http://localhost:4173**

Features:
- 55 sample movies
- Mock API endpoints
- Real frontend code
- No database required

### Production Build

```bash
# Build minified assets
npm run build

# Assets will be in: movie-catalog/public/assets/dist/
# - bundle.js
# - bundle.css
```

---

## Using the Application

### Main Features

| Feature | How to Use |
|---------|------------|
| **Search** | Type in any column filter input |
| **Title Search Modes** | Select Exact/Contains/Fuzzy from dropdown |
| **Filter Logic** | Toggle AND/OR mode |
| **Numeric Ranges** | Use `2000-2009`, `150+`, `<90` syntax |
| **Sort** | Click column headers |
| **Paginate** | Click page numbers or use limit selector |
| **View Toggle** | Click Table/Grid buttons in sidebar |
| **Theme Toggle** | Click theme button in sidebar header |
| **Analytics** | Click "Analytics" ribbon (top right) |
| **Drill-Down** | Click any chart element to filter table |
| **Movie Details** | Click any movie row |
| **Copy Details** | Click copy button in modal |
| **Sidebar Modes** | Click mode buttons in sidebar header |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Navigate between movies in modal |
| `Esc` | Close modal |
| `Tab` / `Shift+Tab` | Navigate between controls |

### URL Parameters

You can bookmark or share filtered views:
```
http://localhost:8080/?FORMATTEDTITLE=Inception&YEAR=2010&sort=YEAR&dir=DESC
```

---

## Poster Setup

The application expects posters at:
```
/movies/antexport/<PICTURENAME>
```

With fallback: `/movies/antexport/movies_0000-coming_soon.jpg`

Create directory and add images:
```bash
mkdir -p movie-catalog/public/movies/antexport/
# Copy your poster images here
# Ensure fallback image exists
cp /path/to/coming_soon.jpg \
  movie-catalog/public/movies/antexport/movies_0000-coming_soon.jpg
```

The `PICTURENAME` column in your database should match the filename (without path).

---

## Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| **Database connection failed** | Check credentials in config file or env vars. Verify user has SELECT permissions. |
| **could not find driver** | Install pdo_mysql: `sudo apt install php8.3-mysql` |
| **SQLSTATE[HY000] [1045] Access denied** | Verify database user password |
| **Table 'movies' doesn't exist** | Run `dev/schema.sql` first, then `dev/seed.sql` |
| **Assets not updating** | Run `npm run build` or `npm run build:watch` |
| **Blank page** | Check browser console for errors. Verify PHP is running. |
| **404 on /api/movies.php** | Ensure document root is `movie-catalog/public/` |
| **Playwright tests fail** | Install Chromium: `npx playwright install chromium` |

### Debug Commands

```bash
# Check PHP version and extensions
php --version
php -m | grep -i pdo
php -r 'var_export(PDO::getAvailableDrivers());'

# Check MySQL connection
mysql -u movie_catalog_dev -p -h 127.0.0.1 movie_catalog_dev -e "SELECT COUNT(*) FROM movies;"

# Test API endpoints
curl 'http://localhost:8080/api/movies.php?limit=2'
curl 'http://localhost:8080/api/stats.php'

# Check for errors in PHP log
tail -f /var/log/php_errors.log
# Or check Apache error log
tail -f /var/log/apache2/error.log
```

### Clear Cache

```bash
# Clear stats cache
rm -f movie-catalog/var/cache/stats.json

# Or request cache refresh
curl 'http://localhost:8080/api/stats.php?refresh=true'

# Clear browser cache
# Ctrl+Shift+R or Cmd+Shift+R
```

---

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# JavaScript unit tests
npm run test:js

# PHP unit tests
npm run test:php

# Browser tests
npm run test:browser

# Browser tests with UI
npm run test:browser:headed
```

### Install Browser for Tests
```bash
npx playwright install chromium

# On Linux, also install system dependencies
npx playwright install --with-deps chromium
```

---

## Deployment

### Minimum Production Setup

```bash
# 1. Build assets
npm run build

# 2. Set up web server with document root: movie-catalog/public/

# 3. Configure database (env vars or config file)

# 4. Create cache directory
mkdir -p movie-catalog/var/cache
chmod 777 movie-catalog/var/cache

# 5. Add poster images to movie-catalog/public/movies/antexport/
```

### Apache Configuration Example

```apache
<VirtualHost *:80>
    ServerName movies.example.com
    DocumentRoot /path/to/movie-catalog/public
    
    <Directory /path/to/movie-catalog/public>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/movie-catalog-error.log
    CustomLog ${APACHE_LOG_DIR}/movie-catalog-access.log combined
</VirtualHost>
```

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name movies.example.com;
    root /path/to/movie-catalog/public;
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
    
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### Security Recommendations

1. **Use HTTPS**: Always serve over HTTPS
2. **Authentication**: Protect with basic auth or SSO:
   ```apache
   # Apache basic auth
   AuthType Basic
   AuthName "Movie Catalog"
   AuthUserFile /path/to/.htpasswd
   Require valid-user
   ```
3. **Restrict Access**: Limit to specific IPs if possible
4. **Database User**: Use a user with only SELECT permissions
5. **Keep Updated**: Regularly update PHP, MySQL, and Node.js

---

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server with hot reload |
| `npm run dev:demo` | Start mock server (no DB needed) |
| `npm run build` | Build minified assets |
| `npm run build:watch` | Build and watch for changes |
| `npm test` | Run all tests |
| `npm run test:js` | Run JS unit tests |
| `npm run test:php` | Run PHP unit tests |
| `npm run test:browser` | Run browser tests |
| `npx playwright install chromium` | Install browser for tests |

---

## File Structure Cheat Sheet

```
movie-catalog/
├── movie-catalog/
│   ├── public/               # Web root
│   │   ├── api/              # API endpoints
│   │   ├── assets/           # Frontend assets
│   │   │   ├── css/          # Stylesheets
│   │   │   ├── js/           # JavaScript modules
│   │   │   └── vendor/       # Third-party (Font Awesome)
│   │   └── index.php        # Entry point
│   └── src/                 # PHP application
│       ├── config/          # Configuration
│       ├── controllers/     # Controllers
│       ├── db/              # Database
│       ├── helpers/         # Helpers
│       ├── repositories/    # Repositories
│       └── views/           # Templates
├── dev/                    # Development files
│   ├── schema.sql           # Database schema
│   └── seed.sql             # Sample data
├── tests/                  # Tests
│   ├── browser/            # Playwright tests
│   ├── js/                 # JS unit tests
│   └── php/                # PHP unit tests
├── package.json            # Node dependencies
├── build.mjs              # Build script
└── README.md              # Full documentation
```

---

## Getting Help

1. **Read the full documentation**: [README.md](README.md)
2. **UI Enhancements**: [UI-ENHANCEMENTS.md](UI-ENHANCEMENTS.md)
3. **UI Modernization**: [UI-MODERNIZATION.md](UI-MODERNIZATION.md)
4. **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
5. **Analysis**: [ANALYSIS.md](ANALYSIS.md)

---

## Version Info

- **Application**: Movie Catalog
- **Branch**: arena/e20bd155-movie-catalog
- **Last Updated**: 2026-10-09
- **PHP Version**: 8.3+
- **Node Version**: 20+

---

## License

This project includes:
- Custom code: Check repository license
- Font Awesome 6.5.0: SIL OFL 1.1 license (fonts), MIT license (CSS/JS)

---

*Happy movie browsing! 🎬*
