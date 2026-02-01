import { describe, it, expect } from 'vitest';
import {
  getWeightEntryMode,
  getDefaultBarWeight,
  inferEquipmentType,
  formatExerciseName,
  inferMuscleGroups,
  inferExerciseFromPlan,
} from './exercise';

describe('getWeightEntryMode', () => {
  it('returns plates_per_side for barbell', () => {
    expect(getWeightEntryMode('barbell')).toBe('plates_per_side');
  });

  it('returns plates_per_side for trap_bar', () => {
    expect(getWeightEntryMode('trap_bar')).toBe('plates_per_side');
  });

  it('returns per_hand for dumbbell', () => {
    expect(getWeightEntryMode('dumbbell')).toBe('per_hand');
  });

  it('returns per_hand for kettlebell', () => {
    expect(getWeightEntryMode('kettlebell')).toBe('per_hand');
  });

  it('returns stack for cable', () => {
    expect(getWeightEntryMode('cable')).toBe('stack');
  });

  it('returns total_weight for machine', () => {
    expect(getWeightEntryMode('machine')).toBe('total_weight');
  });

  it('returns bodyweight_plus for bodyweight', () => {
    expect(getWeightEntryMode('bodyweight')).toBe('bodyweight_plus');
  });

  it('returns duration for sled', () => {
    expect(getWeightEntryMode('sled')).toBe('duration');
  });
});

describe('getDefaultBarWeight', () => {
  it('returns 45 for barbell', () => {
    expect(getDefaultBarWeight('barbell')).toBe(45);
  });

  it('returns 55 for trap_bar', () => {
    expect(getDefaultBarWeight('trap_bar')).toBe(55);
  });

  it('returns undefined for dumbbell', () => {
    expect(getDefaultBarWeight('dumbbell')).toBeUndefined();
  });

  it('returns undefined for machine', () => {
    expect(getDefaultBarWeight('machine')).toBeUndefined();
  });
});

describe('inferEquipmentType', () => {
  it('infers barbell from exercise id', () => {
    expect(inferEquipmentType('bench_press_barbell')).toBe('barbell');
    expect(inferEquipmentType('barbell_row')).toBe('barbell');
  });

  it('infers trap_bar from exercise id', () => {
    expect(inferEquipmentType('trap_bar_deadlift')).toBe('trap_bar');
    expect(inferEquipmentType('hex_bar_deadlift')).toBe('trap_bar');
  });

  it('infers dumbbell from exercise id', () => {
    expect(inferEquipmentType('dumbbell_press')).toBe('dumbbell');
    expect(inferEquipmentType('db_curl')).toBe('dumbbell');
  });

  it('infers kettlebell from exercise id', () => {
    expect(inferEquipmentType('kettlebell_swing')).toBe('kettlebell');
    expect(inferEquipmentType('kb_goblet_squat')).toBe('kettlebell');
  });

  it('infers cable from exercise id', () => {
    expect(inferEquipmentType('cable_fly')).toBe('cable');
    expect(inferEquipmentType('cable_row_seated')).toBe('cable');
  });

  it('infers machine from exercise id', () => {
    expect(inferEquipmentType('leg_press_machine')).toBe('machine');
    expect(inferEquipmentType('lat_pulldown_machine')).toBe('machine');
  });

  it('infers sled from exercise id', () => {
    expect(inferEquipmentType('sled_push')).toBe('sled');
  });

  it('infers bodyweight from exercise id', () => {
    expect(inferEquipmentType('pullup')).toBe('bodyweight');
    expect(inferEquipmentType('pushup')).toBe('bodyweight');
    expect(inferEquipmentType('dip')).toBe('bodyweight');
  });

  it('returns other for unknown equipment', () => {
    expect(inferEquipmentType('unknown_exercise')).toBe('other');
    expect(inferEquipmentType('goblet_squat')).toBe('other');
  });
});

describe('formatExerciseName', () => {
  it('converts underscores to spaces and capitalizes', () => {
    expect(formatExerciseName('bench_press_barbell')).toBe('Bench Press Barbell');
    expect(formatExerciseName('dumbbell_curl')).toBe('Dumbbell Curl');
  });

  it('handles single word', () => {
    expect(formatExerciseName('squat')).toBe('Squat');
    expect(formatExerciseName('deadlift')).toBe('Deadlift');
  });

  it('handles empty string', () => {
    expect(formatExerciseName('')).toBe('');
  });

  it('handles abbreviations', () => {
    expect(formatExerciseName('db_row')).toBe('Db Row');
    expect(formatExerciseName('kb_swing')).toBe('Kb Swing');
  });
});

describe('inferMuscleGroups', () => {
  it('returns chest muscles for horizontal_push', () => {
    const muscles = inferMuscleGroups('horizontal_push');
    expect(muscles).toContain('chest');
    expect(muscles).toContain('triceps');
    expect(muscles).toContain('shoulders');
  });

  it('returns back muscles for horizontal_pull', () => {
    const muscles = inferMuscleGroups('horizontal_pull');
    expect(muscles).toContain('back');
    expect(muscles).toContain('biceps');
  });

  it('returns shoulder muscles for vertical_push', () => {
    const muscles = inferMuscleGroups('vertical_push');
    expect(muscles).toContain('shoulders');
    expect(muscles).toContain('triceps');
  });

  it('returns lat muscles for vertical_pull', () => {
    const muscles = inferMuscleGroups('vertical_pull');
    expect(muscles).toContain('lats');
    expect(muscles).toContain('biceps');
  });

  it('returns leg muscles for knee_dominant', () => {
    const muscles = inferMuscleGroups('knee_dominant');
    expect(muscles).toContain('quadriceps');
    expect(muscles).toContain('glutes');
  });

  it('returns posterior chain for hip_dominant', () => {
    const muscles = inferMuscleGroups('hip_dominant');
    expect(muscles).toContain('hamstrings');
    expect(muscles).toContain('glutes');
  });

  it('returns core muscles for core', () => {
    const muscles = inferMuscleGroups('core');
    expect(muscles).toContain('abs');
    expect(muscles).toContain('obliques');
  });

  it('returns empty array for isolation', () => {
    expect(inferMuscleGroups('isolation')).toEqual([]);
  });

  it('returns full_body for conditioning', () => {
    expect(inferMuscleGroups('conditioning')).toContain('full_body');
    expect(inferMuscleGroups('carry_conditioning')).toContain('full_body');
  });
});

describe('inferExerciseFromPlan', () => {
  it('creates exercise definition with correct id', () => {
    const exercise = inferExerciseFromPlan('bench_press_barbell', 'horizontal_push');
    expect(exercise.id).toBe('bench_press_barbell');
  });

  it('formats name from exercise id', () => {
    const exercise = inferExerciseFromPlan('bench_press_barbell', 'horizontal_push');
    expect(exercise.name).toBe('Bench Press Barbell');
  });

  it('infers equipment type from exercise id', () => {
    expect(inferExerciseFromPlan('bench_press_barbell').equipment_type).toBe('barbell');
    expect(inferExerciseFromPlan('dumbbell_curl').equipment_type).toBe('dumbbell');
    expect(inferExerciseFromPlan('lat_pulldown_machine').equipment_type).toBe('machine');
    expect(inferExerciseFromPlan('cable_fly').equipment_type).toBe('cable');
  });

  it('uses substitution group as movement pattern', () => {
    const exercise = inferExerciseFromPlan('bench_press_barbell', 'horizontal_push');
    expect(exercise.movement_pattern).toBe('horizontal_push');
  });

  it('defaults to isolation when no substitution group', () => {
    const exercise = inferExerciseFromPlan('some_exercise');
    expect(exercise.movement_pattern).toBe('isolation');
  });

  it('infers muscle groups from movement pattern', () => {
    const exercise = inferExerciseFromPlan('bench_press_barbell', 'horizontal_push');
    expect(exercise.primary_muscle_groups).toContain('chest');
  });

  it('sets correct weight entry mode based on equipment', () => {
    expect(inferExerciseFromPlan('bench_press_barbell').weight_entry_mode).toBe('plates_per_side');
    expect(inferExerciseFromPlan('dumbbell_curl').weight_entry_mode).toBe('per_hand');
    expect(inferExerciseFromPlan('lat_pulldown_machine').weight_entry_mode).toBe('total_weight');
    expect(inferExerciseFromPlan('cable_fly').weight_entry_mode).toBe('stack');
  });

  it('sets default bar weight for barbell exercises', () => {
    const barbell = inferExerciseFromPlan('bench_press_barbell');
    expect(barbell.default_bar_weight_lbs).toBe(45);

    const dumbbell = inferExerciseFromPlan('dumbbell_curl');
    expect(dumbbell.default_bar_weight_lbs).toBeUndefined();
  });
});
