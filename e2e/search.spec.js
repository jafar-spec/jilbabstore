import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cookie_consent', 'accepted'));
});

test.describe('Search', () => {
  test('overlay opens and routes to the search page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Search' }).click();
    const input = page.getByTestId('search-overlay-input');
    await expect(input).toBeVisible();
    await input.fill('jilbab');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=/);
  });

  test('search results page loads (results or empty message)', async ({ page }) => {
    await page.goto('/search?q=test');
    // The page must render its results heading, not error out.
    await expect(page.getByRole('heading', { name: /نتائج البحث/ })).toBeVisible();
  });
});
