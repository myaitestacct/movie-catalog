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

test.describe('analytics drill-down', () => {
  test('clicking a decade row filters the table to that decade', async ({ page }) => {
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

    // The drawer closes so the filtered table is visible.
    await expect(page.locator('#stats-panel')).toHaveClass(/hidden/);
    await expect(
      page.locator('#search-row input[data-col="YEAR"]')
    ).toHaveValue('2010-2019');
    await expect(page.locator('#pagination .info')).toHaveText(
      'Showing 1-13 of 13 results'
    );
    await expect(page.locator('.api-error')).toHaveCount(0);

    // The drill-down shows up as a removable filter pill.
    await expect(
      page.locator('#filter-pills .filter-pill')
    ).toHaveCount(1);
    await expect(
      page.locator('#filter-pills .filter-pill-label')
    ).toHaveText('Year:');

    // Every returned row is inside the clicked decade.
    const years = await page
      .locator('#movies tbody tr[data-num]')
      .evaluateAll(rows =>
        rows.map(row =>
          Number(row.querySelector('td:nth-child(3)').textContent)
        )
      );

    expect(years.length).toBeGreaterThan(0);

    for (const year of years) {
      expect(year).toBeGreaterThanOrEqual(2010);
      expect(year).toBeLessThanOrEqual(2019);
    }
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

    await expect(
      page.locator('#search-row input[data-col="YEAR"]')
    ).toHaveValue('1940-1949');
    await expect(page.locator('#pagination .info')).toHaveText(
      'Showing 1-1 of 1 results'
    );
    await expect(
      page.locator('#movies tbody tr[data-num]')
    ).toHaveAttribute('data-num', '5');
  });

  test('clicking a director row filters the table by director', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await expect(
      page.locator('#director-distribution .stats-origin-row')
    ).not.toHaveCount(0);

    await page
      .locator('#director-distribution .stats-origin-row', {
        hasText: 'Denis Villeneuve'
      })
      .click();

    await expect(page.locator('#stats-panel')).toHaveClass(/hidden/);

    const rows = page.locator('#movies tbody tr[data-num]');
    await expect(rows).toHaveCount(4);
    await expect(rows).toHaveAttribute('data-num', ['1', '2', '4', '6']);

    // Directors have no table column, so the pill carries the label...
    await expect(
      page.locator('#filter-pills .filter-pill-label')
    ).toHaveText('Director:');
    await expect(
      page.locator('#filter-pills .filter-pill-value')
    ).toHaveText('Denis Villeneuve');

    // ...and removing the pill restores the unfiltered catalog.
    await page
      .locator('#filter-pills .filter-pill button')
      .click();

    await expect(page.locator('#pagination .info')).toHaveText(
      'Showing 1-50 of 55 results'
    );
    await expect(
      page.locator('#filter-pills .filter-pill')
    ).toHaveCount(0);
  });

  test('clicking a rating band applies the matching rating range', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page
      .locator('#rating-band-distribution .stats-band-row', {
        hasText: '7.0–7.9'
      })
      .click();

    await expect(
      page.locator('#search-row input[data-col="RATING"]')
    ).toHaveValue('7-7.9');
    await expect(page.locator('#pagination .info')).toHaveText(
      'Showing 1-21 of 21 results'
    );
  });

  test('clicking a timeline year filters to that exact year', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page
      .locator('#release-year-timeline .stats-timeline-year', {
        hasText: '2016'
      })
      .click();

    await expect(
      page.locator('#search-row input[data-col="YEAR"]')
    ).toHaveValue('2016');
    await expect(page.locator('#pagination .info')).toHaveText(
      'Showing 1-2 of 2 results'
    );
  });

  test('clicking a genre row filters the Genre column', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page
      .locator('#genre-distribution .stats-genre-row', {
        hasText: 'Romance'
      })
      .click();

    await expect(
      page.locator('#search-row input[data-col="CATEGORY"]')
    ).toHaveValue('Romance');
    await expect(page.locator('#pagination .info')).toHaveText(
      'Showing 1-1 of 1 results'
    );
    await expect(
      page.locator('#movies tbody tr[data-num]')
    ).toHaveAttribute('data-num', '5');
  });

  test('clicking the top director insight card filters by director', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    const card = page
      .locator('#top-director')
      .locator('xpath=ancestor::article');

    await expect(card).toHaveClass(/stat-card-action/);
    await card.click();

    await expect(
      page.locator('#movies tbody tr[data-num]')
    ).toHaveCount(4);
    await expect(
      page.locator('#filter-pills .filter-pill-value')
    ).toHaveText('Denis Villeneuve');
  });

  test('drill-down forces AND so stacked filters stay conjunctive', async ({ page }) => {
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

    await page
      .locator('#decade-distribution .stats-decade-row', {
        hasText: '2010s'
      })
      .click();

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

  test('metadata completeness keeps its missing-movies modal', async ({ page }) => {
    await openCatalog(page);
    await openAnalytics(page);

    await page
      .locator('#metadata-completeness-fields .stats-origin-row', {
        hasText: 'Description'
      })
      .click();

    const modal = page.locator('.stats-modal:not(.hidden)');
    await expect(modal).toHaveCount(1);
    await expect(
      modal.locator('#library-issue-title')
    ).toHaveText('Missing Description');

    // The main table stays unfiltered.
    await expect(
      page.locator('#filter-pills .filter-pill')
    ).toHaveCount(0);
  });
});
