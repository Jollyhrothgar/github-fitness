# Components (src/components)

React components organized by feature area.

## Directory Structure

```
src/components/
├── workout/          # Active workout session
│   ├── ExerciseCard.tsx      # Single exercise in workout
│   ├── SetLogger.tsx         # Log sets (weight, reps, RPE)
│   ├── WeightInput.tsx       # Weight entry with +/- buttons
│   ├── RestTimer.tsx         # Countdown timer between sets
│   ├── SubstitutionModal.tsx # Swap exercises
│   ├── ExerciseInfoModal.tsx # Exercise instructions
│   ├── WorkoutSummary.tsx    # Post-workout stats
│   └── index.ts
│
├── dashboard/        # Progress and history
│   ├── ProgressChart.tsx    # Volume/frequency charts (Recharts)
│   ├── SessionHistory.tsx   # List of past workouts
│   ├── SessionDetail.tsx    # Single workout details
│   ├── TrendIndicator.tsx   # Up/down trend arrows
│   └── index.ts
│
├── plan/             # Plan management
│   ├── PlanBuilder.tsx      # Create/edit workout plans
│   └── index.ts
│
├── ui/               # Shared UI components
│   ├── ErrorBoundary.tsx    # React error boundary
│   ├── InstallPrompt.tsx    # PWA install banner
│   ├── PlateMath.tsx        # Plate calculator display
│   ├── SyncStatus.tsx       # Sync indicator
│   ├── GitHubConnect.tsx    # GitHub OAuth button
│   └── index.ts
│
└── layout/
    └── Layout.tsx           # App shell with nav
```

## workout/

Components for the active workout experience.

### ExerciseCard.tsx

Displays a single exercise during a workout with:
- Exercise name and target sets/reps
- Expand/collapse for set logging
- Progress indicator (completed sets)
- Info button for instructions
- Substitute button

### SetLogger.tsx

Log individual sets:
- Weight input (auto-filled from last set)
- Rep count selector
- RPE slider (optional)
- PR indicator when detected

### WeightInput.tsx

Numeric weight entry with:
- +/- buttons for quick adjustment
- Configurable increment (2.5, 5 lbs/kg)
- Unit display based on user config

### RestTimer.tsx

Countdown timer:
- Visual countdown with progress ring
- Skip/extend buttons
- Sound notification when done
- Auto-starts after logging set

### ExerciseInfoModal.tsx

Shows exercise details:
- Instructions from exercise definition
- Target muscles
- Equipment needed
- Video placeholder (future)

### SubstitutionModal.tsx

Swap exercise during workout:
- Shows exercises in same substitution group
- Preview of alternative
- One-tap swap

### WorkoutSummary.tsx

Post-workout recap:
- Total volume
- Duration
- PRs achieved
- Exercises completed

## dashboard/

Progress tracking and history visualization.

### ProgressChart.tsx

Recharts-based charts:
- Weekly volume trend
- Exercise frequency
- PR timeline

### SessionHistory.tsx

List of past workouts:
- Date and duration
- Exercises performed
- Quick volume summary
- Tap to view details

### SessionDetail.tsx

Full workout breakdown:
- Each exercise with all sets
- Volume calculations
- PRs marked
- Delete option

### TrendIndicator.tsx

Simple trend arrow:
- Up (green) / Down (red) / Flat
- Percentage change display

## plan/

### PlanBuilder.tsx

Full plan creation/editing:
- Plan metadata (name, days/week)
- Day builder with exercise selection
- Drag-to-reorder (future)
- Import from JSON

## ui/

Shared utility components.

### ErrorBoundary.tsx

Catches React errors:
- Shows fallback UI
- Reset button to recover

### InstallPrompt.tsx

PWA install banner:
- Detects installability
- Platform-specific instructions
- Dismissible

### PlateMath.tsx

Visual plate calculator:
- Shows plates needed per side
- Color-coded by weight
- Considers available plates from config

### SyncStatus.tsx

Sync indicator:
- Last sync time
- Sync in progress spinner
- Error state with retry

### GitHubConnect.tsx

GitHub OAuth:
- Connect/disconnect button
- Shows connected username
- Initiates OAuth flow

## layout/

### Layout.tsx

App shell:
- Bottom navigation (Home, Plans, Exercises, Progress, Settings)
- Header with title
- Main content area
- Handles routing indicators

## Common Patterns

### State Management

Components use hooks from `src/hooks/`:

```tsx
import { useExercises } from '@/hooks';

function MyComponent() {
  const { exercises, loading, saveExercise } = useExercises();
  // ...
}
```

### Styling

TailwindCSS utility classes:

```tsx
<div className="flex flex-col gap-4 p-4 bg-gray-900 rounded-lg">
  <h2 className="text-xl font-bold text-white">Title</h2>
</div>
```

### Loading States

```tsx
if (loading) {
  return <div className="animate-pulse">Loading...</div>;
}
```

### Error Handling

Wrap in ErrorBoundary at page level:

```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <MyComponent />
</ErrorBoundary>
```
