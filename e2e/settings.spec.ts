import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test('unit preference persists across page reload', async ({ page }) => {
    await page.goto('/settings');

    // Default should be lbs (has bg-primary class)
    const lbsButton = page.locator('button:has-text("Pounds (lbs)")');
    const kgButton = page.locator('button:has-text("Kilograms (kg)")');

    // Click kg
    await kgButton.click();

    // Verify kg is now selected (has bg-primary)
    await expect(kgButton).toHaveClass(/bg-primary/);
    await expect(lbsButton).not.toHaveClass(/bg-primary/);

    // Reload page
    await page.reload();

    // kg should still be selected
    await expect(kgButton).toHaveClass(/bg-primary/);
    await expect(lbsButton).not.toHaveClass(/bg-primary/);
  });

  test('bar weight changes persist across reload', async ({ page }) => {
    await page.goto('/settings');

    // Find standard bar weight input and change it
    const barWeightInput = page.locator('input[type="number"]').first();
    await barWeightInput.fill('50');

    // Reload page
    await page.reload();

    // Value should persist
    await expect(barWeightInput).toHaveValue('50');
  });

  test('timer audio toggle persists', async ({ page }) => {
    await page.goto('/settings');

    // Find audio checkbox
    const audioCheckbox = page.locator('input[type="checkbox"]').first();

    // Get initial state
    const initialChecked = await audioCheckbox.isChecked();

    // Toggle it
    await audioCheckbox.click();

    // Verify toggled
    await expect(audioCheckbox).toBeChecked({ checked: !initialChecked });

    // Reload
    await page.reload();

    // Should persist
    await expect(audioCheckbox).toBeChecked({ checked: !initialChecked });
  });

  test('device ID is displayed', async ({ page }) => {
    await page.goto('/settings');

    // Should show device ID in debug section
    const deviceIdText = page.locator('text=Device ID:');
    await expect(deviceIdText).toBeVisible();
  });
});
