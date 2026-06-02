import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cookie_consent', 'accepted'));
});

test.describe('Accessibility widget', () => {
  test('opens, applies high contrast, scales text, and persists', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'خيارات إمكانية الوصول' }).click();

    const panel = page.getByRole('dialog', { name: 'إعدادات إمكانية الوصول' });
    await expect(panel).toBeVisible();

    // High contrast toggles a class on <html>.
    await panel.getByRole('button', { name: /تباين عالٍ/ }).click();
    await expect(page.locator('html')).toHaveClass(/a11y-contrast/);

    // Text size stepper increases the root font size.
    await panel.getByRole('button', { name: 'تكبير الخط' }).click();
    await expect(page.locator('html')).toHaveAttribute('style', /font-size/);

    // Preference persists across a reload.
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/a11y-contrast/);
  });

  test('skip-to-content link exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'تخطّ إلى المحتوى' })).toHaveCount(1);
  });
});
