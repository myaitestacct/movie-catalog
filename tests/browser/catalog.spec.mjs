import { test, expect } from '@playwright/test';

async function openCatalog(page) {
  await page.goto('/');
  await expect(page.locator('#movies tbody tr[data-num]').first()).toBeVisible();
}

test.describe('movie catalog', () => {
  test('renders the first page and navigates to the final page', async ({ page }) => {
    await openCatalog(page);

    const movieRows = page.locator('#movies tbody tr[data-num]');
    await expect(movieRows).toHaveCount(50);
    await expect(page.locator('#pagination .info')).toHaveText(
      'Showing 1-50 of 55 results'
    );
    await expect(page.locator('#pagination select')).toHaveValue('1');

    await page.getByRole('button', { name: '>', exact: true }).click();

    await expect(movieRows).toHaveCount(5);
    await expect(movieRows.first()).toHaveAttribute('data-num', '51');
    await expect(page.locator('#pagination .info')).toHaveText(
      'Showing 51-55 of 55 results'
    );
    await expect(page.locator('#pagination select')).toHaveValue('2');
  });

  test('debounces title filtering and separates exact from fuzzy matches', async ({ page }) => {
    await openCatalog(page);

    const titleInput = page.locator(
      '#search-row input[data-col="FORMATTEDTITLE"]'
    );
    await titleInput.fill('Arrival');

    await expect(page.locator('#movies tbody .exact-header')).toHaveCount(1);
    await expect(page.locator('#movies tbody .fuzzy-header')).toHaveCount(1);
    await expect(page.locator('#movies tbody tr[data-match-type="exact"]'))
      .toHaveCount(1);
    await expect(page.locator('#movies tbody tr[data-match-type="fuzzy"]'))
      .toHaveCount(3);
    await expect(page.locator('#pagination .info')).toHaveText(
      'Showing 1-4 of 4 results'
    );
    await expect(page.locator('tr[data-num="1"] mark')).toHaveCount(1);
  });

  test('identifies an exact-only title result as an exact match', async ({ page }) => {
    await openCatalog(page);

    await page.locator(
      '#search-row input[data-col="FORMATTEDTITLE"]'
    ).fill('Casablanca');

    await expect(page.locator('#movies tbody .exact-header')).toHaveCount(1);
    await expect(page.locator('#movies tbody .fuzzy-header')).toHaveCount(0);
    await expect(
      page.locator('#movies tbody tr[data-match-type="exact"]')
    ).toHaveCount(1);
    await expect(page.locator('#search-group-info')).toHaveClass(
      /search-group-info/
    );
  });

  test('opens movie details, supports keyboard navigation, and restores focus', async ({ page }) => {
    await openCatalog(page);

    const titleLink = page.locator('tr[data-num="1"] .movie-title-link');
    await titleLink.click();

    const modal = page.locator('#movieModal');
    await expect(modal).toHaveClass(/open/);
    await expect(modal).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#modalTitle')).toHaveText('Arrival');
    await expect(page.locator('#modalDescription')).toContainText('linguist');
    await expect(page.locator('#modalPoster')).toHaveAttribute(
      'src',
      /\/movies\/antexport\/arrival\.jpg$/
    );
    await expect(page.locator('.table-wrapper')).toHaveAttribute(
      'aria-hidden',
      'true'
    );

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#modalTitle')).toHaveText('Arrival 2');

    await page.keyboard.press('Escape');
    await expect(modal).toHaveAttribute('aria-hidden', 'true');
    await expect(titleLink).toBeFocused();
  });

  test('renders analytics and opens a library issue drill-down', async ({ page }) => {
    await openCatalog(page);

    await page.getByRole('button', { name: /Analytics/ }).click();

    const statsPanel = page.locator('#stats-panel');
    await expect(statsPanel).toHaveClass(/show/);
    await expect(page.locator('#total-movies')).toHaveText('55');
    await expect(page.locator('#top-genre')).toHaveText('Drama');
    await expect(page.locator('#health-score')).toHaveText('91/100');

    await page.locator('#missing-files-card').click();

    const issueModal = page.locator('#library-issue-title');
    await expect(issueModal).toHaveText('Missing Files');
    await expect(page.locator('#library-issue-pagination')).toContainText(
      'Page 1 of 1 • 1 movie'
    );

    await page.locator('.stats-modal:not(.hidden) .stats-close').click();
    await expect(issueModal).toBeHidden();
  });

  test('persists theme and optional-column preferences', async ({ page }) => {
    await openCatalog(page);

    const themeToggle = page.locator('#theme-toggle');
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/theme-dark/);

    const lengthHeader = page.locator('#movies th[data-col="LENGTH"]');
    await expect(lengthHeader).toBeHidden();
    await page.locator('.toggle-col[data-col="LENGTH"]').click();
    await expect(lengthHeader).toBeVisible();
    await expect(
      page.locator('.toggle-col[data-col="LENGTH"]')
    ).toHaveAttribute('aria-pressed', 'true');

    await page.reload();

    await expect(page.locator('html')).toHaveClass(/theme-dark/);
    await expect(page.locator('#movies th[data-col="LENGTH"]')).toBeVisible();
    await expect(
      page.locator('.toggle-col[data-col="LENGTH"]')
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('shows an API error and recovers with retry', async ({ page }) => {
    let movieRequestCount = 0;

    await page.route('**/api/movies.php*', async route => {
      movieRequestCount++;

      if (movieRequestCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: true,
            message: 'Mock movie failure'
          })
        });
        return;
      }

      await route.continue();
    });

    await page.goto('/');

    const error = page.locator('.api-error[data-error-scope="movies"]');
    await expect(error).toContainText('Mock movie failure');
    await error.getByRole('button', { name: 'Retry' }).click();

    await expect(page.locator('#movies tbody tr[data-num]').first())
      .toBeVisible();
    await expect(error).toHaveCount(0);
    expect(movieRequestCount).toBe(2);
  });
});
