import type { ExerciseDefinition, WorkoutPlan, WorkoutLog } from '@/types';

// Sample exercise definitions for testing
export const sampleExercises: ExerciseDefinition[] = [
  {
    id: 'bench_press_barbell',
    name: 'Barbell Bench Press',
    equipment_type: 'barbell',
    movement_pattern: 'horizontal_push',
    primary_muscle_groups: ['chest', 'triceps', 'shoulders'],
    weight_entry_mode: 'plates_per_side',
    default_bar_weight_lbs: 45,
  },
  {
    id: 'squat_barbell',
    name: 'Barbell Squat',
    equipment_type: 'barbell',
    movement_pattern: 'knee_dominant',
    primary_muscle_groups: ['quadriceps', 'glutes', 'hamstrings'],
    weight_entry_mode: 'plates_per_side',
    default_bar_weight_lbs: 45,
  },
  {
    id: 'dumbbell_curl',
    name: 'Dumbbell Curl',
    equipment_type: 'dumbbell',
    movement_pattern: 'isolation',
    primary_muscle_groups: ['biceps'],
    weight_entry_mode: 'per_hand',
  },
  {
    id: 'lat_pulldown_machine',
    name: 'Lat Pulldown',
    equipment_type: 'machine',
    movement_pattern: 'vertical_pull',
    primary_muscle_groups: ['lats', 'biceps'],
    weight_entry_mode: 'total_weight',
  },
];

// Sample workout plan for testing
export const samplePlan: WorkoutPlan = {
  plan_meta: {
    plan_name: 'Test Plan',
    plan_id: 'test_plan',
    author_agent: 'Test',
    version: '1.0',
    focus: 'strength',
    duration_weeks: 4,
    days_per_week: 2,
  },
  schedule: [
    {
      id: 'day_a',
      day_name: 'Day A - Push',
      day_order: 1,
      exercises: [
        {
          order: 1,
          exercise_id: 'bench_press_barbell',
          substitution_group: 'horizontal_push',
          sets: 3,
          target_reps: '8-10',
          target_rpe: 7,
          rest_seconds: 120,
          notes: 'Focus on form',
        },
        {
          order: 2,
          exercise_id: 'dumbbell_curl',
          substitution_group: 'isolation',
          sets: 3,
          target_reps: '10-12',
          target_rpe: 8,
          rest_seconds: 60,
        },
      ],
    },
    {
      id: 'day_b',
      day_name: 'Day B - Pull',
      day_order: 2,
      exercises: [
        {
          order: 1,
          exercise_id: 'squat_barbell',
          substitution_group: 'knee_dominant',
          sets: 3,
          target_reps: '5-8',
          target_rpe: 8,
          rest_seconds: 180,
        },
        {
          order: 2,
          exercise_id: 'lat_pulldown_machine',
          substitution_group: 'vertical_pull',
          sets: 3,
          target_reps: '10-12',
          target_rpe: 7,
          rest_seconds: 90,
        },
      ],
    },
  ],
};

// Sample workout log for testing
export const sampleLog: WorkoutLog = {
  session_id: 'test-session-001',
  plan_ref: 'test_plan',
  day_id: 'day_a',
  timestamp_start: '2026-01-20T10:00:00Z',
  timestamp_end: '2026-01-20T11:00:00Z',
  device_id: 'test-device',
  body_weight_kg: 80,
  subjective_readiness: 7,
  performed_exercises: [
    {
      exercise_id: 'bench_press_barbell',
      was_substitution: false,
      sets: [
        {
          set_number: 1,
          is_warmup: true,
          weight_entered: 45,
          weight_calculated: 135,
          unit: 'lbs',
          reps: 10,
          rpe: 4,
          failure: false,
          timestamp: '2026-01-20T10:05:00Z',
        },
        {
          set_number: 2,
          is_warmup: false,
          weight_entered: 45,
          weight_calculated: 135,
          unit: 'lbs',
          reps: 10,
          rpe: 7,
          failure: false,
          timestamp: '2026-01-20T10:08:00Z',
          calculated_1rm: 180,
        },
        {
          set_number: 3,
          is_warmup: false,
          weight_entered: 50,
          weight_calculated: 145,
          unit: 'lbs',
          reps: 8,
          rpe: 8,
          failure: false,
          timestamp: '2026-01-20T10:12:00Z',
          calculated_1rm: 183.7,
        },
      ],
    },
  ],
};

// Counters for unique IDs
let logCounter = 0;
let exerciseCounter = 0;
let planCounter = 0;

// Create a workout log with custom data
export function createTestLog(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  logCounter++;
  const uniqueId = `${Date.now()}-${logCounter}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    ...sampleLog,
    session_id: overrides.session_id || `test-session-${uniqueId}`,
    timestamp_start: overrides.timestamp_start || new Date().toISOString(),
    performed_exercises: overrides.performed_exercises || sampleLog.performed_exercises,
    ...overrides,
  };
}

// Create a test exercise
export function createTestExercise(overrides: Partial<ExerciseDefinition> = {}): ExerciseDefinition {
  exerciseCounter++;
  const uniqueId = `${Date.now()}-${exerciseCounter}`;
  return {
    id: overrides.id || `test_exercise_${uniqueId}`,
    name: overrides.name || 'Test Exercise',
    equipment_type: overrides.equipment_type || 'barbell',
    movement_pattern: overrides.movement_pattern || 'horizontal_push',
    primary_muscle_groups: overrides.primary_muscle_groups || ['chest'],
    weight_entry_mode: overrides.weight_entry_mode || 'plates_per_side',
    ...overrides,
  };
}

// Create a test plan
export function createTestPlan(overrides: Partial<WorkoutPlan> = {}): WorkoutPlan {
  planCounter++;
  const uniqueId = `${Date.now()}-${planCounter}`;
  return {
    ...samplePlan,
    plan_meta: {
      ...samplePlan.plan_meta,
      plan_id: overrides.plan_meta?.plan_id || `test_plan_${uniqueId}`,
      plan_name: overrides.plan_meta?.plan_name || `Test Plan ${uniqueId}`,
      ...overrides.plan_meta,
    },
    schedule: overrides.schedule || samplePlan.schedule,
  };
}
