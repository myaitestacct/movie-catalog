import { test, expect } from '@playwright/test';

async function openCatalog(page) {
  await page.goto('/');

  await expect(
    page.locator(
      '#movies tbody tr[data-num]'
    ).first()
  ).toBeVisible();
}

test.describe('movie catalog', () => {
  test(
    'renders the first page and navigates to the final page',
    async ({ page }) => {
      await openCatalog(page);

      // Fuzzy grouping is no longer the default: opt in explicitly.
      await page.locator('#title-search-mode').selectOption('FUZZY');

      const movieRows =
        page.locator(
          '#movies tbody tr[data-num]'
        );

      await expect(movieRows).toHaveCount(50);

      await expect(
        page.locator('#pagination .info')
      ).toHaveText(
        'Showing 1-50 of 55 results'
      );

      await expect(
        page.locator('#pagination select')
      ).toHaveValue('1');

      await page.getByRole(
        'button',
        {
          name: '>',
          exact: true
        }
      ).click();

      await expect(movieRows).toHaveCount(5);

      await expect(
        movieRows.first()
      ).toHaveAttribute(
        'data-num',
        '51'
      );

      await expect(
        page.locator('#pagination .info')
      ).toHaveText(
        'Showing 51-55 of 55 results'
      );

      await expect(
        page.locator('#pagination select')
      ).toHaveValue('2');
    }
  );

  test(
    'shows the title-mode control appropriate to each sidebar mode',
    async ({ page }) => {
      await page.setViewportSize({ width: 600, height: 600 });
      await openCatalog(page);

      const dropdown = page.locator('#title-search-mode');
      const badgeButton = page.locator('#title-search-mode-btn');
      const sidebarContent = page.locator('.sidebar-content');

      const expectSidebarToFit = async () => {
        const { scrollHeight, clientHeight } = await sidebarContent.evaluate(element => ({
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight
        }));
        expect(scrollHeight).toBeLessThanOrEqual(clientHeight);
      };

      await expect(dropdown).toBeVisible();
      await expect(badgeButton).toBeHidden();
      await expectSidebarToFit();

      // At the narrow full-sidebar width, the Controls label must retain its
      // own space rather than being clipped beside the icon.
      const headerLayout = await page.locator('.sidebar-header').evaluate(header => {
        const title = header.querySelector('.sidebar-header-title');
        const icon = title.querySelector('i');
        const label = title.querySelector('.sidebar-label');
        const modeSelector = header.querySelector('.sidebar-mode-selector');
        const range = document.createRange();
        range.selectNodeContents(label);

        return {
          label: label.textContent.trim(),
          iconRight: icon.getBoundingClientRect().right,
          labelLeft: range.getBoundingClientRect().left,
          labelRight: range.getBoundingClientRect().right,
          modesLeft: modeSelector.getBoundingClientRect().left
        };
      });

      expect(headerLayout.label).toBe('Controls');
      expect(headerLayout.labelLeft).toBeGreaterThanOrEqual(headerLayout.iconRight);
      expect(headerLayout.labelRight).toBeLessThanOrEqual(headerLayout.modesLeft);

      await page.locator('[data-sidebar-mode="partial"]').click();
      await expect(dropdown).toBeHidden();
      await expect(badgeButton).toBeVisible();
      await expectSidebarToFit();

      await page.locator('#sidebar-header-expand-btn').click();
      await expect(dropdown).toBeVisible();
      await expect(badgeButton).toBeHidden();
    }
  );

  test(
    'debounces title filtering and separates exact from fuzzy matches',
    async ({ page }) => {
      await openCatalog(page);

      const titleInput =
        page.locator(
          '#search-row input[data-col="FORMATTEDTITLE"]'
        );

      await titleInput.fill('Arrival');

      await expect(
        page.locator(
          '#movies tbody .exact-header'
        )
      ).toHaveCount(1);

      await expect(
        page.locator(
          '#movies tbody .fuzzy-header'
        )
      ).toHaveCount(1);

      await expect(
        page.locator(
          '#movies tbody tr[data-match-type="exact"]'
        )
      ).toHaveCount(1);

      await expect(
        page.locator(
          '#movies tbody tr[data-match-type="fuzzy"]'
        )
      ).toHaveCount(3);

      await expect(
        page.locator('#pagination .info')
      ).toHaveText(
        'Showing 1-4 of 4 results'
      );

      await expect(
        page.locator(
          'tr[data-num="1"] mark'
        )
      ).toHaveCount(1);
    }
  );

  test(
    'identifies an exact-only title result as an exact match',
    async ({ page }) => {
      await openCatalog(page);

      await page.locator(
        '#search-row input[data-col="FORMATTEDTITLE"]'
      ).fill('Casablanca');

      await expect(
        page.locator(
          '#movies tbody .exact-header'
        )
      ).toHaveCount(1);

      await expect(
        page.locator(
          '#movies tbody .fuzzy-header'
        )
      ).toHaveCount(0);

      await expect(
        page.locator(
          '#movies tbody tr[data-match-type="exact"]'
        )
      ).toHaveCount(1);

      await expect(
        page.locator('#search-group-info')
      ).toHaveClass(
        /search-group-info/
      );

      await expect(
        page.locator('#search-group-info')
      ).toContainText(
        '1 exact match for "Casablanca"'
      );

      await expect(
        page.locator('#search-group-info')
      ).toContainText(
        'No additional matches'
      );
    }
  );

  test(
    'title search mode controls exact, contains, and fuzzy matching',
    async ({ page }) => {
      await openCatalog(page);

      const mode =
        page.locator(
          '#title-search-mode'
        );

      const titleInput =
        page.locator(
          '#search-row input[data-col="FORMATTEDTITLE"]'
        );

      await mode.selectOption('EXACT');
      await titleInput.fill('Arrival');

      await expect(
        page.locator(
          '#movies tbody tr[data-match-type="exact"]'
        )
      ).toHaveCount(1);

      await expect(
        page.locator(
          '#movies tbody tr[data-match-type="fuzzy"]'
        )
      ).toHaveCount(0);

      await expect(
        page.locator(
          '#movies tbody .exact-header .group-header-title'
        )
      ).toHaveText(
        'Exact Matches (1) for "Arrival"'
      );

      await mode.selectOption('CONTAINS');

      await expect(
        page.locator(
          '#movies tbody tr[data-match-type="exact"]'
        )
      ).toHaveCount(1);

      await expect(
        page.locator(
          '#movies tbody tr[data-match-type="fuzzy"]'
        )
      ).toHaveCount(3);

      await expect(
        page.locator(
          '#movies tbody .fuzzy-header .group-header-title'
        )
      ).toHaveText(
        'Contains Matches (3)'
      );

      await mode.selectOption('FUZZY');

      await expect(
        page.locator(
          '#movies tbody .fuzzy-header .group-header-title'
        )
      ).toHaveText(
        'Fuzzy Matches (3)'
      );
    }
  );

  test(
    'clears all search filters with the global control',
    async ({ page }) => {
      await openCatalog(page);

      const titleInput =
        page.locator(
          '#search-row input[data-col="FORMATTEDTITLE"]'
        );

      const clearAll =
        page.locator('#clear-filters');

      await expect(
        page.locator(
          '#search-row .clear-search'
        )
      ).toHaveCount(0);

      await titleInput.fill('Arrival');

      await expect(
        clearAll
      ).toBeEnabled();

      await clearAll.click();

      await expect(
        titleInput
      ).toHaveValue('');

      await expect(
        clearAll
      ).toBeDisabled();

      await expect(
        page.locator('#pagination .info')
      ).toHaveText(
        'Showing 1-50 of 55 results'
      );
    }
  );

  test(
    'shows all optional columns without horizontal scrolling',
    async ({ page }) => {
      await openCatalog(page);

      const bulkToggle =
        page.locator(
          '.toggle-all-columns'
        );

      // The mini posters count as visible content, so a fresh page offers
      // "Hide All" even though no optional column is showing yet.
      await expect(bulkToggle).toHaveText('Hide All');

      await bulkToggle.click();

      await expect(bulkToggle).toHaveText('Show All');

      await bulkToggle.click();

      await expect(
        page.locator(
          '#movies thead tr:first-child th:visible'
        )
      ).toHaveCount(13);

      await expect(
        page.locator('.table-wrapper')
      ).toHaveCSS(
        'overflow-x',
        'hidden'
      );

      const overflow = await page.locator('.table-wrapper').evaluate(
        el => el.scrollWidth - el.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  );

  test(
    'opens movie details, supports keyboard navigation, and restores focus',
    async ({ page }) => {
      await openCatalog(page);

      const titleLink =
        page.locator(
          'tr[data-num="1"] .movie-title-link'
        );

      await titleLink.click();

      const modal =
        page.locator('#movieModal');

      await expect(
        modal
      ).toHaveClass(/open/);

      await expect(
        modal
      ).toHaveAttribute(
        'aria-hidden',
        'false'
      );

      await expect(
        page.locator('#modalTitle')
      ).toHaveText(
        'Arrival'
      );

      await expect(
        page.locator('#modalDescription')
      ).toContainText(
        'linguist'
      );

      await expect(
        page.locator('#modalPoster')
      ).toHaveAttribute(
        'src',
        /\/movies\/antexport\/arrival\.jpg$/
      );

      await expect(
        page.locator('.table-wrapper')
      ).toHaveAttribute(
        'aria-hidden',
        'true'
      );

      await page.keyboard.press(
        'ArrowRight'
      );

      await expect(
        page.locator('#modalTitle')
      ).toHaveText(
        'Arrival 2'
      );

      await page.keyboard.press(
        'Escape'
      );

      await expect(
        modal
      ).toHaveAttribute(
        'aria-hidden',
        'true'
      );

      await expect(
        titleLink
      ).toBeFocused();
    }
  );

  test(
    'confirms before modal navigation wraps around the result set',
    async ({ page }) => {
      await openCatalog(page);

      await page.locator(
        'tr[data-num="50"] .movie-title-link'
      ).click();

      await expect(
        page.locator('#modalTitle')
      ).toHaveText(
        'Movie 050'
      );

      const nextButton =
        page.getByRole(
          'button',
          {
            name: 'Next movie'
          }
        );

      const dismissDialog =
        page.waitForEvent('dialog').then(
          async dialog => {
            expect(dialog.type()).toBe(
              'confirm'
            );

            expect(dialog.message()).toBe(
              'You are viewing the last movie. Continue to the first movie?'
            );

            await dialog.dismiss();
          }
        );

      await Promise.all([
        dismissDialog,
        nextButton.click()
      ]);

      await expect(
        page.locator('#modalTitle')
      ).toHaveText(
        'Movie 050'
      );

      const acceptDialog =
        page.waitForEvent('dialog').then(
          async dialog => {
            expect(dialog.type()).toBe(
              'confirm'
            );

            await dialog.accept();
          }
        );

      await Promise.all([
        acceptDialog,
        nextButton.click()
      ]);

      await expect(
        page.locator('#modalTitle')
      ).toHaveText(
        'Arrival'
      );
    }
  );

  test(
    'renders analytics and opens a library issue drill-down',
    async ({ page }) => {
      await openCatalog(page);

      await page.getByRole(
        'button',
        {
          name: /Analytics/
        }
      ).click();

      const statsPanel =
        page.locator('#stats-panel');

      await expect(
        statsPanel
      ).toHaveClass(/show/);

      await expect(
        page.locator('#total-movies')
      ).toHaveText(
        '55'
      );

      await expect(
        page.locator('#top-genre')
      ).toHaveText(
        'Drama'
      );

      await expect(
        page.locator('#health-score')
      ).toHaveText(
        '91/100'
      );

      await page.locator(
        '#missing-files-card'
      ).click();

      const issueModal =
        page.locator(
          '#library-issue-title'
        );

      await expect(
        issueModal
      ).toHaveText(
        'Missing Files'
      );

      await expect(
        page.locator(
          '#library-issue-pagination'
        )
      ).toContainText(
        'Page 1 of 1 • 1 movie'
      );

      await page.locator(
        '.stats-modal:not(.hidden) .stats-close'
      ).click();

      await expect(
        issueModal
      ).toBeHidden();
    }
  );

  test(
    'persists theme and optional-column preferences',
    async ({ page }) => {
      await openCatalog(page);

      const themeToggle =
        page.locator('#theme-toggle');

      // The toggle belongs to the sidebar header: top of the left panel and
      // outside the scrollable body, so it stays reachable at any scroll
      // position and in every sidebar display mode.
      await expect(
        page.locator('.sidebar-header #theme-toggle')
      ).toHaveCount(1);

      await expect(
        themeToggle
      ).toBeVisible();

      await expect(
        themeToggle.locator('.sidebar-label')
      ).toHaveText('Theme');

      await themeToggle.click();

      await expect(
        page.locator('html')
      ).toHaveClass(/theme-dark/);

      const lengthHeader =
        page.locator(
          '#movies th[data-col="LENGTH"]'
        );

      await expect(
        lengthHeader
      ).toBeHidden();

      await page.locator(
        '.toggle-col[data-col="LENGTH"]'
      ).click();

      await expect(
        lengthHeader
      ).toBeVisible();

      await expect(
        page.locator(
          '.toggle-col[data-col="LENGTH"]'
        )
      ).toHaveAttribute(
        'aria-pressed',
        'true'
      );

      await page.reload();

      await expect(
        page.locator('html')
      ).toHaveClass(/theme-dark/);

      await expect(
        page.locator(
          '#movies th[data-col="LENGTH"]'
        )
      ).toBeVisible();

      await expect(
        page.locator(
          '.toggle-col[data-col="LENGTH"]'
        )
      ).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    }
  );

  test(
    'toggles the mini poster thumbnails and remembers the choice',
    async ({ page }) => {
      await openCatalog(page);

      const posterChip =
        page.locator('#toggle-mini-poster');

      const posters =
        page.locator('#movies tbody .row-poster');

      await expect(posterChip).toHaveAttribute(
        'aria-pressed',
        'true'
      );

      await expect(posters.first()).toBeVisible();

      await posterChip.click();

      await expect(
        page.locator('html')
      ).toHaveClass(/hide-mini-posters/);

      await expect(posters.first()).toBeHidden();

      await expect(posterChip).toHaveAttribute(
        'aria-pressed',
        'false'
      );

      // Rows rendered later inherit the preference: the class lives on <html>,
      // not on the rows that existed when the chip was clicked.
      await page.getByRole(
        'button',
        {
          name: '>',
          exact: true
        }
      ).click();

      await expect(
        page.locator(
          '#movies tbody .row-poster'
        ).first()
      ).toBeHidden();

      await page.reload();

      await expect(
        page.locator('html')
      ).toHaveClass(/hide-mini-posters/);

      await expect(posterChip).toHaveAttribute(
        'aria-pressed',
        'false'
      );

      await posterChip.click();

      await expect(
        page.locator('html')
      ).not.toHaveClass(/hide-mini-posters/);

      await expect(
        page.locator(
          '#movies tbody .row-poster'
        ).first()
      ).toBeVisible();
    }
  );

  test(
    'Hide All / Show All covers the mini posters too',
    async ({ page }) => {
      await openCatalog(page);

      const bulkToggle =
        page.locator(
          '.toggle-all-columns'
        );

      const posterChip =
        page.locator('#toggle-mini-poster');

      await bulkToggle.click();

      await expect(
        page.locator('html')
      ).toHaveClass(/hide-mini-posters/);

      await expect(posterChip).toHaveAttribute(
        'aria-pressed',
        'false'
      );

      await expect(bulkToggle).toHaveText('Show All');

      await bulkToggle.click();

      await expect(
        page.locator('html')
      ).not.toHaveClass(/hide-mini-posters/);

      await expect(posterChip).toHaveAttribute(
        'aria-pressed',
        'true'
      );

      await expect(
        page.locator(
          '#movies tbody .row-poster'
        ).first()
      ).toBeVisible();

      // The chip on its own keeps the bulk label honest: with every optional
      // column hidden again, the thumbnails are the only thing left to hide.
      await bulkToggle.click();

      await expect(bulkToggle).toHaveText('Show All');

      await posterChip.click();

      await expect(
        page.locator('html')
      ).not.toHaveClass(/hide-mini-posters/);

      await expect(bulkToggle).toHaveText('Hide All');
    }
  );

  test(
    'reveals the clear-filters chip only while a filter is active',
    async ({ page }) => {
      await openCatalog(page);

      const clearFilters =
        page.locator('#clear-filters');

      await expect(clearFilters).toBeHidden();

      await page.locator(
        '#search-row input[data-col="FORMATTEDTITLE"]'
      ).fill('Arrival');

      await expect(clearFilters).toBeVisible();
      await expect(clearFilters).toBeEnabled();

      await clearFilters.click();

      await expect(clearFilters).toBeHidden();
      await expect(clearFilters).toBeDisabled();
    }
  );

  test(
    'shows an API error and recovers with retry',
    async ({ page }) => {
      let movieRequestCount = 0;

      await page.route(
        '**/api/movies.php*',
        async route => {
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
        }
      );

      await page.goto('/');

      const error =
        page.locator(
          '.api-error[data-error-scope="movies"]'
        );

      await expect(
        error
      ).toContainText(
        'Mock movie failure'
      );

      await error.getByRole(
        'button',
        {
          name: 'Retry'
        }
      ).click();

      await expect(
        page.locator(
          '#movies tbody tr[data-num]'
        ).first()
      ).toBeVisible();

      await expect(
        error
      ).toHaveCount(0);

      expect(
        movieRequestCount
      ).toBe(2);
    }
  );
});

test('slash focuses and selects the title filter without intercepting typing', async ({ page }) => {
  await openCatalog(page);
  const title = page.locator('#search-row input[data-col="FORMATTEDTITLE"]');
  await page.keyboard.press('/');
  await expect(title).toBeFocused();
  await title.fill('Arrival');
  await title.evaluate(el => el.blur());
  await page.keyboard.press('/');
  await expect(title).toBeFocused();
  expect(await title.evaluate(el => el.value.slice(el.selectionStart, el.selectionEnd))).toBe('Arrival');
  await page.keyboard.press('/');
  await expect(title).toHaveValue('/');
});
