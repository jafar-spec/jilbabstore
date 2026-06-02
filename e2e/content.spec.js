import { test, expect } from '@playwright/test';

const pages = [
  { path: '/about', heading: 'من نحن' },
  { path: '/faq', heading: 'الأسئلة الشائعة' },
  { path: '/shipping', heading: 'الشحن والتوصيل' },
  { path: '/contact', heading: 'تواصلي معنا' },
  { path: '/privacy', heading: 'سياسة الخصوصية' },
  { path: '/returns', heading: 'سياسة الإرجاع' },
  { path: '/terms', heading: 'الشروط والأحكام' },
];

test.describe('Editable content pages', () => {
  for (const p of pages) {
    test(`${p.path} renders its heading`, async ({ page }) => {
      await page.goto(p.path);
      await expect(page.getByRole('heading', { name: p.heading, level: 1 })).toBeVisible();
    });
  }
});
