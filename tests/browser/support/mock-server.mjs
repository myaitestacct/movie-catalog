import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..'
);
const applicationRoot = path.join(repositoryRoot, 'movie-catalog');
const publicRoot = path.join(applicationRoot, 'public');
const viewsRoot = path.join(applicationRoot, 'src/views');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);

const contentTypes = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
});

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

function createMovie(number, overrides = {}) {
  const padded = String(number).padStart(3, '0');
  const title = overrides.FORMATTEDTITLE || `Movie ${padded}`;
  const filename = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}.mkv`;

  return {
    NUM: String(number),
    FORMATTEDTITLE: title,
    ORIGINALTITLE: overrides.ORIGINALTITLE || title,
    YEAR: String(1980 + (number % 45)),
    RATING: (6 + (number % 30) / 10).toFixed(1),
    FILESIZE: String(1_000_000_000 + number * 25_000_000),
    CERTIFICATION: number % 2 === 0 ? 'PG-13' : 'R',
    LENGTH: String(85 + (number % 55)),
    LANGUAGES: number % 3 === 0 ? 'English, French' : 'English',
    CATEGORY: number % 2 === 0 ? 'Drama, Science Fiction' : 'Drama',
    RESOLUTION: number % 4 === 0 ? '3840x2160' : '1920x1080',
    AUDIOFORMAT: number % 2 === 0 ? 'DTS' : 'AAC',
    FILEPATH: `D:\\Movies\\${filename}`,
    PATH: 'D:\\Movies',
    FILE: filename,
    URL: `https://www.imdb.com/title/tt${String(number).padStart(7, '0')}/`,
    DESCRIPTION: `A deterministic description for ${title}.`,
    COUNTRY: number % 3 === 0 ? 'United States, Canada' : 'United States',
    DIRECTOR: number % 2 === 0 ? 'Ava Example' : 'Devon Sample',
    ACTORS: 'Alex Actor; Bailey Performer; Casey Star',
    SUBTITLES: 'English',
    PICTURENAME: `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}.jpg`,
    ...overrides
  };
}

// Build deterministic dataset with extra titles that share substrings for separator testing
const movies = Array.from({ length: 55 }, (_, index) => createMovie(index + 1));
movies[0] = createMovie(1, {
  FORMATTEDTITLE: 'Arrival',
  ORIGINALTITLE: 'Arrival',
  YEAR: '2016',
  RATING: '7.9',
  CATEGORY: 'Drama, Science Fiction',
  DIRECTOR: 'Denis Villeneuve',
  ACTORS: 'Amy Adams; Jeremy Renner; Forest Whitaker',
  DESCRIPTION: 'A linguist works with the military to communicate with alien lifeforms.',
  PICTURENAME: 'arrival.jpg'
});
movies[1] = createMovie(2, {
  FORMATTEDTITLE: 'Arrival 2',
  ORIGINALTITLE: 'Arrival 2',
  YEAR: '2020',
  RATING: '6.5',
  CATEGORY: 'Drama, Science Fiction',
  DIRECTOR: 'Denis Villeneuve',
  ACTORS: 'Amy Adams; Jeremy Renner',
  DESCRIPTION: 'Sequel to Arrival.',
  PICTURENAME: 'arrival-2.jpg'
});
movies[2] = createMovie(3, {
  FORMATTEDTITLE: 'The Arrival',
  ORIGINALTITLE: 'The Arrival',
  YEAR: '1996',
  RATING: '5.5',
  CATEGORY: 'Drama, Science Fiction',
  DIRECTOR: 'David Twohy',
  ACTORS: 'Charlie Sheen; Lindsay Crouse',
  DESCRIPTION: 'A radio astronomer discovers alien signal.',
  PICTURENAME: 'the-arrival.jpg'
});
movies[3] = createMovie(4, {
  FORMATTEDTITLE: 'Arrival: Directors Cut',
  ORIGINALTITLE: 'Arrival: Directors Cut',
  YEAR: '2017',
  RATING: '8.0',
  CATEGORY: 'Drama',
  DIRECTOR: 'Denis Villeneuve',
  ACTORS: 'Amy Adams',
  DESCRIPTION: 'Directors cut of Arrival.',
  PICTURENAME: 'arrival-directors.jpg'
});
movies[4] = createMovie(5, {
  FORMATTEDTITLE: 'Casablanca',
  ORIGINALTITLE: 'Casablanca',
  YEAR: '1942',
  RATING: '8.5',
  CATEGORY: 'Drama, Romance',
  DIRECTOR: 'Michael Curtiz',
  ACTORS: 'Humphrey Bogart; Ingrid Bergman; Paul Henreid',
  DESCRIPTION: 'A nightclub owner must choose between love and virtue.',
  PICTURENAME: 'casablanca.jpg'
});
movies[5] = createMovie(6, {
  FORMATTEDTITLE: 'Blade Runner 2049',
  ORIGINALTITLE: 'Blade Runner 2049',
  YEAR: '2017',
  RATING: '8.0',
  CATEGORY: 'Drama, Science Fiction',
  DIRECTOR: 'Denis Villeneuve',
  ACTORS: 'Ryan Gosling; Harrison Ford; Ana de Armas',
  DESCRIPTION: 'A young blade runner uncovers a long-buried secret.',
  PICTURENAME: 'blade-runner-2049.jpg'
});

const metadataFields = [
  ['description', 'Description', 3],
  ['cast', 'Cast', 2],
  ['director', 'Director', 2],
  ['audio-format', 'Audio Format', 1],
  ['certification', 'Certification', 1],
  ['country', 'Country', 1],
  ['file-size', 'File Size', 1],
  ['languages', 'Languages', 1],
  ['rating', 'Rating', 1],
  ['resolution', 'Resolution', 1],
  ['runtime', 'Runtime', 1],
  ['title', 'Title', 0],
  ['url', 'URL', 1],
  ['year', 'Year', 1]
].map(([key, label, missingCount]) => ({
  key,
  label,
  missing_count: missingCount,
  complete_count: movies.length - missingCount
}));

const statsPayload = {
  total_movies: movies.length,
  years: 45,
  genres: 4,
  languages: 2,
  countries: 2,
  total_size: 94_000_000_000,
  average_rating: 7.4,
  average_runtime: 112,
  oldest_year: 1942,
  newest_year: 2024,
  health_score: 91,
  missing_files: 1,
  missing_posters: 2,
  incomplete_metadata: 8,
  needs_better_copy_count: 1,
  duplicate_count: 2,
  release_year_analytics: {
    dated_movies: 54,
    undated_movies: 1,
    peak_year: { year: 2016, count: 3 },
    busiest_decade: { start_year: 2010, label: '2010s', count: 18 },
    years: [
      { year: 1942, count: 1 },
      { year: 2016, count: 3 },
      { year: 2017, count: 2 }
    ],
    decades: [
      { start_year: 1940, label: '1940s', count: 1 },
      { start_year: 2010, label: '2010s', count: 18 }
    ]
  },
  genre_analytics: {
    tagged_movies: 53,
    untagged_movies: 2,
    genre_assignments: 76,
    top_genre: { label: 'Drama', count: 31 },
    genres: [
      { label: 'Drama', count: 31 },
      { label: 'Science Fiction', count: 18 },
      { label: 'Romance', count: 9 }
    ]
  },
  rating_runtime_analytics: {
    rated_movies: 54,
    unrated_movies: 1,
    runtime_known_movies: 54,
    runtime_missing_movies: 1,
    top_rating_band: { key: '7-7.9', label: '7.0–7.9', count: 24 },
    common_runtime_band: { key: '90-119', label: '90–119 min', count: 29 },
    rating_bands: [
      { key: '6-6.9', label: '6.0–6.9', count: 12 },
      { key: '7-7.9', label: '7.0–7.9', count: 24 },
      { key: '8-10', label: '8.0–10', count: 18 }
    ],
    runtime_bands: [
      { key: 'under-90', label: 'Under 90 min', count: 8 },
      { key: '90-119', label: '90–119 min', count: 29 },
      { key: '120-plus', label: '120+ min', count: 17 }
    ]
  },
  certification_analytics: {
    tagged_movies: 52,
    untagged_movies: 3,
    assignments: 52,
    top_item: { label: 'PG-13', count: 28 },
    items: [
      { label: 'PG-13', count: 28 },
      { label: 'R', count: 24 }
    ]
  },
  director_analytics: {
    tagged_movies: 53,
    untagged_movies: 2,
    assignments: 55,
    top_item: { label: 'Denis Villeneuve', count: 2 },
    items: [
      { label: 'Denis Villeneuve', count: 2 },
      { label: 'Ava Example', count: 1 }
    ]
  },
  cast_analytics: {
    tagged_movies: 53,
    untagged_movies: 2,
    cast_assignments: 159,
    unique_actors: 112,
    average_cast_size: 3,
    top_actor: { label: 'Amy Adams', count: 4 },
    top_actors: [
      { label: 'Amy Adams', count: 4 },
      { label: 'Alex Actor', count: 3 }
    ]
  },
  language_country_analytics: {
    languages: {
      tagged_movies: 54,
      untagged_movies: 1,
      assignments: 72,
      top_item: { label: 'English', count: 54 },
      items: [
        { label: 'English', count: 54 },
        { label: 'French', count: 18 }
      ]
    },
    countries: {
      tagged_movies: 54,
      untagged_movies: 1,
      assignments: 63,
      top_item: { label: 'United States', count: 45 },
      items: [
        { label: 'United States', count: 45 },
        { label: 'Canada', count: 18 }
      ]
    }
  },
  technical_format_analytics: {
    resolutions: {
      tagged_movies: 54,
      untagged_movies: 1,
      assignments: 54,
      top_item: { label: '1920x1080', count: 42 },
      items: [
        { label: '1920x1080', count: 42 },
        { label: '3840x2160', count: 12 }
      ]
    },
    audio_formats: {
      tagged_movies: 54,
      untagged_movies: 1,
      assignments: 54,
      top_item: { label: 'AAC', count: 28 },
      items: [
        { label: 'AAC', count: 28 },
        { label: 'DTS', count: 26 }
      ]
    }
  },
  storage_analytics: {
    sized_movies: 54,
    unsized_movies: 1,
    total_size: 94_000_000_000,
    average_size: 1_740_740_741,
    median_size: 1_650_000_000,
    largest_movie: { num: '55', title: 'Movie 055', size: 2_375_000_000 },
    size_bands: [
      { key: 'under-1-gb', label: 'Under 1 GB', count: 8, total_size: 6_000_000_000 },
      { key: '1-2-gb', label: '1–2 GB', count: 36, total_size: 56_000_000_000 },
      { key: '2-gb-plus', label: '2 GB+', count: 10, total_size: 32_000_000_000 }
    ]
  },
  metadata_completeness: {
    total_movies: movies.length,
    complete_movies: 47,
    incomplete_movies: 8,
    fields: metadataFields
  }
};

function issueRow(movie) {
  return {
    NUM: movie.NUM,
    FORMATTEDTITLE: movie.FORMATTEDTITLE,
    ORIGINALTITLE: movie.ORIGINALTITLE,
    YEAR: movie.YEAR,
    URL: movie.URL
  };
}

const metadataIssueRows = Object.freeze({
  description: [movies[6], movies[7], movies[8]].map(issueRow),
  cast: [movies[9], movies[10]].map(issueRow),
  director: [movies[11], movies[12]].map(issueRow)
});

function send(response, status, body, contentType) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': contentType
  });
  response.end(body);
}

function sendJson(response, payload, status = 200) {
  send(
    response,
    status,
    JSON.stringify(payload),
    'application/json; charset=utf-8'
  );
}

function compareValues(left, right) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    sensitivity: 'base',
    numeric: true
  });
}

// Helpers mirroring PHP logic for separator testing
function parseTitleSearch(value = '') {
  const original = value.toString().trim();
  const match = original.match(/\s*\(((?:19|20)\d{2})\)\s*$/);
  if (!match) return { title: original, year: null };
  return {
    title: original.replace(/\s*\((?:19|20)\d{2}\)\s*$/, '').trim(),
    year: match[1]
  };
}

function fuzzyMatch(text = '', term = '') {
  if (!text || !term) return false;
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  let idx = 0;
  for (const ch of lowerTerm) {
    idx = lowerText.indexOf(ch, idx);
    if (idx === -1) return false;
    idx++;
  }
  return true;
}

function movieResponse(url) {
  const reservedParameters = new Set(['page','limit','sort','dir','mode','fuzzy']);
  const rawFilters = [...url.searchParams.entries()].filter(([k,v])=>!reservedParameters.has(k)&&v.trim());
  const mode = url.searchParams.get('mode') === 'OR' ? 'OR' : 'AND';
  const isFuzzy = url.searchParams.get('fuzzy') === 'true';

  const titleSearchRaw = url.searchParams.get('FORMATTEDTITLE') || '';
  const { title: exactTitle } = parseTitleSearch(titleSearchRaw);

  const matchesFilter = movie => {
    if (rawFilters.length === 0) return true;
    const checks = rawFilters.map(([column, term]) => {
      const movieVal = String(movie[column] ?? '');
      if (column === 'FORMATTEDTITLE') {
        const { title, year } = parseTitleSearch(term);
        let titleMatch = true;
        let yearMatch = true;
        if (title) {
          titleMatch = isFuzzy ? fuzzyMatch(movieVal, title) : movieVal.toLowerCase().includes(title.toLowerCase());
        }
        if (year) {
          yearMatch = String(movie.YEAR ?? '') === year;
        }
        return titleMatch && yearMatch;
      } else {
        if (isFuzzy) {
          return fuzzyMatch(movieVal, term);
        } else {
          return movieVal.toLowerCase().includes(term.toLowerCase());
        }
      }
    });
    return mode === 'OR' ? checks.some(Boolean) : checks.every(Boolean);
  };

  const sort = url.searchParams.get('sort') || 'NUM';
  const direction = url.searchParams.get('dir') === 'DESC' ? -1 : 1;

  const filtered = movies
    .filter(matchesFilter)
    .toSorted((left, right) => {
      if (exactTitle) {
        const leftTitle = (left.FORMATTEDTITLE ?? '').toString().trim();
        const rightTitle = (right.FORMATTEDTITLE ?? '').toString().trim();
        const leftIsExact = leftTitle.toLowerCase() === exactTitle.toLowerCase() ? 0 : 1;
        const rightIsExact = rightTitle.toLowerCase() === exactTitle.toLowerCase() ? 0 : 1;
        if (leftIsExact !== rightIsExact) return leftIsExact - rightIsExact;
        if (isFuzzy) {
          const leftContains = leftTitle.toLowerCase().includes(exactTitle.toLowerCase()) ? 0 : 1;
          const rightContains = rightTitle.toLowerCase().includes(exactTitle.toLowerCase()) ? 0 : 1;
          if (leftContains !== rightContains) return leftContains - rightContains;
        }
      }
      return compareValues(left[sort], right[sort]) * direction;
    });

  const requestedLimit = Number(url.searchParams.get('limit')) || 50;
  const limit = Math.max(1, Math.min(100, Math.trunc(requestedLimit)));
  const pages = Math.ceil(filtered.length / limit);
  const requestedPage = Number(url.searchParams.get('page')) || 1;
  const page = pages > 0 ? Math.max(1, Math.min(pages, Math.trunc(requestedPage))) : 1;
  const start = (page - 1) * limit;

  return {
    data: filtered.slice(start, start + limit),
    page,
    limit,
    pages,
    total: filtered.length
  };
}

async function renderApplication() {
  const [stats, movie] = await Promise.all([
    readFile(path.join(viewsRoot, 'movie/stats.php'), 'utf8'),
    readFile(path.join(viewsRoot, 'movie/movie.php'), 'utf8')
  ]);

  const distDir = path.join(publicRoot, 'assets/dist');
  const hasBundleCss = existsSync(path.join(distDir, 'bundle.css'));
  const hasBundleJs = existsSync(path.join(distDir, 'bundle.js'));

  const headerCss = hasBundleCss
    ? '    <link rel="stylesheet" href="assets/dist/bundle.css">'
    : `    <link rel="stylesheet" href="assets/css/variables.css">
    <link rel="stylesheet" href="assets/css/base.css">
    <link rel="stylesheet" href="assets/css/table.css">
    <link rel="stylesheet" href="assets/css/pagination.css">
    <link rel="stylesheet" href="assets/css/modal.css">
    <link rel="stylesheet" href="assets/css/responsive.css">
    <link rel="stylesheet" href="assets/css/stats.css">`;

  const footerJs = hasBundleJs
    ? '<script type="module" src="assets/dist/bundle.js"></script>'
    : '<script type="module" src="assets/js/app.js"></script>';

  const browserHeader = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Movie Catalog</title>

${headerCss}

    <script>
        const BASE_URL = '';
    </script>
</head>
<body>
`;

  const browserFooter = `${footerJs}
</body>
</html>
`;

  return `${browserHeader}${stats}${movie}${browserFooter}`;
}

async function serveAsset(pathname, response) {
  const relativePath = pathname.replace(/^\/+/, '');
  const resolvedPath = path.resolve(publicRoot, relativePath);
  const assetRoot = path.resolve(publicRoot, 'assets');

  if (
    resolvedPath !== assetRoot &&
    !resolvedPath.startsWith(`${assetRoot}${path.sep}`)
  ) {
    send(response, 404, 'Not found', 'text/plain; charset=utf-8');
    return;
  }

  try {
    const contents = await readFile(resolvedPath);
    const contentType = contentTypes[path.extname(resolvedPath).toLowerCase()] ||
      'application/octet-stream';
    send(response, 200, contents, contentType);
  } catch {
    send(response, 404, 'Not found', 'text/plain; charset=utf-8');
  }
}

async function handleApi(url, response) {
  switch (url.pathname) {
    case '/api/movies.php':
      sendJson(response, movieResponse(url));
      return;
    case '/api/stats.php':
      sendJson(response, statsPayload);
      return;
    case '/api/library-issues.php': {
      const issueType = url.searchParams.get('type');
      if (issueType === 'metadata-field') {
        const field = url.searchParams.get('field') || '';
        sendJson(response, metadataIssueRows[field] || [movies[10]].map(issueRow));
        return;
      }
      const rows = issueType === 'missing-files'
        ? [movies[10]].map(issueRow)
        : issueType === 'missing-posters'
          ? [movies[11], movies[12]].map(issueRow)
          : [movies[6], movies[7], movies[8]].map(issueRow);
      sendJson(response, rows);
      return;
    }
    case '/api/duplicates.php':
      sendJson(response, [movies[13], movies[14]].map(issueRow));
      return;
    case '/api/better-copy.php':
      sendJson(response, [movies[15]].map(issueRow));
      return;
    case '/api/movie-page.php': {
      const num = url.searchParams.get('num');
      const index = movies.findIndex(movie => movie.NUM === num);
      sendJson(response, index === -1
        ? { found: false }
        : { found: true, page: Math.floor(index / 50) + 1 });
      return;
    }
    default:
      sendJson(response, { error: 'Unknown mock API endpoint' }, 404);
  }
}

const applicationHtml = await renderApplication();
const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || host}`);

  if (request.method !== 'GET') {
    sendJson(response, { error: 'Method not allowed' }, 405);
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.php') {
    send(response, 200, applicationHtml, 'text/html; charset=utf-8');
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    await serveAsset(url.pathname, response);
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    await handleApi(url, response);
    return;
  }

  if (url.pathname.startsWith('/movies/antexport/')) {
    send(response, 200, transparentPng, 'image/png');
    return;
  }

  send(response, 404, 'Not found', 'text/plain; charset=utf-8');
});

server.listen(port, host, () => {
  console.log(`Movie Catalog browser-test server listening on http://${host}:${port}`);
});

function shutDown() {
  server.close(error => {
    process.exitCode = error ? 1 : 0;
  });
}

process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);
