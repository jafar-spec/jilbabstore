import { test, expect } from '@playwright/test';

// Dismiss the one-time cookie banner so it can't intercept bottom-corner UI.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cookie_consent', 'accepted'));
});

test.describe('Home / storefront shell', () => {
  test('renders the navbar, logo and key actions', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Jilbab Store|جلباب/);
    await expect(page.getByText('JILBABSTORE').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cart', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'خيارات إمكانية الوصول' })).toBeVisible();
  });

  test('cart sidebar opens and shows empty state', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Cart', exact: true }).click();
    await expect(page.getByText(/السلة فارغة|emptyCart/)).toBeVisible();
  });

  test('seeded cart item appears in the sidebar', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cart', JSON.stringify([
        { id: 'test1', title: 'منتج تجريبي', price: 100, quantity: 2, selectedSize: 'M', selectedColor: '', sku: 'T-M', image: '/assets/logo.png' },
      ]));
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Cart', exact: true }).click();
    await expect(page.getByText('منتج تجريبي')).toBeVisible();
  });
});
