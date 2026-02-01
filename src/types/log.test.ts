import { describe, it, expect } from 'vitest';
import {
  estimate1RM,
  calculateExerciseVolume,
  getBestSet,
  formatDuration,
} from './log';
import type { PerformedExercise } from './log';

describe('estimate1RM', () => {
  it('returns weight for 1 rep', () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it('calculates 1RM using Epley formula', () => {
    // 1RM = weight * (1 + reps/30)
    // 100 * (1 + 10/30) = 100 * 1.333 = 133.3
    expect(estimate1RM(100, 10)).toBeCloseTo(133.3, 1);
  });

  it('returns 0 for 0 reps', () => {
    expect(estimate1RM(100, 0)).toBe(0);
  });

  it('handles high rep ranges', () => {
    // 50 * (1 + 20/30) = 50 * 1.667 = 83.3
    expect(estimate1RM(50, 20)).toBeCloseTo(83.3, 1);
  });
});

describe('calculateExerciseVolume', () => {
  it('calculates volume from working sets only', () => {
    const exercise: PerformedExercise = {
      exercise_id: 'bench_press',
      was_substitution: false,
      sets: [
        { set_number: 1, is_warmup: true, weight_entered: 45, weight_calculated: 45, unit: 'lbs', reps: 10, failure: false, timestamp: '' },
        { set_number: 2, is_warmup: false, weight_entered: 135, weight_calculated: 135, unit: 'lbs', reps: 10, failure: false, timestamp: '' },
        { set_number: 3, is_warmup: false, weight_entered: 135, weight_calculated: 135, unit: 'lbs', reps: 8, failure: false, timestamp: '' },
      ],
    };

    // Volume = 135*10 + 135*8 = 1350 + 1080 = 2430
    expect(calculateExerciseVolume(exercise)).toBe(2430);
  });

  it('returns 0 for warmup-only exercise', () => {
    const exercise: PerformedExercise = {
      exercise_id: 'bench_press',
      was_substitution: false,
      sets: [
        { set_number: 1, is_warmup: true, weight_entered: 45, weight_calculated: 45, unit: 'lbs', reps: 10, failure: false, timestamp: '' },
      ],
    };

    expect(calculateExerciseVolume(exercise)).toBe(0);
  });

  it('handles missing reps', () => {
    const exercise: PerformedExercise = {
      exercise_id: 'sled_push',
      was_substitution: false,
      sets: [
        { set_number: 1, is_warmup: false, weight_entered: 90, weight_calculated: 90, unit: 'lbs', duration_seconds: 30, failure: false, timestamp: '' },
      ],
    };

    expect(calculateExerciseVolume(exercise)).toBe(0);
  });
});

describe('getBestSet', () => {
  it('returns set with highest 1RM', () => {
    const exercise: PerformedExercise = {
      exercise_id: 'bench_press',
      was_substitution: false,
      sets: [
        { set_number: 1, is_warmup: false, weight_entered: 135, weight_calculated: 135, unit: 'lbs', reps: 10, rpe: 7, failure: false, timestamp: '' },
        { set_number: 2, is_warmup: false, weight_entered: 155, weight_calculated: 155, unit: 'lbs', reps: 5, rpe: 8, failure: false, timestamp: '' },
        { set_number: 3, is_warmup: false, weight_entered: 145, weight_calculated: 145, unit: 'lbs', reps: 8, rpe: 9, failure: false, timestamp: '' },
      ],
    };

    const best = getBestSet(exercise);
    // 135 * 1.333 = 180, 155 * 1.167 = 181, 145 * 1.267 = 183.7
    expect(best?.weight_calculated).toBe(145);
  });

  it('excludes warmup sets', () => {
    const exercise: PerformedExercise = {
      exercise_id: 'bench_press',
      was_substitution: false,
      sets: [
        { set_number: 1, is_warmup: true, weight_entered: 200, weight_calculated: 200, unit: 'lbs', reps: 10, failure: false, timestamp: '' },
        { set_number: 2, is_warmup: false, weight_entered: 100, weight_calculated: 100, unit: 'lbs', reps: 5, rpe: 8, failure: false, timestamp: '' },
      ],
    };

    const best = getBestSet(exercise);
    expect(best?.weight_calculated).toBe(100);
  });

  it('includes sets at failure even with low RPE', () => {
    const exercise: PerformedExercise = {
      exercise_id: 'bench_press',
      was_substitution: false,
      sets: [
        { set_number: 1, is_warmup: false, weight_entered: 135, weight_calculated: 135, unit: 'lbs', reps: 10, rpe: 5, failure: true, timestamp: '' },
      ],
    };

    const best = getBestSet(exercise);
    expect(best).not.toBeNull();
  });

  it('returns null for empty exercise', () => {
    const exercise: PerformedExercise = {
      exercise_id: 'bench_press',
      was_substitution: false,
      sets: [],
    };

    expect(getBestSet(exercise)).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats minutes only', () => {
    const start = '2026-01-20T10:00:00Z';
    const end = '2026-01-20T10:45:00Z';
    expect(formatDuration(start, end)).toBe('45m');
  });

  it('formats hours and minutes', () => {
    const start = '2026-01-20T10:00:00Z';
    const end = '2026-01-20T11:30:00Z';
    expect(formatDuration(start, end)).toBe('1h 30m');
  });

  it('handles exact hours', () => {
    const start = '2026-01-20T10:00:00Z';
    const end = '2026-01-20T12:00:00Z';
    expect(formatDuration(start, end)).toBe('2h 0m');
  });
});
