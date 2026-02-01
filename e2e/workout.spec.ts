import { test, expect } from '@playwright/test';

const samplePlan = {
  plan_meta: {
    plan_name: 'Test Workout Plan',
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
          sets: 2,
          target_reps: '8-10',
          target_rpe: 7,
          rest_seconds: 60,
        },
      ],
    },
  ],
};

// Helper to import and activate a plan
async function setupWorkout(page: typeof import('@playwright/test').Page.prototype) {
  await page.goto('/plans');
  await page.click('button:has-text("Import Plan")');
  await page.fill('textarea', JSON.stringify(samplePlan));
  await page.click('button:has-text("Import"):not(:has-text("Plan"))');
  await expect(page.locator('h3:has-text("Test Workout Plan")')).toBeVisible();

  // Activate plan
  await page.click('button:has-text("Activate")');
  await page.locator('div.fixed button:has-text("Activate")').click();
  await expect(page.locator('span:has-text("Active")')).toBeVisible();
}

test.describe('Workout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase('github-fitness');
    });
  });

  test('can start a workout from dashboard', async ({ page }) => {
    await setupWorkout(page);

    // Go to dashboard and start workout
    await page.goto('/');
    await page.click('button:has-text("Start Workout")');

    // Should be on workout page
    await expect(page.locator('h1:has-text("Day A - Push")')).toBeVisible();
  });

  test('can log a set', async ({ page }) => {
    await setupWorkout(page);
    await page.goto('/');
    await page.click('button:has-text("Start Workout")');

    // First exercise should be expanded, find the reps input
    await expect(page.locator('[data-testid="reps-input"]')).toBeVisible();

    // Enter reps
    await page.locator('[data-testid="reps-input"]').fill('10');

    // Log the set
    await page.click('button:has-text("Log Set")');

    // Should show the logged set in the list
    await expect(page.locator('text=× 10')).toBeVisible();
  });

  test('timer appears after logging working set', async ({ page }) => {
    await setupWorkout(page);
    await page.goto('/');
    await page.click('button:has-text("Start Workout")');

    // Uncheck warmup
    await page.locator('input[type="checkbox"]').uncheck();

    // Enter reps and log
    await page.locator('[data-testid="reps-input"]').fill('10');
    await page.click('button:has-text("Log Set")');

    // Timer should appear
    await expect(page.locator('[data-testid="timer"]')).toBeVisible();
  });

  test('can skip timer', async ({ page }) => {
    await setupWorkout(page);
    await page.goto('/');
    await page.click('button:has-text("Start Workout")');

    // Log a working set
    await page.locator('input[type="checkbox"]').uncheck();
    await page.locator('[data-testid="reps-input"]').fill('10');
    await page.click('button:has-text("Log Set")');

    // Skip timer
    await expect(page.locator('[data-testid="timer"]')).toBeVisible();
    await page.click('button:has-text("Skip")');
    await expect(page.locator('[data-testid="timer"]')).not.toBeVisible();
  });

  test('can complete workout', async ({ page }) => {
    await setupWorkout(page);
    await page.goto('/');
    await page.click('button:has-text("Start Workout")');

    // Log 2 working sets
    await page.locator('input[type="checkbox"]').uncheck();
    await page.locator('[data-testid="reps-input"]').fill('10');
    await page.click('button:has-text("Log Set")');
    await page.click('button:has-text("Skip")');

    await page.locator('[data-testid="reps-input"]').fill('8');
    await page.click('button:has-text("Log Set")');
    await page.click('button:has-text("Skip")');

    // Complete
    await page.click('button:has-text("Complete Workout")');
    await expect(page.locator('text=Workout Complete!')).toBeVisible();
  });

  test('summary closes and returns to dashboard', async ({ page }) => {
    await setupWorkout(page);
    await page.goto('/');
    await page.click('button:has-text("Start Workout")');

    // Complete workout
    await page.locator('input[type="checkbox"]').uncheck();
    await page.locator('[data-testid="reps-input"]').fill('10');
    await page.click('button:has-text("Log Set")');
    await page.click('button:has-text("Skip")');
    await page.locator('[data-testid="reps-input"]').fill('8');
    await page.click('button:has-text("Log Set")');
    await page.click('button:has-text("Skip")');
    await page.click('button:has-text("Complete Workout")');

    // Close summary
    await page.click('button:has-text("Done")');
    await expect(page.locator('h1:has-text("GitHub Fitness")')).toBeVisible();
  });
});
