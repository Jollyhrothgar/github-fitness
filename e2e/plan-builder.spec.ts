import { test, expect } from '@playwright/test';

test.describe('Plan Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase('github-fitness');
    });
    await page.reload();

    // Create some exercises first for the plan builder to use
    await page.goto('/exercises');

    // Create first exercise
    await page.click('button:has-text("Add Exercise")');
    await page.fill('input[placeholder="e.g., Incline Dumbbell Press"]', 'Bench Press');
    await page.selectOption('select:near(:text("Equipment"))', 'barbell');
    await page.selectOption('select:near(:text("Movement Pattern"))', 'horizontal_push');
    await page.click('button:has-text("Create Exercise")');
    await page.waitForTimeout(300);

    // Create second exercise
    await page.click('button:has-text("Add Exercise")');
    await page.fill('input[placeholder="e.g., Incline Dumbbell Press"]', 'Squat');
    await page.selectOption('select:near(:text("Equipment"))', 'barbell');
    await page.selectOption('select:near(:text("Movement Pattern"))', 'knee_dominant');
    await page.click('button:has-text("Create Exercise")');
    await page.waitForTimeout(300);

    // Create third exercise
    await page.click('button:has-text("Add Exercise")');
    await page.fill('input[placeholder="e.g., Incline Dumbbell Press"]', 'Deadlift');
    await page.selectOption('select:near(:text("Equipment"))', 'barbell');
    await page.selectOption('select:near(:text("Movement Pattern"))', 'hip_dominant');
    await page.click('button:has-text("Create Exercise")');
    await page.waitForTimeout(300);
  });

  test('shows create plan button', async ({ page }) => {
    await page.goto('/plans');

    await expect(page.locator('button:has-text("Create Plan")')).toBeVisible();
  });

  test('opens plan builder when clicking create plan', async ({ page }) => {
    await page.goto('/plans');

    await page.click('button:has-text("Create Plan")');

    await expect(page.locator('h1:has-text("Create New Plan")')).toBeVisible();
    await expect(page.locator('text=Plan Details')).toBeVisible();
  });

  test('can create a basic plan', async ({ page }) => {
    await page.goto('/plans');
    await page.click('button:has-text("Create Plan")');

    // Fill plan details
    await page.fill('input[placeholder="e.g., 4-Day Upper/Lower Split"]', 'My Test Plan');
    await page.selectOption('select:near(:text("Focus"))', 'strength');

    // Expand day and add exercise
    await page.click('button:has-text("Select exercise...")');
    await page.fill('input[placeholder="Search exercises..."]', 'bench');
    await page.click('button:has-text("Bench Press")');

    // Verify exercise was selected
    await expect(page.locator('button:has-text("Bench Press")')).toBeVisible();

    // Save plan
    await page.click('button:has-text("Create Plan")');

    // Should be back on plans page with new plan
    await expect(page.locator('h1:has-text("Workout Plans")')).toBeVisible();
    await expect(page.locator('h3:has-text("My Test Plan")')).toBeVisible();
  });

  test('can add multiple days', async ({ page }) => {
    await page.goto('/plans');
    await page.click('button:has-text("Create Plan")');

    await page.fill('input[placeholder="e.g., 4-Day Upper/Lower Split"]', 'Multi Day Plan');

    // Should start with 1 day
    await expect(page.locator('text=Workout Days (1)')).toBeVisible();

    // Add a second day
    await page.click('button:has-text("Add Day")');
    await expect(page.locator('text=Workout Days (2)')).toBeVisible();

    // Add a third day
    await page.click('button:has-text("Add Day")');
    await expect(page.locator('text=Workout Days (3)')).toBeVisible();
  });

  test('can remove a day', async ({ page }) => {
    await page.goto('/plans');
    await page.click('button:has-text("Create Plan")');

    await page.fill('input[placeholder="e.g., 4-Day Upper/Lower Split"]', 'Remove Day Test');

    // Add extra day
    await page.click('button:has-text("Add Day")');
    await expect(page.locator('text=Workout Days (2)')).toBeVisible();

    // Remove Day B (click the trash icon in the day header)
    const dayBHeader = page.locator('span:has-text("B")').first();
    const deleteButton = dayBHeader.locator('..').locator('..').locator('button[class*="hover:text-error"]');
    await deleteButton.click();

    await expect(page.locator('text=Workout Days (1)')).toBeVisible();
  });

  test('can add exercises to a day', async ({ page }) => {
    await page.goto('/plans');
    await page.click('button:has-text("Create Plan")');

    await page.fill('input[placeholder="e.g., 4-Day Upper/Lower Split"]', 'Add Exercise Test');

    // Add first exercise
    await page.click('button:has-text("Select exercise...")');
    await page.click('button:has-text("Bench Press")');

    // Add another exercise
    await page.click('button:has-text("+ Add Exercise")');
    await expect(page.locator('text=Exercise 2')).toBeVisible();

    await page.locator('button:has-text("Select exercise...")').last().click();
    await page.click('button:has-text("Squat")');
  });

  test('can set exercise parameters', async ({ page }) => {
    await page.goto('/plans');
    await page.click('button:has-text("Create Plan")');

    await page.fill('input[placeholder="e.g., 4-Day Upper/Lower Split"]', 'Parameters Test');

    // Select an exercise
    await page.click('button:has-text("Select exercise...")');
    await page.click('button:has-text("Bench Press")');

    // Modify parameters - use label text to find the corresponding input
    const exerciseCard = page.locator('.bg-surface-elevated').filter({ hasText: 'Bench Press' });
    const setsInput = exerciseCard.locator('input[type="number"]').first();
    const repsInput = exerciseCard.locator('input[placeholder="8-10"]');
    const rpeInput = exerciseCard.locator('input[placeholder="7"]');
    const restInput = exerciseCard.locator('input[step="15"]');

    await setsInput.fill('5');
    await repsInput.fill('5');
    await rpeInput.fill('8');
    await restInput.fill('180');

    // Parameters should be updated
    await expect(setsInput).toHaveValue('5');
    await expect(repsInput).toHaveValue('5');
  });

  test('cancel returns to plans list', async ({ page }) => {
    await page.goto('/plans');
    await page.click('button:has-text("Create Plan")');

    await expect(page.locator('h1:has-text("Create New Plan")')).toBeVisible();

    await page.click('button:has-text("Cancel")');

    await expect(page.locator('h1:has-text("Workout Plans")')).toBeVisible();
  });

  test('requires plan name to save', async ({ page }) => {
    await page.goto('/plans');
    await page.click('button:has-text("Create Plan")');

    // Select an exercise (so that's not the blocker)
    await page.click('button:has-text("Select exercise...")');
    await page.click('button:has-text("Bench Press")');

    // Set up dialog handler
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('plan name');
      await dialog.accept();
    });

    // Try to create without name
    await page.click('button:has-text("Create Plan")');
  });

  test('edit button opens plan builder with existing data', async ({ page }) => {
    // First create a plan via import
    await page.goto('/plans');
    await page.click('button:has-text("Import")');

    const testPlan = {
      plan_meta: {
        plan_id: 'edit_test',
        plan_name: 'Edit Test Plan',
        version: '1.0',
        days_per_week: 1,
        focus: 'hypertrophy',
      },
      schedule: [
        {
          id: 'day_a',
          day_name: 'Day A',
          day_order: 0,
          exercises: [
            { order: 1, exercise_id: 'bench_press', substitution_group: 'horizontal_push', sets: 3, target_reps: '10', rest_seconds: 90 },
          ],
        },
      ],
    };

    await page.locator('textarea').fill(JSON.stringify(testPlan));
    await page.click('button:has-text("Import"):not(:has-text("Cancel"))');
    await page.waitForTimeout(500);

    // Click edit
    await page.click('button:has-text("Edit")');

    // Should show edit mode with existing data
    await expect(page.locator('h1:has-text("Edit Plan")')).toBeVisible();
    await expect(page.locator('input[value="Edit Test Plan"]')).toBeVisible();
  });

  test('can search exercises in picker', async ({ page }) => {
    await page.goto('/plans');
    await page.click('button:has-text("Create Plan")');

    await page.fill('input[placeholder="e.g., 4-Day Upper/Lower Split"]', 'Search Test');

    // Open exercise picker
    await page.click('button:has-text("Select exercise...")');

    // Search for bench
    await page.fill('input[placeholder="Search exercises..."]', 'bench');

    // Should show bench press
    await expect(page.locator('.absolute button:has-text("Bench Press")')).toBeVisible();
    // Should not show squat
    await expect(page.locator('.absolute button:has-text("Squat")')).not.toBeVisible();
  });
});
