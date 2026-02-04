# Hooks (src/hooks)

Custom React hooks for data access and shared logic.

## Files

```
src/hooks/
├── useExercises.ts       # Exercise CRUD operations
├── useExercises.test.ts
├── usePlans.ts           # Workout plan management
├── usePlans.test.ts
├── useWorkoutLogs.ts     # Workout history
├── useWorkoutLogs.test.ts
├── useConfig.ts          # User preferences
├── useSchedule.ts        # Active workout schedule
├── useSync.ts            # GitHub Gist sync
├── useTimer.ts           # Countdown timer
├── useNotifications.ts   # Push notifications
└── index.ts              # Exports
```

## useExercises

CRUD operations for exercise library.

```typescript
const {
  exercises,        // ExerciseDefinition[]
  loading,          // boolean
  error,            // Error | null
  getExercise,      // (id: string) => ExerciseDefinition | undefined
  saveExercise,     // (exercise: ExerciseDefinition) => Promise<void>
  deleteExercise,   // (id: string) => Promise<void>
  getByMovement,    // (pattern: string) => ExerciseDefinition[]
  getByEquipment,   // (equipment: string) => ExerciseDefinition[]
  refresh,          // () => Promise<void>
} = useExercises();
```

**Usage:**
```tsx
function ExerciseList() {
  const { exercises, loading, deleteExercise } = useExercises();

  if (loading) return <Spinner />;

  return exercises.map(ex => (
    <ExerciseItem
      key={ex.id}
      exercise={ex}
      onDelete={() => deleteExercise(ex.id)}
    />
  ));
}
```

## usePlans

Workout plan management.

```typescript
const {
  plans,            // WorkoutPlan[]
  loading,          // boolean
  error,            // Error | null
  getPlan,          // (id: string) => WorkoutPlan | undefined
  savePlan,         // (plan: WorkoutPlan) => Promise<void>
  deletePlan,       // (id: string) => Promise<void>
  refresh,          // () => Promise<void>
} = usePlans();
```

## useWorkoutLogs

Workout history and active session.

```typescript
const {
  logs,             // WorkoutLog[]
  loading,          // boolean
  error,            // Error | null
  activeLog,        // WorkoutLog | null (in-progress workout)
  getLog,           // (sessionId: string) => WorkoutLog | undefined
  saveLog,          // (log: WorkoutLog) => Promise<void>
  deleteLog,        // (sessionId: string) => Promise<void>
  getLogsForExercise, // (exerciseId: string) => WorkoutLog[]
  startWorkout,     // (planId: string, dayId: string) => Promise<WorkoutLog>
  endWorkout,       // (sessionId: string) => Promise<void>
  refresh,          // () => Promise<void>
} = useWorkoutLogs();
```

**Active workout flow:**
```tsx
function WorkoutPage() {
  const { activeLog, startWorkout, endWorkout, saveLog } = useWorkoutLogs();

  // Start workout
  const log = await startWorkout(planId, dayId);

  // Log a set
  log.performed_exercises[0].sets.push(newSet);
  await saveLog(log);

  // End workout
  await endWorkout(log.session_id);
}
```

## useConfig

User preferences (units, equipment, rest times).

```typescript
const {
  config,           // UserConfig
  loading,          // boolean
  updateConfig,     // (partial: Partial<UserConfig>) => void
} = useConfig();
```

**UserConfig shape:**
```typescript
interface UserConfig {
  weight_unit: 'lb' | 'kg';
  available_equipment: string[];
  rest_timer_default: number;  // seconds
  plate_inventory: number[];   // available plates
  // ...
}
```

## useSchedule

Active workout schedule state.

```typescript
const {
  schedule,         // UserSchedule | null
  loading,          // boolean
  setSchedule,      // (schedule: UserSchedule) => void
  clearSchedule,    // () => void
  getTodaysWorkout, // () => PlanDay | null
} = useSchedule();
```

## useSync

GitHub Gist synchronization.

```typescript
const {
  syncState,        // 'idle' | 'syncing' | 'error' | 'success'
  lastSync,         // Date | null
  error,            // Error | null
  sync,             // () => Promise<void>
  isConnected,      // boolean (has GitHub token)
  connect,          // () => void (start OAuth)
  disconnect,       // () => void (clear token)
} = useSync();
```

**Auto-sync pattern:**
```tsx
function App() {
  const { sync, isConnected } = useSync();

  // Sync on mount if connected
  useEffect(() => {
    if (isConnected) {
      sync();
    }
  }, []);
}
```

## useTimer

Countdown timer for rest periods.

```typescript
const {
  seconds,          // number (remaining)
  isRunning,        // boolean
  start,            // (duration: number) => void
  pause,            // () => void
  resume,           // () => void
  reset,            // () => void
  extend,           // (extraSeconds: number) => void
} = useTimer({
  onComplete: () => playSound(),
});
```

## useNotifications

Push notification permissions and scheduling.

```typescript
const {
  permission,       // 'granted' | 'denied' | 'default'
  requestPermission, // () => Promise<void>
  scheduleReminder, // (time: Date, message: string) => void
} = useNotifications();
```

## Testing Hooks

Hooks are tested with `@testing-library/react`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useExercises } from './useExercises';

test('loads exercises', async () => {
  const { result } = renderHook(() => useExercises());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.exercises.length).toBeGreaterThan(0);
});
```

## Common Patterns

### Optimistic Updates

```typescript
const saveExercise = async (exercise) => {
  // Update local state immediately
  setExercises(prev => [...prev, exercise]);

  // Persist to storage
  await storage.saveExercise(exercise);
};
```

### Error Recovery

```typescript
const [error, setError] = useState<Error | null>(null);

const refresh = async () => {
  setError(null);
  try {
    const data = await storage.getExercises();
    setExercises(data);
  } catch (e) {
    setError(e as Error);
  }
};
```

### Dependency Injection

Hooks use the storage layer from `src/lib/storage.ts`. For testing, storage is mocked via `fake-indexeddb`.
