# Core Libraries (src/lib)

Storage, sync, and utility functions for the fitness app.

## Files

```
src/lib/
├── storage.ts        # IndexedDB + localStorage management
├── storage.test.ts   # Storage tests
├── sync.ts           # GitHub repo sync logic
├── sync.test.ts      # Sync tests
├── github.ts         # GitHub API client
├── oauth.ts          # OAuth flow helpers
├── calculations.ts   # Volume/PR calculations
├── calculations.test.ts
├── haptics.ts        # Vibration feedback
└── index.ts          # Exports
```

## storage.ts

The data layer for all persistent storage. Uses IndexedDB for structured data and localStorage for config.

### Database Schema

```typescript
interface FitnessDBSchema extends DBSchema {
  exercises: {
    key: string;
    value: ExerciseDefinition;
    indexes: { 'by-movement': string; 'by-equipment': string };
  };
  plans: {
    key: string;  // plan_meta.plan_id
    value: WorkoutPlan;
  };
  logs: {
    key: string;  // session_id
    value: WorkoutLog;
    indexes: { 'by-date': string; 'by-plan': string };
  };
}
```

### Seed Data System

Default exercises are seeded on first load and can be updated:

```typescript
const SEED_DATA_VERSION = 3;  // Bump to trigger re-merge

async function ensureSeedData(): Promise<void> {
  // First load: seed all exercises
  // Version bump: merge new fields (instructions, etc.) into existing
}
```

**When to bump SEED_DATA_VERSION:**
- Adding new seed exercises
- Adding instructions to existing exercises
- Fixing data in seed exercises

### Key Functions

| Function | Purpose |
|----------|---------|
| `getDB()` | Get singleton DB instance |
| `ensureSeedData()` | Seed/update default exercises |
| `getExercises()` | Get all exercises |
| `saveExercise(exercise)` | Save single exercise |
| `getPlans()` | Get all workout plans |
| `savePlan(plan)` | Save workout plan |
| `getLogs(options?)` | Get workout logs (optional limit, planRef) |
| `saveLog(log)` | Save workout log |
| `getIncompleteLog()` | Get in-progress workout |
| `getConfig()` | Get user config (localStorage) |
| `saveConfig(config)` | Save user config |
| `getSchedule()` | Get active schedule |
| `saveSchedule(schedule)` | Save schedule |
| `getTombstones()` | Get deleted log markers |
| `addTombstone(sessionId, deviceId)` | Mark log as deleted |
| `exportData()` | Export all data for backup |
| `importData(data)` | Import data from backup |

### localStorage Keys

| Key | Purpose |
|-----|---------|
| `gh-fitness-config` | User preferences (units, rest times) |
| `gh-fitness-schedule` | Active workout schedule |
| `gh-fitness-last-sync` | Last sync timestamp |
| `gh-fitness-seed-version` | Seed data version |
| `gh-fitness-seeded` | First seed completed flag |
| `gh-fitness-tombstones` | Deleted log markers |
| `gh-fitness-active-session` | Current workout session ID |

## sync.ts

Bi-directional sync with a GitHub repository via the Contents API.

### Sync Strategy

1. **Pull**: Fetch files from repo, merge with local (prefer newer timestamps)
2. **Push**: Upload local changes to repo as file commits
3. **Conflict resolution**: Last-write-wins based on timestamps
4. **Tombstones**: Track deleted logs to prevent resurrection

### Key Functions

| Function | Purpose |
|----------|---------|
| `fullSync()` | Full bi-directional sync |
| `processSyncQueue()` | Process pending changes in queue |
| `queueLogSync(log)` | Queue a workout log for sync |
| `queueExercisesSync()` | Queue exercises for sync |
| `queuePlanSync(plan)` | Queue a plan for sync |
| `saveAuthConfig(config)` | Save GitHub auth (token, username, repo) |
| `clearAuthConfig()` | Disconnect GitHub sync |
| `mergeLogs(local, remote, tombstones)` | Merge logs with conflict resolution |
| `mergeExercises(local, remote)` | Merge exercises (remote wins) |

### Repo Structure

```
data/
├── exercises.json           # All exercise definitions
├── tombstones.json          # Deleted log markers
├── plans/
│   └── {planId}.json        # Individual plan files
└── logs/
    └── {date}-{deviceId}.jsonl  # JSONL log files per device per day

```

## github.ts

GitHub API client for repository file operations via the Contents API.

### Key Functions

| Function | Purpose |
|----------|---------|
| `verifyAccess()` | Check token validity and repo access |
| `getFile(path)` | Get file contents (base64) |
| `getFileContent<T>(path)` | Get decoded JSON file content |
| `getFileContentRaw(path)` | Get raw file content (for JSONL) |
| `listDirectory(path)` | List directory contents |
| `putFile(path, content, message)` | Create or update a file |
| `appendToFile(path, line, message)` | Append line to file (for JSONL logs) |
| `deleteFile(path, message)` | Delete a file |
| `getTree(path?)` | Get recursive directory tree |
| `ensureDataStructure()` | Create data/, data/logs/, data/plans/ dirs |

## calculations.ts

Workout math and analysis.

### Key Functions

| Function | Purpose |
|----------|---------|
| `calculateVolume(sets)` | Total volume (weight × reps) |
| `calculateOneRepMax(weight, reps)` | Estimated 1RM |
| `detectPR(exercise, newSet, history)` | Check if set is a PR |
| `calculatePlateLoadout(weight, barWeight, plates)` | Plates needed per side |
| `formatWeight(value, unit)` | Display weight with unit |

## haptics.ts

Mobile haptic feedback.

```typescript
export function vibrate(pattern: number | number[]): void;
export function vibrateSuccess(): void;  // Short pulse
export function vibrateError(): void;    // Double pulse
```
