import { test, expect } from '@playwright/test';

async function openCatalog(page) {
  await page.goto('/');

  await expect(
    page.locator(
      '#movies tbody tr[data-num]'
    ).first()
  ).toBeVisible();
}

const moviesApi = request =>
  request.url().includes('/api/movies.php');

test.describe('hidden archive table (paripakva)', () => {
  test('Ctrl+Shift+K switches the catalog between movies and paripakva and back', async ({ page }) => {
    await openCatalog(page);

    const indicator = page.locator('#archive-indicator');
    const firstTitle = page.locator(
      '#movies tbody tr[data-num] .movie-title-link'
    ).first();
    const sourceBadges = page.locator(
      '#movies tbody tr[data-num] .source-badge'
    );

    // The main movies table is the default view; the archive entry is hidden.
    await expect(indicator).toBeHidden();
    await expect(firstTitle).toHaveText('Arrival');
    await expect(sourceBadges).toHaveCount(0);

    // Switch to the hidden archive collection.
    const archiveRequest = page.waitForRequest(
      request =>
        moviesApi(request) &&
        new URL(request.url()).searchParams.get(
          'archive'
        ) === '1'
    );

    await page.keyboard.press('Control+Shift+K');
    await archiveRequest;

    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText('Paripakva archive');
    await expect(firstTitle).toContainText('Paripakva Title 1');
    await expect(sourceBadges.first()).toContainText('Paripakva');
    await expect(sourceBadges.first()).toBeVisible();

    // Archive posters load from the paripakva export tree, not antexport.
    const archivePoster = page.locator(
      '#movies tbody tr[data-num] img.row-poster'
    ).first();
    await expect(archivePoster).toHaveAttribute(
      'src',
      /\/movies_template\/paripakva\//
    );

    // A transient toast names the collection now in view.
    await expect(
      page.locator('.archive-toast.is-visible')
    ).toBeVisible();

    // The analytics request follows the same source table.
    const archiveStatsRequest = page.waitForRequest(
      request =>
        request.url().includes('/api/stats.php') &&
        new URL(request.url()).searchParams.get(
          'archive'
        ) === '1'
    );

    await page.locator('#stats-toggle').click();
    await archiveStatsRequest;

    // Switching back restores the default movies view.
    const defaultRequest = page.waitForRequest(
      request =>
        moviesApi(request) &&
        new URL(request.url()).searchParams.get(
          'archive'
        ) === null
    );

    await page.keyboard.press('Control+Shift+K');
    await defaultRequest;

    await expect(indicator).toBeHidden();
    await expect(firstTitle).toHaveText('Arrival');
    await expect(sourceBadges).toHaveCount(0);

    // Back in the main library, posters use the antexport tree again.
    await expect(
      page.locator(
        '#movies tbody tr[data-num] img.row-poster'
      ).first()
    ).toHaveAttribute(
      'src',
      /\/movies\/antexport\//
    );
  });

  test('the archive shortcut also works while a filter input is focused', async ({ page }) => {
    await openCatalog(page);

    const titleInput = page.locator(
      '#search-row input[data-col="FORMATTEDTITLE"]'
    );
    await titleInput.focus();

    const archiveRequest = page.waitForRequest(
      request =>
        moviesApi(request) &&
        new URL(request.url()).searchParams.get(
          'archive'
        ) === '1'
    );

    await page.keyboard.press('Control+Shift+K');
    await archiveRequest;

    await expect(
      page.locator('#archive-indicator')
    ).toBeVisible();
    await expect(
      page.locator(
        '#movies tbody tr[data-num] .movie-title-link'
      ).first()
    ).toContainText('Paripakva Title 1');
  });

  test('archive rows render with source badges in grid view too', async ({ page }) => {
    await openCatalog(page);

    await page.keyboard.press('Control+Shift+K');
    await expect(
      page.locator('#archive-indicator')
    ).toBeVisible();

    await page.locator('#view-grid').click();

    const cardBadges = page.locator(
      '#grid-view .movie-card .source-badge'
    );
    await expect(cardBadges.first()).toBeVisible();
    await expect(cardBadges.first()).toContainText('Paripakva');

    // Grid posters follow the same per-collection path convention.
    await expect(
      page.locator('#grid-view .movie-card-poster img').first()
    ).toHaveAttribute(
      'src',
      /\/movies_template\/paripakva\//
    );

    // Toggle back while the grid stays open: the re-rendered default
    // collection carries no source markers.
    await page.keyboard.press('Control+Shift+K');
    await expect(
      page.locator('#archive-indicator')
    ).toBeHidden();
    await expect(cardBadges).toHaveCount(0);
  });
});
