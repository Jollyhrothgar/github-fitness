import { test, expect } from '@playwright/test';

test.describe('Exercise Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase('github-fitness');
    });
    await page.reload();
  });

  test('shows empty state initially', async ({ page }) => {
    await page.goto('/exercises');

    await expect(page.locator('h1')).toHaveText('Exercise Library');
    await expect(page.locator('text=0 exercises total')).toBeVisible();
    await expect(
      page.locator('text=No exercises yet. Import a workout plan to auto-populate exercises.')
    ).toBeVisible();
  });

  test('can create a new exercise', async ({ page }) => {
    await page.goto('/exercises');

    // Click Add Exercise button
    await page.click('button:has-text("Add Exercise")');

    // Fill in exercise details
    await page.fill('input[placeholder="e.g., Incline Dumbbell Press"]', 'Incline Bench Press');
    await page.selectOption('select:near(:text("Equipment"))', 'barbell');
    await page.selectOption('select:near(:text("Movement Pattern"))', 'horizontal_push');

    // Add muscle group
    await page.fill('input[placeholder="Type and press Enter"]', 'chest');
    await page.click('button:has-text("Add")');

    // Create the exercise
    await page.click('button:has-text("Create Exercise")');

    // Verify exercise appears in list
    await expect(page.locator('h3:has-text("Incline Bench Press")')).toBeVisible();
    await expect(page.locator('text=1 exercise total')).toBeVisible();
  });

  test('can search exercises', async ({ page }) => {
    // First create some exercises via plan import
    await page.goto('/plans');
    await page.click('button:has-text("Import")');

    const testPlan = {
      plan_meta: {
        plan_id: 'search_test',
        plan_name: 'Search Test',
        version: '1.0',
        days_per_week: 1,
      },
      schedule: [
        {
          id: 'day_a',
          day_name: 'Day A',
          day_order: 0,
          exercises: [
            { order: 1, exercise_id: 'bench_press_barbell', substitution_group: 'horizontal_push', sets: 3, target_reps: '10', rest_seconds: 90 },
            { order: 2, exercise_id: 'squat_barbell', substitution_group: 'knee_dominant', sets: 3, target_reps: '10', rest_seconds: 90 },
            { order: 3, exercise_id: 'deadlift_barbell', substitution_group: 'hip_dominant', sets: 3, target_reps: '10', rest_seconds: 90 },
          ],
        },
      ],
    };

    await page.locator('textarea').fill(JSON.stringify(testPlan));
    await page.click('button:has-text("Import"):not(:has-text("Cancel"))');
    await page.waitForTimeout(500);

    // Go to exercises and search
    await page.goto('/exercises');
    await expect(page.locator('text=3 exercises total')).toBeVisible();

    // Search for bench
    await page.fill('input[placeholder="Search exercises..."]', 'bench');

    // Should only show bench press
    await expect(page.locator('h3:has-text("Bench Press Barbell")')).toBeVisible();
    await expect(page.locator('h3:has-text("Squat")')).not.toBeVisible();
  });

  test('can filter by equipment type', async ({ page }) => {
    // Import plan with varied equipment
    await page.goto('/plans');
    await page.click('button:has-text("Import")');

    const testPlan = {
      plan_meta: {
        plan_id: 'filter_test',
        plan_name: 'Filter Test',
        version: '1.0',
        days_per_week: 1,
      },
      schedule: [
        {
          id: 'day_a',
          day_name: 'Day A',
          day_order: 0,
          exercises: [
            { order: 1, exercise_id: 'bench_press_barbell', substitution_group: 'horizontal_push', sets: 3, target_reps: '10', rest_seconds: 90 },
            { order: 2, exercise_id: 'dumbbell_curl', substitution_group: 'isolation', sets: 3, target_reps: '10', rest_seconds: 60 },
          ],
        },
      ],
    };

    await page.locator('textarea').fill(JSON.stringify(testPlan));
    await page.click('button:has-text("Import"):not(:has-text("Cancel"))');
    await page.waitForTimeout(500);

    await page.goto('/exercises');
    await expect(page.locator('text=2 exercises total')).toBeVisible();

    // Filter by barbell
    await page.selectOption('select:has-text("All Equipment")', 'barbell');

    // Should only show barbell exercise
    await expect(page.locator('h3:has-text("Bench Press Barbell")')).toBeVisible();
    await expect(page.locator('h3:has-text("Dumbbell Curl")')).not.toBeVisible();
  });

  test('can edit an exercise', async ({ page }) => {
    // Create exercise first
    await page.goto('/exercises');
    await page.click('button:has-text("Add Exercise")');
    await page.fill('input[placeholder="e.g., Incline Dumbbell Press"]', 'Test Exercise');
    await page.click('button:has-text("Create Exercise")');

    // Click edit button
    await page.click('button[aria-label="Edit exercise"]');

    // Change the name
    await page.fill('input[placeholder="Exercise name"]', 'Updated Exercise');
    await page.click('button:has-text("Save")');

    // Verify update
    await expect(page.locator('h3:has-text("Updated Exercise")')).toBeVisible();
    await expect(page.locator('h3:has-text("Test Exercise")')).not.toBeVisible();
  });

  test('can delete an exercise', async ({ page }) => {
    // Create exercise first
    await page.goto('/exercises');
    await page.click('button:has-text("Add Exercise")');
    await page.fill('input[placeholder="e.g., Incline Dumbbell Press"]', 'Delete Me');
    await page.click('button:has-text("Create Exercise")');

    await expect(page.locator('h3:has-text("Delete Me")')).toBeVisible();

    // Set up dialog handler
    page.on('dialog', (dialog) => dialog.accept());

    // Click delete button
    await page.click('button[aria-label="Delete exercise"]');

    // Verify deletion
    await expect(page.locator('h3:has-text("Delete Me")')).not.toBeVisible();
    await expect(page.locator('text=0 exercises total')).toBeVisible();
  });

  test('can cancel exercise creation', async ({ page }) => {
    await page.goto('/exercises');

    // Open create form
    await page.click('button:has-text("Add Exercise")');
    await expect(page.locator('text=Create New Exercise')).toBeVisible();

    // Cancel
    await page.click('button:has-text("Cancel")');

    // Form should be hidden
    await expect(page.locator('text=Create New Exercise')).not.toBeVisible();
  });

  test('add exercise button requires name', async ({ page }) => {
    await page.goto('/exercises');

    await page.click('button:has-text("Add Exercise")');

    // Button should be disabled without name
    const createButton = page.locator('button:has-text("Create Exercise")');
    await expect(createButton).toBeDisabled();

    // Fill name
    await page.fill('input[placeholder="e.g., Incline Dumbbell Press"]', 'Test');

    // Button should be enabled
    await expect(createButton).not.toBeDisabled();
  });
});
