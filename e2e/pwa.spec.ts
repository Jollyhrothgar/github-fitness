import { test, expect } from '@playwright/test';

test.describe('PWA Functionality', () => {
  // Note: Service worker offline tests require a production build.
  // These tests verify the PWA configuration is correct.
  // Full offline functionality should be manually tested with `npm run preview`

  test('IndexedDB data persists across page reloads', async ({ page }) => {
    // Clear storage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase('github-fitness');
    });
    await page.reload();

    // Change a setting
    await page.goto('/settings');
    await page.click('button:has-text("kg")');
    await expect(page.locator('button:has-text("kg").bg-primary')).toBeVisible();

    // Wait for storage to persist
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();

    // Setting should persist (from IndexedDB/localStorage, not service worker)
    await expect(page.locator('button:has-text("kg").bg-primary')).toBeVisible();
  });

  test('localStorage data persists across sessions', async ({ page }) => {
    await page.goto('/settings');

    // Change bar weight
    const barInput = page.locator('input[type="number"]').first();
    await barInput.fill('55');

    // Wait for debounced save
    await page.waitForTimeout(600);

    // Reload
    await page.reload();

    // Should persist
    await expect(barInput).toHaveValue('55');
  });

  test('PWA manifest is properly configured', async ({ page }) => {
    await page.goto('/');

    // Check for manifest link
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);
  });

  test('has proper meta tags for PWA', async ({ page }) => {
    await page.goto('/');

    // Check theme color
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#0f172a');

    // Check apple-mobile-web-app-capable
    const appleMeta = page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(appleMeta).toHaveAttribute('content', 'yes');

    // Check mobile-web-app-capable
    const mobileMeta = page.locator('meta[name="mobile-web-app-capable"]');
    await expect(mobileMeta).toHaveAttribute('content', 'yes');
  });

  test('favicon is configured', async ({ page }) => {
    await page.goto('/');

    // Check for favicon
    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon).toHaveCount(1);
    await expect(favicon).toHaveAttribute('href', '/favicon.svg');
  });
});
