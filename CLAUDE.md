# GitHub Fitness

PWA for tracking AI-generated workout plans with GitHub Gist sync.

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:5173
npm run test         # Run unit tests (vitest)
npm run test:e2e     # Run E2E tests (playwright)
npm run build        # Build for production
```

## Development Practices

- **Version bumps**: Always update `package.json` version when pushing changes
  - Patch (0.x.Y): Bug fixes, small changes
  - Minor (0.X.0): New features
  - Major (X.0.0): Breaking changes
  - Run `npm install --package-lock-only` after editing package.json
- **Testing**: Write tests for new functionality, especially data layer changes
- **TypeScript**: Strict types, avoid `any`
- **Components**: Functional components with hooks

## Project Structure

```
github-fitness/
├── src/
│   ├── pages/              # Route pages
│   │   ├── Home.tsx        # Landing page, today's workout
│   │   ├── Workout.tsx     # Active workout session
│   │   ├── Plans.tsx       # Workout plan management
│   │   ├── Exercises.tsx   # Exercise library
│   │   ├── Progress.tsx    # Stats and history
│   │   └── Settings.tsx    # User preferences
│   │
│   ├── components/         # React components (see src/components/CLAUDE.md)
│   │   ├── workout/        # Workout session UI
│   │   ├── dashboard/      # Progress charts and history
│   │   ├── plan/           # Plan builder
│   │   ├── ui/             # Shared UI components
│   │   └── layout/         # App shell
│   │
│   ├── hooks/              # Custom React hooks (see src/hooks/CLAUDE.md)
│   │   ├── useExercises.ts # Exercise CRUD
│   │   ├── usePlans.ts     # Plan management
│   │   ├── useWorkoutLogs.ts # Workout history
│   │   └── useSync.ts      # GitHub sync
│   │
│   ├── lib/                # Core utilities (see src/lib/CLAUDE.md)
│   │   ├── storage.ts      # IndexedDB + localStorage
│   │   ├── sync.ts         # GitHub Gist sync logic
│   │   ├── github.ts       # GitHub API client
│   │   └── calculations.ts # Volume, PR detection
│   │
│   ├── types/              # TypeScript definitions
│   │   ├── exercise.ts     # ExerciseDefinition
│   │   ├── plan.ts         # WorkoutPlan, PlanDay
│   │   ├── log.ts          # WorkoutLog, PerformedExercise
│   │   ├── config.ts       # UserConfig
│   │   └── sync.ts         # SyncState, LogTombstone
│   │
│   └── data/
│       └── seedExercises.ts # Default exercise library (15 exercises)
│
├── e2e/                    # Playwright E2E tests
├── public/                 # Static assets, PWA manifest
└── .github/workflows/      # CI/CD
    ├── ci.yml              # Tests on PR/push
    └── deploy.yml          # Deploy to GitHub Pages
```

## Key Components

| Component | Location | CLAUDE.md |
|-----------|----------|-----------|
| **Storage layer** | `src/lib/` | `src/lib/CLAUDE.md` |
| **React hooks** | `src/hooks/` | `src/hooks/CLAUDE.md` |
| **UI components** | `src/components/` | `src/components/CLAUDE.md` |

## Data Architecture

### Storage Layers

1. **IndexedDB** (via `idb` library) - Persistent structured data
   - `exercises` - Exercise definitions with instructions
   - `plans` - Workout plans with schedule
   - `logs` - Workout session history

2. **localStorage** - Config and sync metadata
   - `gh-fitness-config` - User preferences (units, equipment, rest timers)
   - `gh-fitness-schedule` - Active workout schedule
   - `gh-fitness-last-sync` - Last sync timestamp
   - `gh-fitness-seed-version` - Seed data version for updates

3. **GitHub Gist** - Cloud backup/sync
   - Stores exercises, plans, logs as JSON
   - Bi-directional sync with conflict resolution

### Seed Data Versioning

Exercise seed data has a version number (`SEED_DATA_VERSION` in storage.ts). When bumped:
1. App detects version mismatch on load
2. Merges new seed fields into existing exercises
3. Preserves user customizations

**Bump this when**: Adding instructions, new exercises, or fixing seed data.

## Workflows

### Adding a Feature

1. Add types in `src/types/`
2. Add storage functions in `src/lib/storage.ts`
3. Create hook in `src/hooks/`
4. Build component in `src/components/`
5. Wire up in page component
6. Add tests (unit + E2E)
7. Bump version and push

### Debugging Sync Issues

1. Check `localStorage` for `gh-fitness-last-sync`
2. Check Gist content via GitHub API or web UI
3. Look at `tombstones` for deleted items
4. Check `device_id` for conflict resolution

### Updating Seed Exercises

1. Edit `src/data/seedExercises.ts`
2. Bump `SEED_DATA_VERSION` in `src/lib/storage.ts`
3. The merge logic in `ensureSeedData()` will apply updates

## Tech Stack

- **React 19** + TypeScript + Vite
- **TailwindCSS 4** for styling
- **IndexedDB** (via `idb`) for local storage
- **GitHub Gist API** for cloud sync
- **PWA** with service worker (vite-plugin-pwa)
- **Vitest** for unit tests
- **Playwright** for E2E tests

## Testing

```bash
npm run test         # Watch mode
npm run test:run     # Single run
npm run test:e2e     # E2E tests (requires build)
```

**Unit tests**: Co-located with source (`.test.ts` files)
**E2E tests**: In `e2e/` directory

## CI/CD

- **CI** (`ci.yml`): Runs on PR/push to main
  - Type check, unit tests, E2E tests
  - 20 min timeout, E2E has continue-on-error
- **Deploy** (`deploy.yml`): Deploys to GitHub Pages on main push

## Current State (Feb 2026)

- Full workout tracking with set logging
- Exercise library with instructions
- Plan builder with day scheduling
- Progress charts and PR detection
- GitHub Gist sync across devices
- PWA installable on mobile

## File Navigation

| I want to... | Go to... |
|--------------|----------|
| Fix storage/data bugs | `src/lib/storage.ts` |
| Add sync feature | `src/lib/sync.ts` |
| Modify workout UI | `src/components/workout/` |
| Add progress feature | `src/components/dashboard/` |
| Change data types | `src/types/` |
| Update seed exercises | `src/data/seedExercises.ts` |
| Add E2E test | `e2e/` |
