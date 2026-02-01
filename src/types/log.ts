export interface LoggedSet {
  set_number: number;
  is_warmup: boolean;
  weight_entered: number; // What user typed in the input
  weight_calculated: number; // After bar/equipment calculation
  unit: 'lbs' | 'kg';
  reps?: number; // For rep-based sets
  duration_seconds?: number; // For timed sets
  distance_meters?: number; // For distance-based sets
  rpe?: number; // Rate of Perceived Exertion (1-10)
  failure: boolean;
  notes?: string;
  timestamp: string; // ISO string
  calculated_1rm?: number; // Estimated 1RM from this set
}

export interface PerformedExercise {
  exercise_id: string;
  was_substitution: boolean;
  original_exercise_id?: string; // If substituted, what was planned
  sets: LoggedSet[];
}

export interface WorkoutLog {
  session_id: string; // UUID
  plan_ref: string; // Plan ID this workout is from
  day_id: string; // Which day of the plan (e.g., "day_a")
  timestamp_start: string; // ISO string
  timestamp_end?: string; // ISO string, set on completion
  body_weight_kg?: number; // Optional pre-workout weigh-in
  subjective_readiness?: number; // 1-10 scale, how you felt before workout
  performed_exercises: PerformedExercise[];
  notes?: string;
  device_id: string; // For multi-device sync
}

// Calculate estimated 1RM using Epley formula
// 1RM = weight × (1 + reps/30)
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// Calculate total volume for an exercise (working sets only)
export function calculateExerciseVolume(exercise: PerformedExercise): number {
  return exercise.sets
    .filter((set) => !set.is_warmup)
    .reduce((total, set) => {
      const reps = set.reps ?? 0;
      return total + set.weight_calculated * reps;
    }, 0);
}

// Calculate total session volume
export function calculateSessionVolume(log: WorkoutLog): number {
  return log.performed_exercises.reduce(
    (total, ex) => total + calculateExerciseVolume(ex),
    0
  );
}

// Get the best set from an exercise (highest calculated 1RM with RPE >= 7)
export function getBestSet(exercise: PerformedExercise): LoggedSet | null {
  const validSets = exercise.sets.filter(
    (set) =>
      !set.is_warmup &&
      set.reps &&
      set.reps > 0 &&
      (set.rpe === undefined || set.rpe >= 7 || set.failure)
  );

  if (validSets.length === 0) return null;

  return validSets.reduce((best, current) => {
    const bestRM = best.calculated_1rm ?? estimate1RM(best.weight_calculated, best.reps ?? 0);
    const currentRM = current.calculated_1rm ?? estimate1RM(current.weight_calculated, current.reps ?? 0);
    return currentRM > bestRM ? current : best;
  });
}

// Format duration for display
export function formatDuration(startIso: string, endIso?: string): string {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}
