import { test, expect } from '@playwright/test';

const samplePlan = {
  plan_meta: {
    plan_name: 'Test Plan',
    author_agent: 'Test',
    version: '1.0',
    focus: 'strength',
    days_per_week: 2,
  },
  schedule: [
    {
      day_name: 'Day A - Push',
      day_order: 1,
      exercises: [
        {
          order: 1,
          exercise_id: 'bench_press_barbell',
          substitution_group: 'horizontal_push',
          sets: 3,
          target_reps: '8-10',
          target_rpe: 7,
          rest_seconds: 120,
        },
      ],
    },
    {
      day_name: 'Day B - Pull',
      day_order: 2,
      exercises: [
        {
          order: 1,
          exercise_id: 'barbell_row',
          substitution_group: 'horizontal_pull',
          sets: 3,
          target_reps: '8-10',
          target_rpe: 7,
          rest_seconds: 120,
        },
      ],
    },
  ],
};

test.describe('Plan Import', () => {
  test('can import a valid JSON plan', async ({ page }) => {
    await page.goto('/plans');

    // Click import button
    await page.click('button:has-text("Import Plan")');

    // Paste plan JSON
    await page.fill('textarea', JSON.stringify(samplePlan, null, 2));

    // Click import
    await page.click('button:has-text("Import"):not(:has-text("Plan"))');

    // Should show success and plan in list
    await expect(page.locator('text=Test Plan')).toBeVisible();
  });

  test('shows error for invalid JSON', async ({ page }) => {
    await page.goto('/plans');

    await page.click('button:has-text("Import Plan")');
    await page.fill('textarea', '{ invalid json }');
    await page.click('button:has-text("Import"):not(:has-text("Plan"))');

    // Should show error message (in the error paragraph, not the textarea)
    await expect(page.locator('p.text-error')).toContainText('Invalid JSON');
  });

  test('imported plan persists after reload', async ({ page }) => {
    await page.goto('/plans');

    // Import plan
    await page.click('button:has-text("Import Plan")');
    await page.fill('textarea', JSON.stringify(samplePlan));
    await page.click('button:has-text("Import"):not(:has-text("Plan"))');

    // Wait for plan to appear in the list (not just success message)
    await expect(page.locator('section h3:has-text("Test Plan")')).toBeVisible();

    // Small wait to ensure IndexedDB write completes
    await page.waitForTimeout(500);

    // Reload
    await page.reload();

    // Plan should still be there
    await expect(page.locator('h3:has-text("Test Plan")')).toBeVisible();
  });

  test('can activate a plan with weekly goal', async ({ page }) => {
    await page.goto('/plans');

    // Import plan first
    await page.click('button:has-text("Import Plan")');
    await page.fill('textarea', JSON.stringify(samplePlan));
    await page.click('button:has-text("Import"):not(:has-text("Plan"))');
    await expect(page.locator('text=Test Plan')).toBeVisible();

    // Click Activate to open dialog
    await page.click('button:has-text("Activate")');

    // Should show activation dialog
    await expect(page.locator('text=Activate Plan')).toBeVisible();
    await expect(page.locator('text=Weekly sessions goal')).toBeVisible();

    // Confirm activation
    await page.locator('div.fixed button:has-text("Activate")').click();

    // Should show as active
    await expect(page.locator('span:has-text("Active")')).toBeVisible();

    // Go to home, should show next workout
    await page.goto('/');
    await expect(page.locator('text=Day A - Push')).toBeVisible();
  });

  test('can delete a plan', async ({ page }) => {
    await page.goto('/plans');

    // Import plan
    await page.click('button:has-text("Import Plan")');
    await page.fill('textarea', JSON.stringify(samplePlan));
    await page.click('button:has-text("Import"):not(:has-text("Plan"))');
    await expect(page.locator('text=Test Plan')).toBeVisible();

    // Delete it (handle confirm dialog)
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("Delete")');

    // Plan should be gone
    await expect(page.locator('text=Test Plan')).not.toBeVisible();
  });

  test('auto-creates exercises when importing plan', async ({ page }) => {
    await page.goto('/plans');

    // Import plan with exercises
    await page.click('button:has-text("Import Plan")');
    await page.fill('textarea', JSON.stringify(samplePlan));
    await page.click('button:has-text("Import"):not(:has-text("Plan"))');

    // Should show success with created exercises info
    await expect(page.locator('text=Plan imported successfully')).toBeVisible();
    await expect(page.locator('text=Created 2 new exercises')).toBeVisible();

    // Navigate to exercises page
    await page.click('text=Exercise Library');

    // Should see the auto-created exercises
    await expect(page.locator('text=Bench Press Barbell')).toBeVisible();
    await expect(page.locator('text=Barbell Row')).toBeVisible();
  });

  test('exercises have correct inferred properties', async ({ page }) => {
    await page.goto('/plans');

    // Import plan
    await page.click('button:has-text("Import Plan")');
    await page.fill('textarea', JSON.stringify(samplePlan));
    await page.click('button:has-text("Import"):not(:has-text("Plan"))');
    await expect(page.locator('text=Test Plan')).toBeVisible();

    // Navigate to exercises page
    await page.click('text=Exercise Library');

    // Check that exercises exist with correct properties shown in badges
    // Bench Press Barbell should show "Barbell" equipment badge
    const benchSection = page.locator('h3:has-text("Bench Press Barbell")').locator('..');
    await expect(benchSection.locator('span:has-text("Barbell")')).toBeVisible();
    await expect(benchSection.locator('span:has-text("Horizontal Push")')).toBeVisible();

    // Barbell Row should show "Barbell" equipment badge
    const rowSection = page.locator('h3:has-text("Barbell Row")').locator('..');
    await expect(rowSection.locator('span:has-text("Barbell")')).toBeVisible();
    await expect(rowSection.locator('span:has-text("Horizontal Pull")')).toBeVisible();
  });

  test('does not duplicate exercises on re-import', async ({ page }) => {
    await page.goto('/plans');

    // Import plan twice
    await page.click('button:has-text("Import Plan")');
    await page.fill('textarea', JSON.stringify(samplePlan));
    await page.click('button:has-text("Import"):not(:has-text("Plan"))');
    await expect(page.locator('text=Created 2 new exercises')).toBeVisible();

    // Wait for success message to clear
    await page.waitForTimeout(3500);

    // Import a different plan with the same exercises
    const plan2 = {
      ...samplePlan,
      plan_meta: { ...samplePlan.plan_meta, plan_name: 'Test Plan 2' },
    };
    await page.click('button:has-text("Import Plan")');
    await page.fill('textarea', JSON.stringify(plan2));
    await page.click('button:has-text("Import"):not(:has-text("Plan"))');

    // Should NOT show "Created X new exercises" because they already exist
    await expect(page.locator('text=Plan imported successfully')).toBeVisible();
    await expect(page.locator('text=Created')).not.toBeVisible();

    // Navigate to exercises page
    await page.click('text=Exercise Library');

    // Should only have 2 exercises, not 4
    await expect(page.locator('text=2 exercises total')).toBeVisible();
  });
});
