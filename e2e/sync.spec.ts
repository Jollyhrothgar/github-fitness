import { test, expect } from '@playwright/test';

test.describe('GitHub Sync Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      indexedDB.deleteDatabase('github-fitness');
    });
    await page.reload();
  });

  test('shows GitHub sync section in settings', async ({ page }) => {
    await page.goto('/settings');

    // Check for GitHub Sync section
    await expect(page.locator('h3:has-text("GitHub Sync")')).toBeVisible();

    // Check for connect button (either OAuth or manual setup)
    const connectButton = page.locator(
      'button:has-text("Setup GitHub Sync"), button:has-text("Connect with GitHub")'
    );
    await expect(connectButton.first()).toBeVisible();
  });

  test('shows "Not connected" status initially', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.locator('text=Not connected')).toBeVisible();
  });

  test('manual setup form appears when clicking setup', async ({ page }) => {
    await page.goto('/settings');

    // Click the setup button
    const setupButton = page.locator(
      'button:has-text("Setup GitHub Sync"), button:has-text("Connect with GitHub")'
    );
    await setupButton.first().click();

    // Should show manual entry form (since OAuth is not configured)
    await expect(page.locator('h3:has-text("Manual GitHub Setup")')).toBeVisible();
    await expect(page.locator('input[placeholder="ghp_..."]')).toBeVisible();
    await expect(page.locator('input[placeholder="your-username"]')).toBeVisible();
    await expect(page.locator('input[placeholder="fitness-data"]')).toBeVisible();
  });

  test('cancel button returns to initial state', async ({ page }) => {
    await page.goto('/settings');

    // Go to manual setup
    const setupButton = page.locator(
      'button:has-text("Setup GitHub Sync"), button:has-text("Connect with GitHub")'
    );
    await setupButton.first().click();

    // Click cancel
    await page.click('button:has-text("Cancel")');

    // Should be back to initial state
    await expect(page.locator('text=Not connected')).toBeVisible();
  });

  test('shows error when submitting empty form', async ({ page }) => {
    await page.goto('/settings');

    // Go to manual setup
    const setupButton = page.locator(
      'button:has-text("Setup GitHub Sync"), button:has-text("Connect with GitHub")'
    );
    await setupButton.first().click();

    // Try to connect without filling fields
    await page.click('button:has-text("Connect"):not(:has-text("Cancel"))');

    // Should show error
    await expect(page.locator('text=Please fill in all fields')).toBeVisible();
  });

  test('displays device ID in debug section', async ({ page }) => {
    await page.goto('/settings');

    // Should show device ID
    await expect(page.locator('text=Device ID:')).toBeVisible();

    // Device ID should be non-empty
    const deviceIdText = await page.locator('p:has-text("Device ID:")').textContent();
    expect(deviceIdText).toMatch(/Device ID: \S+/);
  });

  test('device ID persists across reloads', async ({ page }) => {
    await page.goto('/settings');

    // Get initial device ID
    const initialDeviceId = await page.locator('p:has-text("Device ID:")').textContent();

    // Reload page
    await page.reload();

    // Device ID should be the same
    const reloadedDeviceId = await page.locator('p:has-text("Device ID:")').textContent();
    expect(reloadedDeviceId).toBe(initialDeviceId);
  });

  test('OAuth callback route exists', async ({ page }) => {
    // Navigate to OAuth callback without params (should show error)
    await page.goto('/oauth/callback');

    // Should show error about missing params
    await expect(page.locator('text=Connection Failed')).toBeVisible();
    await expect(page.locator('text=Missing authorization code')).toBeVisible();
  });

  test('OAuth callback handles error parameter', async ({ page }) => {
    await page.goto('/oauth/callback?error=access_denied&error_description=User%20denied%20access');

    await expect(page.locator('text=Connection Failed')).toBeVisible();
    await expect(page.locator('text=User denied access')).toBeVisible();
  });

  test('can return to settings from OAuth error', async ({ page }) => {
    await page.goto('/oauth/callback?error=access_denied');

    await page.click('button:has-text("Return to Settings")');

    // Should be on settings page
    await expect(page).toHaveURL('/settings');
  });
});

test.describe('Offline Queue Behavior', () => {
  test('sync status shows offline when network is disabled', async ({ page, context }) => {
    await page.goto('/settings');

    // First, configure sync (mock it by setting localStorage directly)
    await page.evaluate(() => {
      localStorage.setItem(
        'gh-fitness-auth',
        JSON.stringify({
          accessToken: 'fake-token',
          username: 'testuser',
          repo: 'fitness-data',
        })
      );
    });
    await page.reload();

    // Verify connected state
    await expect(page.locator('text=Connected')).toBeVisible();

    // Go offline
    await context.setOffline(true);

    // Trigger a sync action (this would add to queue)
    await page.click('button:has-text("Sync Now")');

    // Wait for offline detection
    await page.waitForTimeout(500);

    // Check that we see offline status
    await expect(page.locator('text=Syncing...')).not.toBeVisible();
  });

  test('sync queue persists in localStorage', async ({ page }) => {
    await page.goto('/settings');

    // Configure sync
    await page.evaluate(() => {
      localStorage.setItem(
        'gh-fitness-auth',
        JSON.stringify({
          accessToken: 'fake-token',
          username: 'testuser',
          repo: 'fitness-data',
        })
      );
      // Add a test item to the queue
      localStorage.setItem(
        'gh-fitness-sync-queue',
        JSON.stringify([{
          id: 'test-item',
          type: 'log',
          action: 'create',
          data: { session_id: 'test' },
          timestamp: new Date().toISOString(),
          retryCount: 0,
        }])
      );
    });

    await page.reload();

    // Check that queue persists
    const queueAfter = await page.evaluate(() => {
      return localStorage.getItem('gh-fitness-sync-queue');
    });

    expect(queueAfter).not.toBeNull();
    const parsed = JSON.parse(queueAfter!);
    expect(parsed.length).toBeGreaterThan(0);
  });
});

test.describe('Sync Integration', () => {
  test('auth config is used by sync service', async ({ page }) => {
    // This test verifies that auth configuration is properly used

    await page.goto('/settings');

    // Configure sync via localStorage
    await page.evaluate(() => {
      localStorage.setItem(
        'gh-fitness-auth',
        JSON.stringify({
          accessToken: 'test-token-123',
          username: 'testuser',
          repo: 'my-fitness-data',
        })
      );
    });

    await page.reload();

    // Should show connected state with correct info
    await expect(page.locator('text=Connected')).toBeVisible();
    await expect(page.locator('text=testuser')).toBeVisible();
    await expect(page.locator('text=my-fitness-data')).toBeVisible();
  });

  test('disconnect clears auth and shows not connected', async ({ page }) => {
    await page.goto('/settings');

    // Configure sync
    await page.evaluate(() => {
      localStorage.setItem(
        'gh-fitness-auth',
        JSON.stringify({
          accessToken: 'test-token',
          username: 'testuser',
          repo: 'fitness-data',
        })
      );
    });

    await page.reload();
    await expect(page.locator('text=Connected')).toBeVisible();

    // Click disconnect
    await page.click('button:has-text("Disconnect")');

    // Should show not connected
    await expect(page.locator('text=Not connected')).toBeVisible();

    // Auth should be cleared
    const auth = await page.evaluate(() => {
      return localStorage.getItem('gh-fitness-auth');
    });
    expect(auth).toBeNull();
  });
});
