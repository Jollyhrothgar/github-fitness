import { test, expect } from '@playwright/test';

const samplePlan = {
  plan_meta: {
    plan_name: 'Progress Test Plan',
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
async function setupPlan(page: typeof import('@playwright/test').Page.prototype) {
  await page.goto('/plans');
  await page.click('button:has-text("Import Plan")');
  await page.fill('textarea', JSON.stringify(samplePlan));
  await page.click('button:has-text("Import"):not(:has-text("Plan"))');
  await expect(page.locator('h3:has-text("Progress Test Plan")')).toBeVisible();

  // Activate plan
  await page.click('button:has-text("Activate")');
  await page.locator('div.fixed button:has-text("Activate")').click();
  await expect(page.locator('span:has-text("Active")')).toBeVisible();
}

// Helper to complete a workout with specified weight
async function completeWorkout(
  page: typeof import('@playwright/test').Page.prototype,
  weight: string = '135'
) {
  await page.goto('/');
  await page.click('button:has-text("Start Workout")');

  // Log 2 working sets
  await page.locator('input[type="checkbox"]').uncheck(); // Uncheck warmup
  await page.locator('[data-testid="weight-input"]').fill(weight);
  await page.locator('[data-testid="reps-input"]').fill('10');
  await page.click('button:has-text("Log Set")');
  await page.click('button:has-text("Skip")');

  await page.locator('[data-testid="reps-input"]').fill('8');
  await page.click('button:has-text("Log Set")');
  await page.click('button:has-text("Skip")');

  // Complete
  await page.click('button:has-text("Complete Workout")');
  await expect(page.locator('text=Workout Complete!')).toBeVisible();
  await page.click('button:has-text("Done")');
}

test.describe('Progress Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase('github-fitness');
    });
  });

  test('shows empty state when no workouts logged', async ({ page }) => {
    await page.goto('/progress');

    // Should show empty state messages
    await expect(page.locator('text=No sessions logged yet')).toBeVisible();
  });

  test('exercise dropdown populates after completing workouts', async ({ page }) => {
    await setupPlan(page);
    await completeWorkout(page);

    // Go to progress page
    await page.goto('/progress');

    // Exercise dropdown should have the bench press option
    const select = page.locator('[data-testid="exercise-select"]');
    await expect(select).toBeVisible();

    // Check that bench press is an option
    const options = select.locator('option');
    await expect(options).toHaveCount(2); // empty option + bench press
  });

  test('session history shows completed workouts', async ({ page }) => {
    await setupPlan(page);
    await completeWorkout(page);

    // Go to progress page
    await page.goto('/progress');

    // Should show the completed session in history (day_id is 'day_a' which displays as 'day a')
    await expect(page.locator('button:has-text("day a")')).toBeVisible();
    await expect(page.locator('text=1 exercises')).toBeVisible();
    await expect(page.locator('text=2 sets')).toBeVisible();
  });

  test('chart renders after logging workouts', async ({ page }) => {
    await setupPlan(page);
    // Need at least 2 data points for chart to render
    await completeWorkout(page, '135');
    await completeWorkout(page, '140');

    // Go to progress page
    await page.goto('/progress');

    // Select the exercise
    await page.selectOption('[data-testid="exercise-select"]', 'bench_press_barbell');

    // Chart should be visible (check for the progress-chart data-testid)
    await expect(page.locator('[data-testid="progress-chart"]')).toBeVisible();
  });

  test('clicking session opens detail view', async ({ page }) => {
    await setupPlan(page);
    await completeWorkout(page);

    // Go to progress page
    await page.goto('/progress');

    // Click on the session (day_id is 'day_a')
    await page.click('button:has-text("day a")');

    // Should show session detail modal - wait for heading to appear
    await expect(page.locator('h2:has-text("day a")')).toBeVisible();

    // Should show working sets section
    await expect(page.locator('text=Working Sets')).toBeVisible();

    // Should show the logged sets (135 plates per side = 45 bar + 270 = 315 total)
    await expect(page.locator('text=315 x 10')).toBeVisible();
    await expect(page.locator('text=315 x 8')).toBeVisible();
  });

  test('session detail close button returns to progress page', async ({ page }) => {
    await setupPlan(page);
    await completeWorkout(page);

    await page.goto('/progress');

    // Open session detail (day_id is 'day_a')
    await page.click('button:has-text("day a")');
    await expect(page.locator('text=Working Sets')).toBeVisible();

    // Close it
    await page.locator('button:has-text("Close")').click();

    // Should be back on progress page
    await expect(page.locator('h1:has-text("Progress")')).toBeVisible();
  });

  test('stats section shows best and average 1RM', async ({ page }) => {
    await setupPlan(page);
    await completeWorkout(page, '135');

    await page.goto('/progress');

    // Auto-select should pick bench press
    await expect(page.locator('text=bench press barbell Stats')).toBeVisible();

    // Should show stats
    await expect(page.locator('text=Best 1RM')).toBeVisible();
    await expect(page.locator('text=Avg 1RM')).toBeVisible();
    await expect(page.locator('text=Sessions')).toBeVisible();
  });

  test('multiple workouts show in session history', async ({ page }) => {
    await setupPlan(page);

    // Complete first workout
    await completeWorkout(page, '135');

    // Complete second workout
    await completeWorkout(page, '140');

    // Go to progress page
    await page.goto('/progress');

    // Should show both sessions (day_id 'day_a' appears twice)
    const sessions = page.locator('button:has-text("day a")');
    await expect(sessions).toHaveCount(2);
  });
});
