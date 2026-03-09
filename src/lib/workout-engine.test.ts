/**
 * Workout Engine Tests — Pure-function testing API for the core workout flow.
 *
 * Tests the workout lifecycle without any React/DOM dependencies:
 *   - Creating a session
 *   - Logging sets (including warmups and working sets)
 *   - Editing existing sets
 *   - Deleting sets
 *   - Exercise substitution mid-workout
 *   - Ending a workout early (partial completion)
 *   - Progress tracking
 *   - 1RM calculation on save
 */
import { describe, it, expect } from 'vitest';
import { addSetToExercise } from '@/hooks/useWorkoutLogs';
import { estimate1RM, calculateExerciseVolume, calculateSessionVolume, getBestSet } from '@/types/log';
import { isInRepRange } from '@/lib/calculations';
import type { WorkoutLog, LoggedSet, PerformedExercise, WorkoutDay } from '@/types';

// ---------------------------------------------------------------------------
// Helpers — a minimal "workout engine" API for tests
// ---------------------------------------------------------------------------

function createSession(planRef: string, dayId: string, deviceId = 'test-device'): WorkoutLog {
  return {
    session_id: `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    plan_ref: planRef,
    day_id: dayId,
    timestamp_start: new Date().toISOString(),
    performed_exercises: [],
    device_id: deviceId,
  };
}

function makeSet(overrides: Partial<LoggedSet> & { weight: number; reps: number }): LoggedSet {
  return {
    set_number: overrides.set_number ?? 1,
    is_warmup: overrides.is_warmup ?? false,
    weight_entered: overrides.weight,
    weight_calculated: overrides.weight_calculated ?? overrides.weight,
    unit: overrides.unit ?? 'lbs',
    reps: overrides.reps,
    failure: overrides.failure ?? false,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    rpe: overrides.rpe,
  };
}

function editSet(log: WorkoutLog, exerciseId: string, setIndex: number, updates: Partial<LoggedSet>): WorkoutLog {
  return {
    ...log,
    performed_exercises: log.performed_exercises.map((pe) => {
      if (pe.exercise_id !== exerciseId) return pe;
      const newSets = [...pe.sets];
      newSets[setIndex] = { ...newSets[setIndex], ...updates };
      return { ...pe, sets: newSets };
    }),
  };
}

function deleteSet(log: WorkoutLog, exerciseId: string, setIndex: number): WorkoutLog {
  return {
    ...log,
    performed_exercises: log.performed_exercises.map((pe) => {
      if (pe.exercise_id !== exerciseId) return pe;
      const newSets = pe.sets
        .filter((_, i) => i !== setIndex)
        .map((s, i) => ({ ...s, set_number: i + 1 }));
      return { ...pe, sets: newSets };
    }),
  };
}

function completeSession(log: WorkoutLog): WorkoutLog {
  return { ...log, timestamp_end: new Date().toISOString() };
}

function getProgress(log: WorkoutLog, day: WorkoutDay, substitutions: Map<string, string> = new Map()) {
  let completed = 0;
  const total = day.exercises.reduce((sum, ex) => sum + ex.sets, 0);

  for (const planned of day.exercises) {
    const actualId = substitutions.get(planned.exercise_id) ?? planned.exercise_id;
    const performed = log.performed_exercises.find((p) => p.exercise_id === actualId);
    const workingSets = performed?.sets.filter((s) => !s.is_warmup).length ?? 0;
    completed += Math.min(workingSets, planned.sets);
  }

  return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

// ---------------------------------------------------------------------------
// Test plan matching the user's "3-Day Functional Recomposition" Day A
// ---------------------------------------------------------------------------

const dayA: WorkoutDay = {
  id: 'day_a',
  day_name: 'Day A - Foundation & Power',
  day_order: 1,
  exercises: [
    { order: 1, exercise_id: 'trap_bar_deadlift', substitution_group: 'hip_dominant', sets: 3, target_reps: '5-8', target_rpe: 8, rest_seconds: 180 },
    { order: 2, exercise_id: 'bench_press_dumbbell', substitution_group: 'horizontal_push', sets: 3, target_reps: '8-10', target_rpe: 8, rest_seconds: 90 },
    { order: 3, exercise_id: 'pullups', substitution_group: 'vertical_pull', sets: 3, target_reps: 'AMRAP', target_rpe: 9, rest_seconds: 90 },
    { order: 4, exercise_id: 'goblet_squat', substitution_group: 'knee_dominant', sets: 3, target_reps: '12-15', target_rpe: 7, rest_seconds: 60 },
    { order: 5, exercise_id: 'ab_wheel_rollout', substitution_group: 'core', sets: 3, target_reps: '10-12', rest_seconds: 60 },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Workout Engine — session lifecycle', () => {
  it('creates a session with no performed exercises', () => {
    const session = createSession('functional_recomp_3day', 'day_a');
    expect(session.performed_exercises).toEqual([]);
    expect(session.timestamp_end).toBeUndefined();
    expect(session.plan_ref).toBe('functional_recomp_3day');
    expect(session.day_id).toBe('day_a');
  });

  it('completes a session by setting timestamp_end', () => {
    const session = createSession('plan', 'day_a');
    const completed = completeSession(session);
    expect(completed.timestamp_end).toBeDefined();
    expect(session.timestamp_end).toBeUndefined(); // original unchanged
  });
});

describe('Workout Engine — logging sets', () => {
  it('logs a warmup set followed by working sets', () => {
    let log = createSession('plan', 'day_a');

    // Warmup
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 135, reps: 8, set_number: 1, is_warmup: true }));
    expect(log.performed_exercises[0].sets).toHaveLength(1);
    expect(log.performed_exercises[0].sets[0].is_warmup).toBe(true);

    // Working sets
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 225, reps: 6, set_number: 2 }));
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 225, reps: 5, set_number: 3 }));
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 225, reps: 5, set_number: 4 }));

    const performed = log.performed_exercises[0];
    expect(performed.sets).toHaveLength(4);
    expect(performed.sets.filter((s) => !s.is_warmup)).toHaveLength(3);
  });

  it('logs sets across multiple exercises', () => {
    let log = createSession('plan', 'day_a');
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 225, reps: 6, set_number: 1 }));
    log = addSetToExercise(log, 'bench_press_dumbbell', makeSet({ weight: 50, reps: 10, set_number: 1 }));
    log = addSetToExercise(log, 'pullups', makeSet({ weight: 0, reps: 12, set_number: 1 }));

    expect(log.performed_exercises).toHaveLength(3);
    expect(log.performed_exercises.map((pe) => pe.exercise_id)).toEqual([
      'trap_bar_deadlift', 'bench_press_dumbbell', 'pullups',
    ]);
  });
});

describe('Workout Engine — editing sets (Bug #1)', () => {
  it('edits weight and reps of an existing set', () => {
    let log = createSession('plan', 'day_a');
    log = addSetToExercise(log, 'bench_press_dumbbell', makeSet({ weight: 50, reps: 10, set_number: 1 }));
    log = addSetToExercise(log, 'bench_press_dumbbell', makeSet({ weight: 50, reps: 8, set_number: 2 }));

    // Edit set 0: wrong weight, should have been 55
    log = editSet(log, 'bench_press_dumbbell', 0, { weight_entered: 55, weight_calculated: 55 });

    expect(log.performed_exercises[0].sets[0].weight_entered).toBe(55);
    expect(log.performed_exercises[0].sets[0].weight_calculated).toBe(55);
    // Set 1 untouched
    expect(log.performed_exercises[0].sets[1].weight_entered).toBe(50);
  });

  it('edits reps of an existing set', () => {
    let log = createSession('plan', 'day_a');
    log = addSetToExercise(log, 'pullups', makeSet({ weight: 0, reps: 12, set_number: 1 }));

    // Realized you actually got 14
    log = editSet(log, 'pullups', 0, { reps: 14 });
    expect(log.performed_exercises[0].sets[0].reps).toBe(14);
  });

  it('does not mutate the original log on edit', () => {
    let log = createSession('plan', 'day_a');
    log = addSetToExercise(log, 'bench_press_dumbbell', makeSet({ weight: 50, reps: 10, set_number: 1 }));
    const original = log;

    const edited = editSet(log, 'bench_press_dumbbell', 0, { reps: 12 });
    expect(original.performed_exercises[0].sets[0].reps).toBe(10);
    expect(edited.performed_exercises[0].sets[0].reps).toBe(12);
  });
});

describe('Workout Engine — deleting sets (Bug #1)', () => {
  it('deletes a set and renumbers remaining', () => {
    let log = createSession('plan', 'day_a');
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 135, reps: 8, set_number: 1, is_warmup: true }));
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 225, reps: 6, set_number: 2 }));
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 225, reps: 5, set_number: 3 }));

    // Delete the warmup
    log = deleteSet(log, 'trap_bar_deadlift', 0);

    const sets = log.performed_exercises[0].sets;
    expect(sets).toHaveLength(2);
    expect(sets[0].set_number).toBe(1);
    expect(sets[1].set_number).toBe(2);
  });

  it('deletes a middle set', () => {
    let log = createSession('plan', 'day_a');
    log = addSetToExercise(log, 'goblet_squat', makeSet({ weight: 40, reps: 15, set_number: 1 }));
    log = addSetToExercise(log, 'goblet_squat', makeSet({ weight: 40, reps: 12, set_number: 2 }));
    log = addSetToExercise(log, 'goblet_squat', makeSet({ weight: 40, reps: 10, set_number: 3 }));

    log = deleteSet(log, 'goblet_squat', 1); // delete middle set

    const sets = log.performed_exercises[0].sets;
    expect(sets).toHaveLength(2);
    expect(sets[0].reps).toBe(15);
    expect(sets[1].reps).toBe(10);
    expect(sets[1].set_number).toBe(2); // renumbered
  });
});

describe('Workout Engine — exercise substitution (Bug #4)', () => {
  it('allows substituting after sets are logged', () => {
    let log = createSession('plan', 'day_a');
    const subs = new Map<string, string>();

    // Log a set for dumbbell bench press
    log = addSetToExercise(log, 'bench_press_dumbbell', makeSet({ weight: 50, reps: 10, set_number: 1 }));

    // Mid-workout swap to barbell bench press
    subs.set('bench_press_dumbbell', 'bench_press_barbell');

    // New sets go to the barbell press
    const actualId = subs.get('bench_press_dumbbell')!;
    log = addSetToExercise(log, actualId, makeSet({ weight: 135, reps: 8, set_number: 1 }), true, 'bench_press_dumbbell');

    expect(log.performed_exercises).toHaveLength(2);
    // Original exercise sets preserved
    expect(log.performed_exercises[0].exercise_id).toBe('bench_press_dumbbell');
    expect(log.performed_exercises[0].sets).toHaveLength(1);
    // New exercise with substitution metadata
    expect(log.performed_exercises[1].exercise_id).toBe('bench_press_barbell');
    expect(log.performed_exercises[1].was_substitution).toBe(true);
    expect(log.performed_exercises[1].original_exercise_id).toBe('bench_press_dumbbell');
  });

  it('tracks progress correctly after substitution', () => {
    let log = createSession('plan', 'day_a');
    const subs = new Map<string, string>();
    subs.set('bench_press_dumbbell', 'bench_press_barbell');

    // Log 3 working sets for the substituted exercise
    for (let i = 1; i <= 3; i++) {
      log = addSetToExercise(log, 'bench_press_barbell', makeSet({ weight: 135, reps: 8, set_number: i }), true, 'bench_press_dumbbell');
    }

    const progress = getProgress(log, dayA, subs);
    // bench_press_dumbbell (via sub) = 3/3 done
    expect(progress.completed).toBe(3);
  });
});

describe('Workout Engine — ending early (Bug #2)', () => {
  it('ends workout with partial completion and preserves logged sets', () => {
    let log = createSession('functional_recomp_3day', 'day_a');

    // Only do deadlifts (3 sets) then quit
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 135, reps: 8, set_number: 1, is_warmup: true }));
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 225, reps: 6, set_number: 2 }));
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 225, reps: 5, set_number: 3 }));
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 225, reps: 5, set_number: 4 }));

    const progress = getProgress(log, dayA);
    expect(progress.completed).toBe(3); // 3 working sets for deadlift
    expect(progress.total).toBe(15); // 5 exercises × 3 sets each
    expect(progress.percent).toBe(20);

    // End early
    const completed = completeSession(log);
    expect(completed.timestamp_end).toBeDefined();

    // All data preserved
    expect(completed.performed_exercises[0].sets).toHaveLength(4);
  });

  it('calculates volume for partial workout', () => {
    let log = createSession('plan', 'day_a');
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 225, reps: 6, set_number: 1 }));
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 225, reps: 5, set_number: 2 }));

    const volume = calculateSessionVolume(log);
    expect(volume).toBe(225 * 6 + 225 * 5); // 2475
  });
});

describe('Workout Engine — progress tracking', () => {
  it('tracks 0% for empty session', () => {
    const log = createSession('plan', 'day_a');
    const progress = getProgress(log, dayA);
    expect(progress.percent).toBe(0);
    expect(progress.completed).toBe(0);
    expect(progress.total).toBe(15);
  });

  it('tracks 100% for fully completed session', () => {
    let log = createSession('plan', 'day_a');

    // Complete all 5 exercises × 3 working sets
    for (const planned of dayA.exercises) {
      for (let i = 1; i <= planned.sets; i++) {
        log = addSetToExercise(log, planned.exercise_id, makeSet({ weight: 100, reps: 8, set_number: i }));
      }
    }

    const progress = getProgress(log, dayA);
    expect(progress.completed).toBe(15);
    expect(progress.total).toBe(15);
    expect(progress.percent).toBe(100);
  });

  it('warmup sets do not count toward progress', () => {
    let log = createSession('plan', 'day_a');
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 135, reps: 8, set_number: 1, is_warmup: true }));
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 135, reps: 8, set_number: 2, is_warmup: true }));

    const progress = getProgress(log, dayA);
    expect(progress.completed).toBe(0);
  });

  it('extra sets beyond planned do not count as double', () => {
    let log = createSession('plan', 'day_a');
    // Log 5 working sets for an exercise that only needs 3
    for (let i = 1; i <= 5; i++) {
      log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 225, reps: 6, set_number: i }));
    }

    const progress = getProgress(log, dayA);
    expect(progress.completed).toBe(3); // capped at planned sets
  });
});

describe('Workout Engine — calculations', () => {
  it('calculates 1RM correctly via Epley formula', () => {
    expect(estimate1RM(225, 5)).toBeCloseTo(262.5, 0);
    expect(estimate1RM(100, 10)).toBeCloseTo(133.3, 0);
    expect(estimate1RM(315, 1)).toBe(315); // single rep = weight
    expect(estimate1RM(100, 0)).toBe(0); // 0 reps = 0
  });

  it('calculates exercise volume (working sets only)', () => {
    const performed: PerformedExercise = {
      exercise_id: 'bench',
      was_substitution: false,
      sets: [
        makeSet({ weight: 135, reps: 8, is_warmup: true, set_number: 1 }),
        makeSet({ weight: 185, reps: 8, set_number: 2 }),
        makeSet({ weight: 185, reps: 6, set_number: 3 }),
      ],
    };

    // Only working sets: 185×8 + 185×6 = 1480 + 1110 = 2590
    expect(calculateExerciseVolume(performed)).toBe(185 * 8 + 185 * 6);
  });

  it('identifies best set by 1RM', () => {
    const performed: PerformedExercise = {
      exercise_id: 'deadlift',
      was_substitution: false,
      sets: [
        makeSet({ weight: 135, reps: 8, is_warmup: true, set_number: 1 }),
        makeSet({ weight: 225, reps: 6, set_number: 2, rpe: 7 }),
        makeSet({ weight: 245, reps: 3, set_number: 3, rpe: 8 }),
      ],
    };

    const best = getBestSet(performed);
    // 225×6 → 1RM ≈ 270; 245×3 → 1RM ≈ 269.5
    expect(best).not.toBeNull();
    expect(best!.weight_calculated).toBe(225);
  });

  it('checks rep range targets', () => {
    expect(isInRepRange(8, '8-10')).toBe(true);
    expect(isInRepRange(10, '8-10')).toBe(true);
    expect(isInRepRange(7, '8-10')).toBe(false);
    expect(isInRepRange(11, '8-10')).toBe(false);
    expect(isInRepRange(5, '5')).toBe(true);
  });
});

describe('Workout Engine — full Day A scenario', () => {
  it('simulates a complete Day A workout with substitution and early end', () => {
    let log = createSession('functional_recomp_3day', 'day_a');
    const subs = new Map<string, string>();

    // Exercise 1: Trap Bar Deadlift — complete all 3 sets
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 135, reps: 8, set_number: 1, is_warmup: true }));
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 275, reps: 6, set_number: 2, rpe: 8 }));
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 275, reps: 5, set_number: 3, rpe: 9 }));
    log = addSetToExercise(log, 'trap_bar_deadlift', makeSet({ weight: 275, reps: 5, set_number: 4, rpe: 9 }));

    // Exercise 2: Swap dumbbell bench → barbell bench mid-exercise
    log = addSetToExercise(log, 'bench_press_dumbbell', makeSet({ weight: 50, reps: 10, set_number: 1, is_warmup: true }));
    subs.set('bench_press_dumbbell', 'bench_press_barbell');
    log = addSetToExercise(log, 'bench_press_barbell', makeSet({ weight: 135, reps: 8, set_number: 1 }), true, 'bench_press_dumbbell');
    log = addSetToExercise(log, 'bench_press_barbell', makeSet({ weight: 155, reps: 7, set_number: 2, rpe: 8 }), true, 'bench_press_dumbbell');
    log = addSetToExercise(log, 'bench_press_barbell', makeSet({ weight: 155, reps: 6, set_number: 3, rpe: 9 }), true, 'bench_press_dumbbell');

    // Exercise 3: Pullups — only 2 of 3 sets, then quit (too tired)
    log = addSetToExercise(log, 'pullups', makeSet({ weight: 0, reps: 12, set_number: 1 }));
    log = addSetToExercise(log, 'pullups', makeSet({ weight: 0, reps: 10, set_number: 2 }));

    // Check progress before ending early
    const progress = getProgress(log, dayA, subs);
    expect(progress.completed).toBe(8); // 3 (deadlift) + 3 (bench sub) + 2 (pullups)
    expect(progress.total).toBe(15);

    // End early — user is too tired
    const completed = completeSession(log);

    // Verify everything is preserved
    expect(completed.timestamp_end).toBeDefined();
    expect(completed.performed_exercises).toHaveLength(4); // deadlift, db bench (orphaned warmup), barbell bench, pullups

    // Edit a set after the fact (realized pullup count was wrong)
    let edited = editSet(completed, 'pullups', 0, { reps: 14 });
    expect(edited.performed_exercises[3].sets[0].reps).toBe(14);

    // Delete the orphaned dumbbell bench warmup
    edited = deleteSet(edited, 'bench_press_dumbbell', 0);
    expect(edited.performed_exercises[1].sets).toHaveLength(0);

    // Volume check
    const volume = calculateSessionVolume(edited);
    expect(volume).toBeGreaterThan(0);
  });
});
