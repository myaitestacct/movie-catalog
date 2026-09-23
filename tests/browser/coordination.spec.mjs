import { test, expect } from '@playwright/test';

async function openCatalog(page) {
  await page.goto('/');
  await expect(page.locator('#movies tbody tr[data-num]')).toHaveCount(50);
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('rapid edits retain both column filters and clear cancels pending debounce', async ({ page }) => {
  await openCatalog(page);
  const request = page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.pathname === '/api/movies.php' &&
      url.searchParams.get('FORMATTEDTITLE') === 'Arrival' &&
      url.searchParams.get('YEAR') === '2016';
  });

  // Dispatch in one task so this always exercises edits inside the 500 ms
  // debounce interval, even on a slow CI machine.
  await page.evaluate(() => {
    for (const [column, value] of [['FORMATTEDTITLE', 'Arrival'], ['YEAR', '2016']]) {
      const input = document.querySelector(`#search-row input[data-col="${column}"]`);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await request;
  await expect(page.locator('#movies tbody tr[data-num]')).toHaveCount(1);
  await expect(page.locator('#movies tbody tr[data-num]')).toHaveAttribute('data-num', '1');

  await page.evaluate(() => {
    const title = document.querySelector('#search-row input[data-col="FORMATTEDTITLE"]');
    title.value = 'Casablanca';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#clear-filters').click();
  });
  await expect(page.locator('#movies tbody tr[data-num]')).toHaveCount(50);
  await expect(page.locator('#clear-filters')).toBeDisabled();
  await expect(page.locator('#search-row input[data-col="FORMATTEDTITLE"]')).toHaveValue('');
  await expect(page.locator('#search-row input[data-col="YEAR"]')).toHaveValue('');
});

test('an obsolete response cannot overwrite the most recent search', async ({ page }) => {
  // Simulate a transport that completes an old response despite abort, proving
  // that response freshness is checked as well as forwarding AbortSignal.
  await page.addInitScript(() => {
    const fetch = window.fetch.bind(window);
    window.fetch = (url, options = {}) => fetch(url, { ...options, signal: undefined });
  });
  await openCatalog(page);
  const oldStarted = deferred();
  const releaseOld = deferred();
  await page.route('**/api/movies.php*', async route => {
    const response = await route.fetch();
    const url = new URL(route.request().url());
    if (url.searchParams.get('FORMATTEDTITLE') === 'Arrival') {
      oldStarted.resolve();
      await releaseOld.promise;
    }
    await route.fulfill({ response });
  });

  const input = page.locator('#search-row input[data-col="FORMATTEDTITLE"]');
  await input.fill('Arrival');
  await oldStarted.promise;
  await input.fill('Casablanca');
  await expect(page.locator('#movies tbody tr[data-num]')).toHaveCount(1);
  await expect(page.locator('#movies tbody tr[data-num]')).toHaveAttribute('data-num', '5');

  const oldFinished = page.waitForResponse(response =>
    new URL(response.url()).searchParams.get('FORMATTEDTITLE') === 'Arrival'
  );
  releaseOld.resolve();
  await (await oldFinished).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  await expect(page.locator('#movies tbody tr[data-num]')).toHaveCount(1);
  await expect(page.locator('#movies tbody tr[data-num]')).toHaveAttribute('data-num', '5');
  await expect(page.locator('#search-group-info')).toContainText('Casablanca');
  await expect(page.locator('#pagination .info')).toHaveText('Showing 1-1 of 1 results');
  await expect(page.locator('#movies')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.api-error')).toHaveCount(0);
});

test('an analytics link changes page, reveals the table, and highlights its movie', async ({ page }) => {
  await openCatalog(page);
  await page.locator('#stats-toggle').click();
  await page.locator('#better-copy-card').click();
  const modal = page.locator('.stats-modal:not(.hidden)');
  await modal.locator('.dup-group').click();
  await modal.locator('.jump-to-row[data-num="51"]').click();

  const row = page.locator('#movies tbody tr[data-num="51"]');
  await expect(page.locator('#pagination select')).toHaveValue('2');
  await expect(row).toHaveClass(/row-highlight/);
  await expect(row.locator('.movie-title-link')).toBeFocused();
  await expect(page.locator('.stats-modal:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('#stats-panel')).toHaveClass(/hidden/);
});

test('File matches literal filename text, not fuzzy letters or a hidden folder', async ({ page }) => {
  await openCatalog(page);
  await page.locator('.toggle-col[data-col="FILEPATH"]').click();
  const fileInput = page.locator('#search-row input[data-col="FILEPATH"]');
  await expect(page.locator('#title-search-mode')).toHaveValue('FUZZY');
  await fileInput.fill('missing');

  const rows = page.locator('#movies tbody tr[data-num]');
  await expect(rows).toHaveCount(2);
  await expect(page.locator('#movies tbody .file-name')).toHaveText(['MISSING', 'Missing.Pieces.mkv']);
  await expect(page.locator('#movies tbody .file-name mark')).toHaveText(['MISSING', 'Missing']);
  await expect(page.locator('#movies tbody tr[data-num="17"]')).toHaveCount(0); // Mission.Spring
  await expect(page.locator('#movies tbody tr[data-num="18"]')).toHaveCount(0); // hidden /missing/ folder

  await fileInput.fill('%_=');
  await expect(rows).toHaveCount(1);
  await expect(rows).toHaveAttribute('data-num', '20');
  await expect(page.locator('#movies tbody .file-name mark')).toHaveText('%_=');

  await page.locator('#clear-filters').click();
  await page.locator('.toggle-col[data-col="PATH"]').click();
  await page.locator('#search-row input[data-col="PATH"]').fill('missing');
  await expect(rows).toHaveCount(1);
  await expect(rows).toHaveAttribute('data-num', '18');
});

test('OR may include rows matching another filter without marking File as a match', async ({ page }) => {
  await openCatalog(page);
  await page.locator('.toggle-col[data-col="FILEPATH"]').click();
  await page.locator('#title-search-mode').selectOption('EXACT');
  await page.locator('#search-mode').click();
  await page.locator('#search-row input[data-col="FORMATTEDTITLE"]').fill('Arrival');
  await page.locator('#search-row input[data-col="FILEPATH"]').fill('missing');

  await expect(page.locator('#movies tbody tr[data-num]')).toHaveCount(3);
  await expect(page.locator('tr[data-num="1"] .file-name')).toHaveText('arrival.mkv');
  await expect(page.locator('tr[data-num="1"] .file-name mark')).toHaveCount(0);
  await expect(page.locator('#movies tbody .file-name mark')).toHaveCount(2);
});

test('repeating a jump while its page is loading still highlights the destination', async ({ page }) => {
  await page.addInitScript(() => {
    const fetch = window.fetch.bind(window);
    window.fetch = (url, options = {}) => fetch(url, { ...options, signal: undefined });
  });
  await openCatalog(page);
  const firstLoadStarted = deferred();
  const releaseFirstLoad = deferred();
  let pageLoads = 0;
  await page.route('**/api/movies.php*', async route => {
    const response = await route.fetch();
    if (new URL(route.request().url()).searchParams.get('page') === '2' && ++pageLoads === 1) {
      firstLoadStarted.resolve();
      await releaseFirstLoad.promise;
    }
    await route.fulfill({ response });
  });

  try {
    await page.locator('#stats-toggle').click();
    await page.locator('#better-copy-card').click();
    const modal = page.locator('.stats-modal:not(.hidden)');
    await modal.locator('.dup-group').click();
    const link = modal.locator('.jump-to-row[data-num="51"]');
    await link.click();
    await firstLoadStarted.promise;
    await link.click();

    await expect(page.locator('#movies tr[data-num="51"]')).toHaveClass(/row-highlight/);
    await expect(page.locator('#movies tr[data-num="51"] .movie-title-link')).toBeFocused();
    await expect(page.locator('.stats-modal:not(.hidden)')).toHaveCount(0);
    expect(pageLoads).toBe(2);
  } finally {
    releaseFirstLoad.resolve();
  }
});
