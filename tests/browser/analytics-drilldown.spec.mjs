import { test, expect } from '@playwright/test';

async function openCatalog(page) {
  await page.goto('/');
  await expect(
    page.locator('#movies tbody tr[data-num]')
  ).toHaveCount(50);
}

async function openAnalytics(page) {
  await page.locator('#stats-toggle').click();
  await expect(page.locator('#stats-panel')).toHaveClass(/show/);
  // Wait for the stats payload to render the chart slices.
  await expect(
    page.locator('#decade-distribution .stats-decade-row')
  ).toHaveCount(2);
}

function movieList(page) {
  return page.locator('.stats-modal:not(.hidden)');
}

test.describe('analytics movie lists', () => {
  test('clicking a decade row opens the movie list for that decade', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    const decadeRow = page.locator(
      '#decade-distribution .stats-decade-row',
      { hasText: '2010s' }
    );

    await expect(decadeRow).toHaveAttribute(
      'data-filter-value',
      '2010-2019'
    );

    await decadeRow.click();

    const modal = movieList(page);

    await expect(modal.locator('#stats-movie-list-title')).toHaveText(
      'Movies from the 2010s'
    );
    await expect(
      modal.locator('.stats-movie-table tbody tr')
    ).toHaveCount(13);

    // Every row carries the minimal details: title, number, year, IMDb link.
    const firstRow = modal.locator('.stats-movie-table tbody tr').first();
    await expect(firstRow.locator('td:nth-child(1)')).not.toBeEmpty();
    await expect(
      firstRow.locator('td:nth-child(2) a.jump-to-row')
    ).toBeVisible();
    await expect(firstRow.locator('td:nth-child(3)')).not.toBeEmpty();
    await expect(firstRow.locator('td:nth-child(6)')).toContainText('IMDB');

    // The list is read-only: the drawer stays open, nothing is filtered.
    await expect(page.locator('#stats-panel')).toHaveClass(/show/);
    await expect(
      page.locator('#search-row input[data-col="YEAR"]')
    ).toHaveValue('');
    await expect(
      page.locator('#filter-pills .filter-pill')
    ).toHaveCount(0);
    await expect(
      page.locator('#movies tbody tr[data-num]')
    ).toHaveCount(50);
  });

  test('the list keeps the old drill-down as a filter action', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page
      .locator('#decade-distribution .stats-decade-row', {
        hasText: '2010s'
      })
      .click();

    const modal = movieList(page);
    await expect(modal).toHaveCount(1);

    await modal.locator('.stats-movie-list-filter').click();

    // The overlay and the drawer close so the filtered table is visible.
    await expect(page.locator('.stats-modal:not(.hidden)')).toHaveCount(0);
    await expect(page.locator('#stats-panel')).toHaveClass(/hidden/);
    await expect(
      page.locator('#search-row input[data-col="YEAR"]')
    ).toHaveValue('2010-2019');
    await expect(page.locator('#pagination .info')).toHaveText(
      'Showing 1-13 of 13 results'
    );

    // The drill-down shows up as a removable filter pill.
    await expect(
      page.locator('#filter-pills .filter-pill-label')
    ).toHaveText('Year:');
  });

  test('the filter action forces AND so stacked filters stay conjunctive', async ({ page }) => {
    await openCatalog(page);

    // Start from OR mode with an unrelated title filter.
    await page.locator('#search-mode').click();
    await expect(page.locator('#search-mode')).toHaveText('OR');
    await page
      .locator('#search-row input[data-col="FORMATTEDTITLE"]')
      .fill('Arrival');
    await expect(
      page.locator('#movies tbody tr[data-num]')
    ).toHaveCount(4);

    await openAnalytics(page);

    // Opening the list leaves the OR-mode results untouched.
    await page
      .locator('#decade-distribution .stats-decade-row', {
        hasText: '2010s'
      })
      .click();
    await expect(
      page.locator('#movies tbody tr[data-num]')
    ).toHaveCount(4);

    await movieList(page).locator('.stats-movie-list-filter').click();

    await expect(page.locator('#search-mode')).toHaveText('AND');
    await expect(
      page.locator('#search-row input[data-col="FORMATTEDTITLE"]')
    ).toHaveValue('Arrival');
    await expect(
      page.locator('#search-row input[data-col="YEAR"]')
    ).toHaveValue('2010-2019');

    // Arrival (2016) and Arrival: Directors Cut (2017) only.
    const rows = page.locator('#movies tbody tr[data-num]');
    await expect(rows).toHaveCount(2);
    await expect(rows).toHaveAttribute('data-num', ['1', '4']);
  });

  test('director rows open the list with the director movies', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page
      .locator('#director-distribution .stats-origin-row', {
        hasText: 'Denis Villeneuve'
      })
      .click();

    const modal = movieList(page);

    await expect(modal.locator('#stats-movie-list-title')).toHaveText(
      'Movies directed by Denis Villeneuve'
    );
    await expect(
      modal.locator('.stats-movie-table tbody tr')
    ).toHaveCount(4);
    await expect(
      modal.locator('.stats-movie-table tbody tr[data-num="1"]')
    ).toHaveCount(1);

    // Director is a filter-only column: its filter action shows up as a
    // removable pill instead of a toolbar input.
    await modal.locator('.stats-movie-list-filter').click();

    await expect(
      page.locator('#filter-pills .filter-pill-label')
    ).toHaveText('Director:');
    await expect(
      page.locator('#filter-pills .filter-pill-value')
    ).toHaveText('Denis Villeneuve');
  });

  test('rating bands open the list with the matching range', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page
      .locator('#rating-band-distribution .stats-band-row', {
        hasText: '7.0'
      })
      .click();

    const modal = movieList(page);

    await expect(modal.locator('#stats-movie-list-title')).toHaveText(
      'Movies rated 7.0–7.9'
    );
    await expect(
      modal.locator('.stats-movie-table tbody tr')
    ).toHaveCount(21);
  });

  test('timeline years open the list for the exact year', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page
      .locator('#release-year-timeline .stats-timeline-year', {
        hasText: '2016'
      })
      .click();

    const modal = movieList(page);

    await expect(modal.locator('#stats-movie-list-title')).toHaveText(
      'Movies from 2016'
    );
    await expect(
      modal.locator('.stats-movie-table tbody tr')
    ).toHaveCount(2);
  });

  test('decade rows are keyboard operable', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    const decadeRow = page.locator(
      '#decade-distribution .stats-decade-row',
      { hasText: '1940s' }
    );

    await decadeRow.focus();
    await page.keyboard.press('Enter');

    const modal = movieList(page);

    await expect(modal.locator('#stats-movie-list-title')).toHaveText(
      'Movies from the 1940s'
    );
    await expect(
      modal.locator('.stats-movie-table tbody tr')
    ).toHaveCount(1);
  });

  test('insight cards open the same movie list', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    const card = page
      .locator('#top-director')
      .locator('xpath=ancestor::article');

    await expect(card).toHaveClass(/stat-card-action/);
    await card.click();

    const modal = movieList(page);

    await expect(modal.locator('#stats-movie-list-title')).toHaveText(
      'Movies directed by Denis Villeneuve'
    );
    await expect(
      modal.locator('.stats-movie-table tbody tr')
    ).toHaveCount(4);
  });

  test('library health cards open the same movie list', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page.locator('#missing-files-card').click();

    const modal = movieList(page);

    await expect(modal.locator('#stats-movie-list-title')).toHaveText(
      'Missing Files'
    );
    await expect(
      modal.locator('.stats-movie-table tbody tr')
    ).toHaveCount(1);

    // Minimal details: title, number, year, rating, size, IMDb link.
    const row = modal.locator('.stats-movie-table tbody tr').first();
    await expect(row.locator('td:nth-child(1)')).not.toBeEmpty();
    await expect(row.locator('td:nth-child(4) .rating-badge')).toBeVisible();
    await expect(row.locator('td:nth-child(5)')).not.toBeEmpty();
    await expect(row.locator('td:nth-child(6)')).toContainText('IMDB');

    // A library issue has no table filter, so no footer action.
    await expect(modal.locator('.stats-movie-list-filter')).toBeHidden();

    // The table stays untouched behind the list.
    await expect(
      page.locator('#movies tbody tr[data-num]')
    ).toHaveCount(50);
  });

  test('the duplicate card lists every duplicate movie', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page.locator('#duplicate-card').click();

    const modal = movieList(page);

    await expect(modal.locator('#stats-movie-list-title')).toHaveText(
      'Duplicate Movies'
    );
    await expect(
      modal.locator('.stats-movie-table tbody tr')
    ).toHaveCount(2);
    await expect(
      modal.locator('.stats-movie-table tbody tr[data-num="14"]')
    ).toHaveCount(1);
    await expect(
      modal.locator('.stats-movie-table tbody tr[data-num="15"]')
    ).toHaveCount(1);

    // Lists are ordered by No ascending, whatever the API returned.
    await expect(
      modal.locator('.stats-movie-table tbody tr .stats-movie-cell-num')
    ).toHaveText(['14', '15']);
  });

  test('the better-copy card lists the replacement movies', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page.locator('#better-copy-card').click();

    const modal = movieList(page);

    await expect(modal.locator('#stats-movie-list-title')).toHaveText(
      'Get Better Copy Movies'
    );
    await expect(
      modal.locator('.stats-movie-table tbody tr[data-num="51"]')
    ).toHaveCount(1);
  });

  test('metadata completeness fields open the missing-movies list', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page
      .locator('#metadata-completeness-fields .stats-origin-row', {
        hasText: 'Description'
      })
      .click();

    const modal = movieList(page);

    await expect(modal.locator('#stats-movie-list-title')).toHaveText(
      'Missing Description'
    );
    await expect(
      modal.locator('.stats-movie-table tbody tr')
    ).toHaveCount(3);

    // The field has no table filter, so there is no filter action.
    await expect(modal.locator('.stats-movie-list-filter')).toBeHidden();

    // The main table stays unfiltered.
    await expect(
      page.locator('#filter-pills .filter-pill')
    ).toHaveCount(0);
  });

  test('Escape closes the list and keeps the drawer open', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page
      .locator('#genre-distribution .stats-genre-row', {
        hasText: 'Romance'
      })
      .click();

    await expect(movieList(page)).toHaveCount(1);

    await page.keyboard.press('Escape');

    await expect(page.locator('.stats-modal:not(.hidden)')).toHaveCount(0);
    await expect(page.locator('#stats-panel')).toHaveClass(/show/);
  });

  test('the list No link jumps to the movie row', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page
      .locator('#decade-distribution .stats-decade-row', {
        hasText: '2010s'
      })
      .click();

    const modal = movieList(page);
    const link = modal
      .locator('.stats-movie-table tbody tr')
      .first()
      .locator('a.jump-to-row');
    const num = await link.getAttribute('data-num');

    await link.click();

    const row = page.locator(`#movies tbody tr[data-num="${num}"]`);
    await expect(row).toHaveClass(/row-selected/);
    await expect(page.locator('.stats-modal:not(.hidden)')).toHaveCount(0);
    await expect(page.locator('#stats-panel')).toHaveClass(/hidden/);
  });
});
