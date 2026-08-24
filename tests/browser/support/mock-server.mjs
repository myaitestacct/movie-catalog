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

const movies = Array.from({ length: 55 }, (_, index) => createMovie(index + 1));
movies[0] = createMovie(1, { FORMATTEDTITLE: 'Arrival', ORIGINALTITLE: 'Arrival', YEAR: '2016', RATING: '7.9', CATEGORY: 'Drama, Science Fiction', DIRECTOR: 'Denis Villeneuve', ACTORS: 'Amy Adams; Jeremy Renner; Forest Whitaker', DESCRIPTION: 'A linguist works with the military to communicate with alien lifeforms.', PICTURENAME: 'arrival.jpg' });
movies[1] = createMovie(2, { FORMATTEDTITLE: 'Blade Runner 2049', ORIGINALTITLE: 'Blade Runner 2049', YEAR: '2017', RATING: '8.0', CATEGORY: 'Drama, Science Fiction', DIRECTOR: 'Denis Villeneuve', ACTORS: 'Ryan Gosling; Harrison Ford; Ana de Armas', DESCRIPTION: 'A young blade runner uncovers a long-buried secret.', PICTURENAME: 'blade-runner-2049.jpg' });
movies[2] = createMovie(3, { FORMATTEDTITLE: 'Casablanca', ORIGINALTITLE: 'Casablanca', YEAR: '1942', RATING: '8.5', CATEGORY: 'Drama, Romance', DIRECTOR: 'Michael Curtiz', ACTORS: 'Humphrey Bogart; Ingrid Bergman; Paul Henreid', DESCRIPTION: 'A nightclub owner must choose between love and virtue.', PICTURENAME: 'casablanca.jpg' });

const metadataFields = [
  ['description', 'Description', 3], ['cast', 'Cast', 2], ['director', 'Director', 2],
  ['audio-format', 'Audio Format', 1], ['certification', 'Certification', 1],
  ['country', 'Country', 1], ['file-size', 'File Size', 1], ['languages', 'Languages', 1],
  ['rating', 'Rating', 1], ['resolution', 'Resolution', 1], ['runtime', 'Runtime', 1],
  ['title', 'Title', 0], ['url', 'URL', 1], ['year', 'Year', 1]
].map(([key, label, missingCount]) => ({
  key, label, missing_count: missingCount, complete_count: movies.length - missingCount
}));

const statsPayload = { /* ... same as before – 55 movies deterministic ... */ total_movies: movies.length, years: 45, genres: 4, languages: 2, countries: 2, total_size: 94_000_000_000, average_rating: 7.4, average_runtime: 112, oldest_year: 1942, newest_year: 2024, health_score: 91, missing_files: 1, missing_posters: 2, incomplete_metadata: 8, needs_better_copy_count: 1, duplicate_count: 2, /* analytics trimmed for brevity */ };

function issueRow(movie) { return { NUM: movie.NUM, FORMATTEDTITLE: movie.FORMATTEDTITLE, ORIGINALTITLE: movie.ORIGINALTITLE, YEAR: movie.YEAR, URL: movie.URL }; }
const metadataIssueRows = Object.freeze({ description: [movies[3], movies[4], movies[5]].map(issueRow), cast: [movies[6], movies[7]].map(issueRow), director: [movies[8], movies[9]].map(issueRow) });

function send(response, status, body, contentType) { response.writeHead(status, { 'Cache-Control': 'no-store', 'Content-Type': contentType }); response.end(body); }
function sendJson(response, payload, status = 200) { send(response, status, JSON.stringify(payload), 'application/json; charset=utf-8'); }
function compareValues(left, right) { const ln = Number(left), rn = Number(right); if (Number.isFinite(ln) && Number.isFinite(rn)) return ln - rn; return String(left ?? '').localeCompare(String(right ?? ''), undefined, { sensitivity: 'base', numeric: true }); }
function movieResponse(url) {
  const reserved = new Set(['page','limit','sort','dir','mode','fuzzy']);
  const filters = [...url.searchParams.entries()].filter(([k,v])=>!reserved.has(k)&&v.trim()).map(([k,v])=>[k,v.trim().toLocaleLowerCase()]);
  const mode = url.searchParams.get('mode')==='OR'?'OR':'AND';
  const matches = m=>{ if(filters.length===0) return true; const ms=filters.map(([col,term])=>String(m[col]??'').toLocaleLowerCase().includes(term)); return mode==='OR'?ms.some(Boolean):ms.every(Boolean); };
  const sort=url.searchParams.get('sort')||'NUM', dir=url.searchParams.get('dir')==='DESC'?-1:1;
  const filtered=movies.filter(matches).toSorted((l,r)=>compareValues(l[sort],r[sort])*dir);
  const limit=Math.max(1,Math.min(100,Math.trunc(Number(url.searchParams.get('limit'))||50)));
  const pages=Math.ceil(filtered.length/limit);
  const page=pages>0?Math.max(1,Math.min(pages,Math.trunc(Number(url.searchParams.get('page'))||1))):1;
  const start=(page-1)*limit;
  return { data: filtered.slice(start,start+limit), page, limit, pages, total: filtered.length };
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
  if (resolvedPath !== assetRoot && !resolvedPath.startsWith(`${assetRoot}${path.sep}`)) {
    send(response, 404, 'Not found', 'text/plain; charset=utf-8'); return;
  }
  try {
    const contents = await readFile(resolvedPath);
    const ct = contentTypes[path.extname(resolvedPath).toLowerCase()] || 'application/octet-stream';
    send(response, 200, contents, ct);
  } catch { send(response, 404, 'Not found', 'text/plain; charset=utf-8'); }
}

async function handleApi(url, response) {
  switch (url.pathname) {
    case '/api/movies.php': sendJson(response, movieResponse(url)); return;
    case '/api/stats.php': sendJson(response, statsPayload); return;
    case '/api/library-issues.php': {
      const issueType = url.searchParams.get('type');
      if (issueType === 'metadata-field') {
        const field = url.searchParams.get('field') || '';
        sendJson(response, metadataIssueRows[field] || [movies[10]].map(issueRow)); return;
      }
      const rows = issueType === 'missing-files' ? [movies[10]].map(issueRow) : issueType === 'missing-posters' ? [movies[11], movies[12]].map(issueRow) : [movies[3], movies[4], movies[5]].map(issueRow);
      sendJson(response, rows); return;
    }
    case '/api/duplicates.php': sendJson(response, [movies[13], movies[14]].map(issueRow)); return;
    case '/api/better-copy.php': sendJson(response, [movies[15]].map(issueRow)); return;
    case '/api/movie-page.php': {
      const num = url.searchParams.get('num');
      const idx = movies.findIndex(m => m.NUM === num);
      sendJson(response, idx === -1 ? { found: false } : { found: true, page: Math.floor(idx / 50) + 1 }); return;
    }
    default: sendJson(response, { error: 'Unknown mock API endpoint' }, 404);
  }
}

const applicationHtml = await renderApplication();
const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || host}`);
  if (request.method !== 'GET') { sendJson(response, { error: 'Method not allowed' }, 405); return; }
  if (url.pathname === '/' || url.pathname === '/index.php') { send(response, 200, applicationHtml, 'text/html; charset=utf-8'); return; }
  if (url.pathname.startsWith('/assets/')) { await serveAsset(url.pathname, response); return; }
  if (url.pathname.startsWith('/api/')) { await handleApi(url, response); return; }
  if (url.pathname.startsWith('/movies/antexport/')) { send(response, 200, transparentPng, 'image/png'); return; }
  send(response, 404, 'Not found', 'text/plain; charset=utf-8');
});

server.listen(port, host, () => { console.log(`Movie Catalog browser-test server listening on http://${host}:${port}`); });
function shutDown() { server.close(e => { process.exitCode = e ? 1 : 0; }); }
process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);
