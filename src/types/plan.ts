export interface PlanMeta {
  plan_name: string;
  plan_id?: string; // Auto-generated if not provided
  author_agent?: string;
  version: string;
  focus?: string; // e.g., "hypertrophy", "strength", "recomposition"
  duration_weeks?: number;
  days_per_week: number;
  notes?: string;
  suggested_weekly_schedule?: string[]; // Optional hint: ["Monday", "Thursday"]
  created_at?: string;
  updated_at?: string;
}

export interface PlannedExercise {
  order: number;
  exercise_id: string;
  substitution_group: string; // Movement pattern for swaps
  sets: number;
  target_reps: string; // "8-10" or "30 seconds" or "20 meters"
  target_rpe?: number; // 1-10 scale
  rest_seconds: number;
  notes?: string;
  progression_logic?: ProgressionLogic;
}

export type ProgressionLogic =
  | 'linear_load_2.5lbs'
  | 'linear_load_5lbs'
  | 'linear_load_2.5kg'
  | 'double_progression_add_weight_at_top_reps'
  | 'rpe_based'
  | 'none';

export interface WorkoutDay {
  id: string; // e.g., "day_a", "day_b"
  day_name: string; // e.g., "Day A - Push Focus"
  day_order: number;
  exercises: PlannedExercise[];
}

export interface WorkoutPlan {
  plan_meta: PlanMeta;
  schedule: WorkoutDay[];
}

// Parse rep targets into min/max
export function parseRepTarget(target: string): { min: number; max: number; unit: 'reps' | 'seconds' | 'meters' } {
  // Handle time-based: "30 seconds"
  if (target.toLowerCase().includes('second')) {
    const match = target.match(/(\d+)/);
    const value = match ? parseInt(match[1], 10) : 30;
    return { min: value, max: value, unit: 'seconds' };
  }

  // Handle distance-based: "20 meters"
  if (target.toLowerCase().includes('meter')) {
    const match = target.match(/(\d+)/);
    const value = match ? parseInt(match[1], 10) : 20;
    return { min: value, max: value, unit: 'meters' };
  }

  // Handle rep ranges: "8-10" or single value "10"
  if (target.includes('-')) {
    const [min, max] = target.split('-').map((s) => parseInt(s.trim(), 10));
    return { min, max, unit: 'reps' };
  }

  const value = parseInt(target, 10);
  return { min: value, max: value, unit: 'reps' };
}

// Generate a plan ID from name
export function generatePlanId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
