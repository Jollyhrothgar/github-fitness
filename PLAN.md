# GitHub Fitness PWA - Implementation Plan

## Overview

A Progressive Web App for tracking weight training workouts, designed to execute AI-generated workout plans with smart logging, statistical progress analysis, and offline-first GitHub sync.

---

## Testing Strategy

**Principle:** Tests are written alongside features, not deferred to the end. Each phase includes specific test requirements.

### Test Types

| Type | Tool | Purpose | Location |
|------|------|---------|----------|
| Unit | Vitest | Pure functions, hooks, calculations | `src/**/*.test.ts` |
| Component | Testing Library | React component behavior | `src/**/*.test.tsx` |
| E2E | Playwright | User flows, persistence, PWA | `e2e/*.spec.ts` |

### Test Coverage by Phase

| Phase | Unit Tests | E2E Tests |
|-------|------------|-----------|
| 1 | Type helpers, calculations | - |
| 2 | Storage CRUD, hooks | Settings persistence |
| 3 | Plan validation, inference | Plan import flow |
| 4 | Weight calc, timer | Complete workout flow |
| 5 | Stats, 1RM, trends | Dashboard, progress charts |
| 6 | Sync logic, merge | Offline/online sync |
| 7 | Plate math | PWA offline, notifications |
| 8 | - | Full integration journey |

### Running Tests

```bash
npm run test          # Unit tests (watch mode)
npm run test:run      # Unit tests (single run)
npm run test:e2e      # E2E tests
npm run test:all      # All tests (CI)
```

---

## Phase 1: Project Foundation

**Goal:** Establish project structure, tooling, and core TypeScript types.

### 1.1 Project Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure ESLint + Prettier
- [ ] Set up path aliases (`@/components`, `@/lib`, `@/types`)
- [ ] Add Tailwind CSS for styling
- [ ] Configure PWA plugin (vite-plugin-pwa with Workbox)

**Core Dependencies:**
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-router-dom": "^6.x",
    "recharts": "^2.x",
    "use-sound": "^4.x",
    "idb": "^8.x",
    "uuid": "^9.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "vite-plugin-pwa": "^0.x",
    "tailwindcss": "^3.x",
    "typescript": "^5.x",
    "vitest": "^2.x",
    "@testing-library/react": "^16.x",
    "@testing-library/user-event": "^14.x",
    "playwright": "^1.x",
    "@playwright/test": "^1.x",
    "fake-indexeddb": "^6.x"
  }
}
```

### 1.4 Testing Infrastructure
- [ ] Configure Vitest for unit tests
- [ ] Configure Playwright for E2E tests
- [ ] Set up test scripts in package.json
- [ ] Create test utilities and mocks

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 1.5 Phase 1 Tests
- [ ] Unit tests for type helper functions (inferEquipmentType, getWeightEntryMode, etc.)
- [ ] Unit tests for calculation functions (estimate1RM, parseRepTarget, etc.)

### 1.2 Core Type Definitions
Create TypeScript interfaces for all data structures:

```typescript
// types/exercise.ts
interface ExerciseDefinition {
  id: string;
  name: string;
  equipment_type: EquipmentType;
  movement_pattern: MovementPattern;
  primary_muscle_groups: string[];
  weight_entry_mode: WeightEntryMode;
  default_bar_weight_lbs?: number;
  images?: string[];
  instructions?: string[];
}

type EquipmentType = 'barbell' | 'trap_bar' | 'dumbbell' | 'machine' | 'cable' | 'kettlebell' | 'fixed_barbell' | 'bodyweight' | 'sled' | 'other';
type WeightEntryMode = 'plates_per_side' | 'total_weight' | 'per_hand' | 'stack' | 'bodyweight_plus' | 'duration';
type MovementPattern = 'horizontal_push' | 'horizontal_pull' | 'vertical_push' | 'vertical_pull' | 'knee_dominant' | 'hip_dominant' | 'carry_conditioning' | 'conditioning' | 'isolation' | 'core';

// types/plan.ts
interface WorkoutPlan {
  plan_meta: PlanMeta;
  schedule: WorkoutDay[];
}

interface WorkoutDay {
  id: string;
  day_name: string;
  day_order: number;
  exercises: PlannedExercise[];
}

interface PlannedExercise {
  order: number;
  exercise_id: string;
  substitution_group: string;
  sets: number;
  target_reps: string; // "8-10" or "30 seconds"
  target_rpe: number;
  rest_seconds: number;
  notes?: string;
  progression_logic?: string;
}

// types/schedule.ts
interface UserSchedule {
  active_plan_id: string;
  workout_queue: string[]; // ["day_a", "day_b", ...]
  current_queue_index: number;
  weekly_goal: number; // target sessions per week
  week_start_day: 'Monday' | 'Sunday';
  completed_this_week: number;
}

// types/log.ts
interface WorkoutLog {
  session_id: string;
  timestamp_start: string;
  timestamp_end?: string;
  plan_ref: string;
  day_id: string;
  body_weight_kg?: number;
  subjective_readiness?: number;
  performed_exercises: PerformedExercise[];
}

interface PerformedExercise {
  exercise_id: string;
  was_substitution: boolean;
  original_exercise_id?: string;
  sets: LoggedSet[];
}

interface LoggedSet {
  set_number: number;
  is_warmup: boolean;
  weight_entered: number;      // What user typed
  weight_calculated: number;   // After bar/equipment calculation
  unit: 'lbs' | 'kg';
  reps: number;
  rpe?: number;
  duration_seconds?: number;   // For timed sets
  failure: boolean;
  notes?: string;
  timestamp: string;
  calculated_1rm?: number;
}

// types/config.ts
interface UserConfig {
  units: 'lbs' | 'kg';
  equipment: EquipmentProfile;
  timer_audio_enabled: boolean;
  github_sync_enabled: boolean;
}

interface EquipmentProfile {
  standard_bar_weight_lbs: number;    // Usually 45
  trap_bar_weight_lbs: number;        // Usually 55-65
  available_plates_lbs: number[];     // [45, 45, 25, 25, 10, 10, 5, 5, 2.5, 2.5]
}
```

### 1.3 Project Structure
```
src/
├── components/
│   ├── ui/              # Reusable UI components (Button, Card, Input, etc.)
│   ├── workout/         # Workout-specific components
│   ├── plan/            # Plan import/edit components
│   ├── dashboard/       # Progress dashboard components
│   └── layout/          # App shell, navigation
├── lib/
│   ├── storage.ts       # localStorage + IndexedDB abstraction
│   ├── sync.ts          # GitHub sync logic
│   ├── calculations.ts  # Weight calc, 1RM formulas, statistics
│   ├── timer.ts         # Rest timer with audio
│   └── utils.ts         # General utilities
├── hooks/
│   ├── useWorkout.ts    # Active workout state management
│   ├── useTimer.ts      # Rest timer hook
│   ├── useStorage.ts    # Persistent storage hook
│   └── useSync.ts       # GitHub sync hook
├── pages/
│   ├── Home.tsx         # Dashboard / "What's next"
│   ├── Workout.tsx      # Active workout screen
│   ├── Plans.tsx        # Plan library & import
│   ├── Progress.tsx     # Statistics & trends
│   └── Settings.tsx     # User config
├── types/               # TypeScript interfaces
├── data/                # Default exercise definitions
└── App.tsx
```

**Deliverables:**
- Running Vite dev server with React + TS
- All core types defined and exported
- Folder structure in place
- Basic routing (React Router)

---

## Phase 2: Data Layer & Storage

**Goal:** Implement offline-first storage with IndexedDB and localStorage.

### 2.1 Storage Architecture
- [ ] Create `StorageService` class with unified API
- [ ] Use IndexedDB for large data (workout logs, exercise DB)
- [ ] Use localStorage for small config (user settings, active schedule)
- [ ] Implement data versioning for migrations

### 2.2 Storage Operations
```typescript
// Core storage interface
interface StorageService {
  // Exercise DB
  getExercises(): Promise<ExerciseDefinition[]>;
  getExercise(id: string): Promise<ExerciseDefinition | null>;
  saveExercise(exercise: ExerciseDefinition): Promise<void>;

  // Plans
  getPlans(): Promise<WorkoutPlan[]>;
  getPlan(id: string): Promise<WorkoutPlan | null>;
  savePlan(plan: WorkoutPlan): Promise<void>;
  deletePlan(id: string): Promise<void>;

  // Logs
  getLogs(options?: { limit?: number; exerciseId?: string }): Promise<WorkoutLog[]>;
  saveLog(log: WorkoutLog): Promise<void>;

  // Config
  getConfig(): UserConfig;
  saveConfig(config: UserConfig): void;

  // Schedule
  getSchedule(): UserSchedule | null;
  saveSchedule(schedule: UserSchedule): void;

  // Sync metadata
  getLastSyncTime(): Date | null;
  getPendingChanges(): Promise<PendingChange[]>;
}
```

### 2.3 React Context & Hooks
- [ ] Create `StorageContext` provider
- [ ] Implement `useExercises()` hook
- [ ] Implement `usePlans()` hook
- [ ] Implement `useWorkoutLogs()` hook
- [ ] Implement `useConfig()` hook

### 2.4 Phase 2 Tests

**Unit Tests:**
- [ ] `storage.ts` - CRUD operations with fake-indexeddb
- [ ] `useConfig` - config persistence and updates
- [ ] `useSchedule` - week calculation, queue advancement

**E2E Tests:**
- [ ] Settings page: change units, verify persistence after reload
- [ ] Data survives page refresh (localStorage + IndexedDB)

```typescript
// e2e/storage.spec.ts
test('settings persist across page reload', async ({ page }) => {
  await page.goto('/settings');
  await page.click('button:has-text("kg")');
  await page.reload();
  await expect(page.locator('button:has-text("kg")')).toHaveClass(/bg-primary/);
});
```

**Deliverables:**
- Working IndexedDB + localStorage abstraction
- React hooks for all data types
- Data persists across page reloads
- Unit tests for storage layer
- E2E test for settings persistence

---

## Phase 3: Plan Import & Exercise Database

**Goal:** Import AI-generated workout plans and auto-populate exercise database.

### 3.1 Plan Import
- [ ] Create JSON import UI (paste or file upload)
- [ ] Validate plan schema
- [ ] Extract unique exercise IDs from plan
- [ ] Auto-create exercise definitions for new exercises

### 3.2 Exercise Auto-Population
When importing a plan with unknown exercises:
1. Parse `exercise_id` to infer name (e.g., `bench_press_barbell` → "Bench Press (Barbell)")
2. Use `substitution_group` to infer `movement_pattern`
3. Infer `equipment_type` from exercise_id suffix
4. Create stub definition, allow user to enrich later

```typescript
function inferExerciseFromPlan(exerciseId: string, substitutionGroup: string): ExerciseDefinition {
  const name = exerciseId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const equipmentType = inferEquipmentType(exerciseId);
  const weightEntryMode = getWeightEntryMode(equipmentType);

  return {
    id: exerciseId,
    name,
    equipment_type: equipmentType,
    movement_pattern: substitutionGroup as MovementPattern,
    weight_entry_mode: weightEntryMode,
    primary_muscle_groups: [],
  };
}
```

### 3.3 Exercise Editor
- [ ] View/edit exercise details
- [ ] Override inferred values
- [ ] Add muscle groups, instructions
- [ ] Optional: Fetch metadata from wger.de API

### 3.4 Plan Builder (Manual Creation)
- [ ] Create new plan from scratch
- [ ] Add/remove/reorder workout days
- [ ] Add exercises from library
- [ ] Set targets (sets, reps, RPE, rest)

### 3.5 Phase 3 Tests

**Unit Tests:**
- [ ] `inferExerciseFromPlan()` - correct name/equipment/movement inference
- [ ] Plan validation - rejects invalid JSON, missing fields
- [ ] Plan ID generation - handles edge cases

**E2E Tests:**
- [ ] Import valid plan JSON → plan appears in list
- [ ] Import invalid JSON → shows error message
- [ ] Activate plan → appears on home dashboard
- [ ] Exercises auto-created when plan imported

```typescript
// e2e/plan-import.spec.ts
test('import plan and activate it', async ({ page }) => {
  await page.goto('/plans');
  await page.click('button:has-text("Import Plan")');
  await page.fill('textarea', JSON.stringify(samplePlan));
  await page.click('button:has-text("Import")');
  await expect(page.locator('text=Protocol Zero')).toBeVisible();
  await page.click('button:has-text("Activate")');
  await page.goto('/');
  await expect(page.locator('text=Day A')).toBeVisible();
});
```

**Deliverables:**
- Import JSON plan via paste or file
- Auto-generate exercise definitions
- View/edit exercise library
- Basic plan creation UI
- Unit tests for exercise inference
- E2E tests for plan import flow

---

## Phase 4: Active Workout UI

**Goal:** The core workout execution experience with smart logging.

### 4.1 Workout Flow
```
[Start Workout] → [Exercise List] → [Log Sets] → [Rest Timer] → [Next Exercise] → [Complete]
```

### 4.2 Smart Weight Entry Component
- [ ] Create `WeightInput` component that adapts to equipment type
- [ ] Show appropriate helper text ("Plates per side", "Stack weight", etc.)
- [ ] Calculate and display total weight in real-time
- [ ] Remember last weight for each exercise
- [ ] +/- buttons for quick adjustment

```typescript
interface WeightInputProps {
  exerciseId: string;
  equipmentType: EquipmentType;
  weightEntryMode: WeightEntryMode;
  barWeight?: number;
  value: number;
  onChange: (entered: number, calculated: number) => void;
}
```

### 4.3 Set Logger Component
- [ ] Display target (e.g., "Set 2 of 3 • Target: 8-10 reps @ RPE 7")
- [ ] Pre-fill weight from previous set or last session
- [ ] Reps counter with +/- buttons
- [ ] Optional RPE slider (tap to expand)
- [ ] Optional notes field (tap to expand)
- [ ] "Log Set" button triggers timer

### 4.4 Rest Timer
- [ ] Auto-start after logging a set
- [ ] Display time remaining prominently
- [ ] Audio alert at 30s, 10s, and 0s
- [ ] "Skip" and "+30s" buttons
- [ ] Works in background (Notification API fallback)

### 4.5 Exercise Substitution
- [ ] "Swap" button on each exercise
- [ ] Filter by same `substitution_group`
- [ ] Show list of alternatives from exercise DB
- [ ] Remember substitution in log (`was_substitution: true`)

### 4.6 Workout Completion
- [ ] Summary screen showing:
  - Duration
  - Total volume (sets × reps × weight)
  - Notable achievements (PRs, new 1RM estimates)
- [ ] Save log to storage
- [ ] Advance queue to next workout day
- [ ] Trigger background sync

### 4.7 Phase 4 Tests

**Unit Tests:**
- [ ] Weight calculation for all equipment types (barbell, dumbbell, machine, etc.)
- [ ] `calculateTotalWeight()` - plates per side → total
- [ ] `useTimer` hook - countdown, pause, resume, callbacks
- [ ] `addSetToExercise()` - correctly adds sets to log

**E2E Tests:**
- [ ] Start workout → log a set → timer auto-starts
- [ ] Smart weight entry: barbell shows "plates per side", machine shows "stack weight"
- [ ] Complete workout → summary shows, log saved
- [ ] Exercise substitution → swap appears in log as substitution
- [ ] Timer skip and +30s buttons work

```typescript
// e2e/workout.spec.ts
test('complete a workout with multiple sets', async ({ page }) => {
  // Assumes plan is already imported and activated
  await page.goto('/');
  await page.click('button:has-text("Start Workout")');

  // Log first set
  await page.fill('[data-testid="weight-input"]', '135');
  await page.fill('[data-testid="reps-input"]', '10');
  await page.click('button:has-text("Log Set")');

  // Timer should auto-start
  await expect(page.locator('[data-testid="timer"]')).toBeVisible();
  await page.click('button:has-text("Skip")');

  // Complete workout
  await page.click('button:has-text("Complete Workout")');
  await expect(page.locator('text=Workout Complete')).toBeVisible();
});
```

**Deliverables:**
- Full workout execution flow
- Smart weight entry by equipment type
- Auto rest timer with audio
- Exercise substitution
- Workout summary
- Unit tests for weight calculations and timer
- E2E tests for complete workout flow

---

## Phase 5: Progress Dashboard & Statistics

**Goal:** Visualize progress with statistical rigor.

### 5.1 Home Dashboard
- [ ] "Next Workout" card (from flexible queue)
- [ ] Weekly goal progress (e.g., "1 of 2 sessions this week")
- [ ] Recent workouts list (last 5 sessions)
- [ ] Quick stats (total volume this week, streak)

### 5.2 Session History
- [ ] List of all past workouts
- [ ] Filter by plan, date range
- [ ] Session detail view (all exercises and sets)

### 5.3 Exercise Progress Charts
- [ ] Select exercise from dropdown
- [ ] Calculate estimated 1RM for each valid set (RPE ≥ 7 or failure)
- [ ] Plot 1RM over time with rolling average
- [ ] Display confidence bands (rolling standard deviation)
- [ ] Trend indicator (improving, plateau, declining)

### 5.4 Statistical Calculations
```typescript
// Epley formula for 1RM estimation
function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// Rolling statistics for trend analysis
function calculateTrend(dataPoints: { date: Date; value: number }[], windowSize = 5) {
  const values = dataPoints.map(d => d.value);
  const rollingMean = movingAverage(values, windowSize);
  const rollingStd = movingStdDev(values, windowSize);
  const trend = linearRegression(dataPoints.map((d, i) => [i, d.value]));

  return {
    currentMean: rollingMean[rollingMean.length - 1],
    currentStd: rollingStd[rollingStd.length - 1],
    trendSlope: trend.slope,
    isSignificant: Math.abs(trend.slope) > threshold,
  };
}
```

### 5.5 Chart Library
- [ ] Use Recharts or Chart.js for visualization
- [ ] Line chart with error bands
- [ ] Responsive design for mobile

### 5.6 Phase 5 Tests

**Unit Tests:**
- [ ] `estimate1RM()` - Epley formula accuracy
- [ ] `calculateTrend()` - rolling average, std dev, slope
- [ ] `calculateSessionVolume()` - correct volume calculation
- [ ] `getBestSet()` - filters by RPE, returns highest 1RM

**E2E Tests:**
- [ ] Dashboard shows weekly progress bar correctly
- [ ] Session history lists completed workouts
- [ ] Progress chart renders with logged data
- [ ] Exercise dropdown filters chart data

```typescript
// e2e/progress.spec.ts
test('view progress after logging workouts', async ({ page }) => {
  // Assumes workouts have been logged
  await page.goto('/progress');
  await page.selectOption('select', 'bench_press_barbell');
  await expect(page.locator('[data-testid="progress-chart"]')).toBeVisible();
  await expect(page.locator('text=Estimated 1RM')).toBeVisible();
});
```

**Deliverables:**
- Home dashboard with next workout and weekly goal
- Session history with detail view
- Per-exercise 1RM trend charts with confidence bands
- Trend analysis (improving/plateau/declining)
- Unit tests for statistical calculations
- E2E tests for dashboard and progress views

---

## Phase 6: GitHub Sync & Authentication

**Goal:** Persist data to GitHub repo with OAuth authentication.

### 6.1 GitHub OAuth Flow
- [ ] Set up GitHub OAuth App (in repo settings)
- [ ] Implement OAuth redirect flow for GitHub Pages
- [ ] Store access token securely (encrypted in localStorage)
- [ ] Handle token refresh/expiration

Note: GitHub Pages can't run server-side code, so we'll need a serverless function (GitHub Actions or external service like Netlify Functions) to exchange the OAuth code for a token.

### 6.2 Data Sync Architecture
```
[Local Storage] ←→ [Sync Service] ←→ [GitHub Repo /data folder]
```

Data files in repo:
```
/data/
  exercises.json      # Exercise definitions (append-only, merge on read)
  plans/
    protocol_zero.json
    hypertrophy_block.json
  logs/
    2026-01-20-macbook.jsonl   # Per-device log files
    2026-01-20-iphone.jsonl    # Append-only, never overwritten
    2026-01-21-macbook.jsonl
  config.json         # User config + schedule
```

### 6.3 Sync Strategy: Append-Only Log Streams

**Key insight:** Avoid merge conflicts by making them structurally impossible.

**How it works:**
- Each device writes to its own log file: `{date}-{device_id}.jsonl`
- Phone writes to `...-iphone.jsonl`, laptop writes to `...-macbook.jsonl`
- Files are append-only - never edited, only new entries added
- On read: app fetches all files in `/logs/` folder and merges in memory

**Benefits:**
- Zero merge conflicts - devices never touch each other's files
- GitHub handles concurrent file creation perfectly
- Full audit trail - no data ever lost

**Implementation:**
```typescript
// Generate unique device ID on first launch
const deviceId = localStorage.getItem('device_id') || generateDeviceId();

// Log file path for today
function getLogFilePath(): string {
  const date = new Date().toISOString().split('T')[0]; // "2026-01-20"
  return `data/logs/${date}-${deviceId}.jsonl`;
}

// Reading: merge all log files
async function getAllLogs(): Promise<WorkoutLog[]> {
  const files = await github.getDirectoryContents('data/logs');
  const logs = await Promise.all(
    files.map(f => github.getFileContents(f.path))
  );
  return logs.flatMap(parseJsonLines).sort(byTimestamp);
}
```

- [ ] Generate stable device ID on first launch
- [ ] Write logs to device-specific JSONL files
- [ ] Read all log files and merge on load
- [ ] Use GitHub API to list directory and fetch files

### 6.4 Offline Queue
- [ ] Queue changes when offline
- [ ] Persist queue in IndexedDB
- [ ] Process queue when connection returns
- [ ] Show sync status indicator in UI

### 6.5 Phase 6 Tests

**Unit Tests:**
- [ ] `getLogFilePath()` - correct date/device format
- [ ] Log merge logic - combines multiple device files correctly
- [ ] Offline queue - changes queued when offline

**E2E Tests (with mocked GitHub API):**
- [ ] OAuth redirect flow works
- [ ] Sync indicator shows status
- [ ] Offline changes sync when back online
- [ ] Multi-device logs merge correctly

```typescript
// e2e/sync.spec.ts
test('offline changes queue and sync', async ({ page, context }) => {
  await context.setOffline(true);
  await page.goto('/workout');
  // Log a set while offline
  await page.fill('[data-testid="weight-input"]', '135');
  await page.click('button:has-text("Log Set")');

  // Should show offline indicator
  await expect(page.locator('[data-testid="sync-status"]')).toHaveText('Offline');

  await context.setOffline(false);
  // Should auto-sync
  await expect(page.locator('[data-testid="sync-status"]')).toHaveText('Synced');
});
```

**Deliverables:**
- GitHub OAuth login
- Bi-directional sync with repo
- Offline queue with background sync
- Sync status indicator
- Unit tests for sync logic
- E2E tests for offline/online sync flow

---

## Phase 7: PWA & Polish

**Goal:** Full PWA experience with offline support and final polish.

### 7.1 Service Worker
- [ ] Configure Workbox via vite-plugin-pwa
- [ ] Cache app shell (HTML, JS, CSS)
- [ ] Cache exercise images (if any)
- [ ] Background sync for pending changes

### 7.2 PWA Manifest
```json
{
  "name": "GitHub Fitness",
  "short_name": "GH Fitness",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#3b82f6",
  "icons": [...]
}
```

### 7.3 Install Prompt
- [ ] Detect installability
- [ ] Show custom "Add to Home Screen" prompt
- [ ] Track installation

### 7.4 Notifications
- [ ] Request notification permission
- [ ] Timer completion notifications (when app is backgrounded)
- [ ] Optional: Workout reminder notifications

### 7.5 UI Polish
- [ ] Dark mode (default for gym use)
- [ ] Loading states and skeletons
- [ ] Error boundaries
- [ ] Haptic feedback on mobile (if available)
- [ ] Accessibility audit (ARIA labels, keyboard nav)

### 7.6 Plate Math Feature
- [ ] Calculate optimal plate loading for target weight
- [ ] Display visual plate diagram
- [ ] Handle "impossible" weights (suggest closest achievable)

### 7.7 Phase 7 Tests

**Unit Tests:**
- [ ] Plate math algorithm - optimal plate selection
- [ ] Plate math edge cases - impossible weights, suggest closest

**E2E Tests:**
- [ ] PWA installs successfully
- [ ] App works fully offline (service worker caches assets)
- [ ] Timer notification fires when app is backgrounded
- [ ] Plate math shows correct plates for various weights

```typescript
// e2e/pwa.spec.ts
test('app works offline', async ({ page, context }) => {
  // Load app while online to cache
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Go offline
  await context.setOffline(true);
  await page.reload();

  // App should still work
  await expect(page.locator('text=GitHub Fitness')).toBeVisible();
  await page.goto('/settings');
  await expect(page.locator('text=Settings')).toBeVisible();
});
```

**Deliverables:**
- Installable PWA
- Works fully offline
- Timer notifications
- Plate math calculator
- Polished, accessible UI
- E2E tests for offline functionality

---

## Phase 8: Final Integration & Launch

### 8.1 Full Integration Tests
By this phase, unit and E2E tests have been built progressively. Final integration tests verify the complete user journey:

- [ ] **Happy path E2E**: Import plan → Activate → Complete 3 workouts → View progress chart
- [ ] **Multi-session test**: Log workouts across multiple sessions, verify data integrity
- [ ] **Cross-device simulation**: Test log merge from multiple device IDs
- [ ] **Error recovery**: Network failures, invalid data, storage quota exceeded

```typescript
// e2e/integration.spec.ts
test('complete user journey: plan to progress', async ({ page }) => {
  // Import and activate plan
  await page.goto('/plans');
  await importPlan(page, samplePlan);
  await page.click('button:has-text("Activate")');

  // Complete 3 workouts
  for (let i = 0; i < 3; i++) {
    await page.goto('/');
    await page.click('button:has-text("Start Workout")');
    await completeWorkout(page);
  }

  // Verify progress
  await page.goto('/progress');
  await page.selectOption('select', 'bench_press_barbell');
  const chartPoints = await page.locator('[data-testid="chart-point"]').count();
  expect(chartPoints).toBeGreaterThanOrEqual(3);
});
```

### 8.2 Documentation
- [ ] README with setup instructions
- [ ] Document JSON schema for AI plan generation
- [ ] Prompt template for generating workout plans

### 8.3 Deployment
- [ ] Configure GitHub Pages deployment
- [ ] Set up GitHub Actions for CI/CD
- [ ] Custom domain (optional)

---

## Development Sequence

Recommended build order to get to usable state fastest.

**Testing Philosophy:** Each phase includes its own tests. Write tests alongside features, not after.

1. **Phase 1** - Project setup + testing infrastructure + type helper tests
2. **Phase 2** - Storage layer + storage unit tests + settings E2E
3. **Phase 3.1-3.2** - Plan import + inference tests + import E2E ← **Can import plans**
4. **Phase 4** - Active workout UI + weight calc tests + workout E2E ← **First usable milestone**
5. **Phase 5.1-5.2** - Dashboard + history + dashboard E2E
6. **Phase 7.1-7.2** - Basic PWA/offline + offline E2E ← **Second milestone: offline works**
7. **Phase 5.3-5.4** - Statistics + charts + stats unit tests
8. **Phase 6** - GitHub sync + sync tests
9. **Phase 3.3-3.4** - Exercise editor + plan builder
10. **Phase 7.3-7.6** - Polish
11. **Phase 8** - Final integration tests + launch

**Test Commands:**
```bash
npm run test        # Run unit tests (Vitest)
npm run test:e2e    # Run E2E tests (Playwright)
npm run test:all    # Run all tests
```

---

## Technical Decisions

### 1. GitHub OAuth Proxy: Cloudflare Worker

Since GitHub Pages is static, we need a tiny middleware to exchange the OAuth code for an access token. Cloudflare Workers (free tier: 100k requests/day) is the best choice - fast, free, and separate from the frontend build.

```javascript
// worker.js (deployed to Cloudflare)
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) return new Response("Missing code", { status: 400 });

    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code
      })
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      headers: {
        "Access-Control-Allow-Origin": "https://your-username.github.io",
        "Content-Type": "application/json"
      }
    });
  }
};
```

### 2. Chart Library: Recharts

Recharts is the best fit because:
- Composable JSX API (`<LineChart><Line /><XAxis /></LineChart>`)
- Native React components, not a wrapper
- Built-in `<ErrorBar />` component for confidence bands
- Handles responsive containers well

### 3. Timer Audio: use-sound (Howler.js wrapper)

Raw HTML5 Audio gets blocked on mobile if the user hasn't recently interacted with the page. `use-sound` (Howler.js wrapper) handles audio context unlocking automatically, especially important for iOS Safari.

```typescript
import useSound from 'use-sound';
import timerEndSound from '@/assets/sounds/timer-end.mp3';

const [playTimerEnd] = useSound(timerEndSound);
```

### 4. Exercise Images: CDN + Workbox Caching

Do NOT bundle images - it bloats the JS bundle.

**Strategy:**
- Use raw URLs from `yuhonas/free-exercise-db` repo
- Configure Workbox to cache images with `CacheFirst` strategy
- Images available offline after first load

```typescript
// vite.config.ts - Workbox config
workbox: {
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/raw\.githubusercontent\.com\/yuhonas\/free-exercise-db/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'exercise-images',
        expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }
      }
    }
  ]
}

---

## Success Criteria

MVP is complete when:
- [ ] Can import a JSON workout plan
- [ ] Can execute a workout with smart weight logging
- [ ] Rest timer works with audio alerts
- [ ] Can view progress charts for exercises
- [ ] Works offline (PWA installed)
- [ ] Data syncs to GitHub repo
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Full integration test (plan → workouts → progress) passes
