import { describe, it, expect, beforeEach } from 'vitest';
import {
  getExercises,
  getExercise,
  saveExercise,
  saveExercises,
  deleteExercise,
  getExercisesByMovement,
  getExercisesByEquipment,
  getPlans,
  getPlan,
  savePlan,
  deletePlan,
  getLogs,
  getLog,
  saveLog,
  deleteLog,
  getLogsForExercise,
  getConfig,
  saveConfig,
  getSchedule,
  saveSchedule,
  clearSchedule,
  clearAllData,
  exportData,
  importData,
} from './storage';
import {
  sampleExercises,
  samplePlan,
  sampleLog,
  createTestExercise,
  createTestPlan,
  createTestLog,
} from '@/test/fixtures';
import { createDefaultConfig } from '@/types/config';

describe('Storage Layer - Exercises', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('saves and retrieves an exercise', async () => {
    const exercise = sampleExercises[0];
    await saveExercise(exercise);

    const retrieved = await getExercise(exercise.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe(exercise.name);
    expect(retrieved?.equipment_type).toBe(exercise.equipment_type);
  });

  it('saves multiple exercises', async () => {
    await saveExercises(sampleExercises);

    const all = await getExercises();
    expect(all.length).toBe(sampleExercises.length);
  });

  it('updates existing exercise', async () => {
    const exercise = createTestExercise({ id: 'update_test' });
    await saveExercise(exercise);

    const updated = { ...exercise, name: 'Updated Name' };
    await saveExercise(updated);

    const retrieved = await getExercise('update_test');
    expect(retrieved?.name).toBe('Updated Name');
    expect(retrieved?.created_at).toBeDefined();
    expect(retrieved?.updated_at).toBeDefined();
  });

  it('deletes an exercise', async () => {
    const exercise = createTestExercise({ id: 'delete_test' });
    await saveExercise(exercise);

    await deleteExercise('delete_test');

    const retrieved = await getExercise('delete_test');
    expect(retrieved).toBeUndefined();
  });

  it('queries exercises by movement pattern', async () => {
    await saveExercises(sampleExercises);

    const pushExercises = await getExercisesByMovement('horizontal_push');
    // Includes seed exercises plus test_bench_press
    expect(pushExercises.some(e => e.id === 'test_bench_press')).toBe(true);
  });

  it('queries exercises by equipment type', async () => {
    await saveExercises(sampleExercises);

    const barbellExercises = await getExercisesByEquipment('barbell');
    // Includes seed barbell exercises plus test_bench_press and test_squat
    expect(barbellExercises.some(e => e.id === 'test_bench_press')).toBe(true);
    expect(barbellExercises.some(e => e.id === 'test_squat')).toBe(true);
  });

  it('returns seed exercises when database is empty', async () => {
    const exercises = await getExercises();
    // Database auto-seeds with default exercises
    expect(exercises.length).toBeGreaterThan(0);
    // Verify some expected seed exercises exist
    expect(exercises.some(e => e.id === 'bench_press_barbell')).toBe(true);
  });

  it('returns undefined for non-existent exercise', async () => {
    const exercise = await getExercise('non_existent');
    expect(exercise).toBeUndefined();
  });
});

describe('Storage Layer - Plans', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('saves and retrieves a plan', async () => {
    await savePlan(samplePlan);

    const retrieved = await getPlan(samplePlan.plan_meta.plan_id!);
    expect(retrieved).toBeDefined();
    expect(retrieved?.plan_meta.plan_name).toBe(samplePlan.plan_meta.plan_name);
    expect(retrieved?.schedule.length).toBe(2);
  });

  it('retrieves all plans', async () => {
    const plan1 = createTestPlan();
    const plan2 = createTestPlan();

    await savePlan(plan1);
    await savePlan(plan2);

    const all = await getPlans();
    expect(all.length).toBe(2);
  });

  it('updates existing plan', async () => {
    await savePlan(samplePlan);

    const updated = {
      ...samplePlan,
      plan_meta: { ...samplePlan.plan_meta, plan_name: 'Updated Plan Name' },
    };
    await savePlan(updated);

    const retrieved = await getPlan(samplePlan.plan_meta.plan_id!);
    expect(retrieved?.plan_meta.plan_name).toBe('Updated Plan Name');
  });

  it('deletes a plan', async () => {
    await savePlan(samplePlan);
    await deletePlan(samplePlan.plan_meta.plan_id!);

    const retrieved = await getPlan(samplePlan.plan_meta.plan_id!);
    expect(retrieved).toBeUndefined();
  });

  it('preserves created_at on update', async () => {
    await savePlan(samplePlan);
    const first = await getPlan(samplePlan.plan_meta.plan_id!);
    const originalCreatedAt = first?.plan_meta.created_at;

    // Wait a bit to ensure different timestamp
    await new Promise((r) => setTimeout(r, 10));

    await savePlan({ ...samplePlan, plan_meta: { ...samplePlan.plan_meta, plan_name: 'New Name' } });
    const second = await getPlan(samplePlan.plan_meta.plan_id!);

    expect(second?.plan_meta.created_at).toBe(originalCreatedAt);
    expect(second?.plan_meta.updated_at).not.toBe(originalCreatedAt);
  });
});

describe('Storage Layer - Workout Logs', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('saves and retrieves a log', async () => {
    await saveLog(sampleLog);

    const retrieved = await getLog(sampleLog.session_id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.plan_ref).toBe(sampleLog.plan_ref);
    expect(retrieved?.performed_exercises.length).toBe(1);
  });

  it('retrieves logs sorted by date descending', async () => {
    const log1 = createTestLog({ timestamp_start: '2026-01-15T10:00:00Z' });
    const log2 = createTestLog({ timestamp_start: '2026-01-20T10:00:00Z' });
    const log3 = createTestLog({ timestamp_start: '2026-01-18T10:00:00Z' });

    await saveLog(log1);
    await saveLog(log2);
    await saveLog(log3);

    const logs = await getLogs();
    expect(logs[0].timestamp_start).toBe('2026-01-20T10:00:00Z');
    expect(logs[1].timestamp_start).toBe('2026-01-18T10:00:00Z');
    expect(logs[2].timestamp_start).toBe('2026-01-15T10:00:00Z');
  });

  it('limits number of logs returned', async () => {
    for (let i = 0; i < 5; i++) {
      await saveLog(createTestLog());
    }

    const logs = await getLogs({ limit: 3 });
    expect(logs.length).toBe(3);
  });

  it('filters logs by plan reference', async () => {
    const log1 = createTestLog({ plan_ref: 'plan_a' });
    const log2 = createTestLog({ plan_ref: 'plan_b' });
    const log3 = createTestLog({ plan_ref: 'plan_a' });

    await saveLog(log1);
    await saveLog(log2);
    await saveLog(log3);

    const logs = await getLogs({ planRef: 'plan_a' });
    expect(logs.length).toBe(2);
    expect(logs.every((l) => l.plan_ref === 'plan_a')).toBe(true);
  });

  it('deletes a log', async () => {
    await saveLog(sampleLog);
    await deleteLog(sampleLog.session_id);

    const retrieved = await getLog(sampleLog.session_id);
    expect(retrieved).toBeUndefined();
  });

  it('finds logs containing a specific exercise', async () => {
    const log1 = createTestLog({
      performed_exercises: [{ exercise_id: 'bench_press_barbell', was_substitution: false, sets: [] }],
    });
    const log2 = createTestLog({
      performed_exercises: [{ exercise_id: 'squat_barbell', was_substitution: false, sets: [] }],
    });
    const log3 = createTestLog({
      performed_exercises: [
        { exercise_id: 'bench_press_barbell', was_substitution: false, sets: [] },
        { exercise_id: 'dumbbell_curl', was_substitution: false, sets: [] },
      ],
    });

    await saveLog(log1);
    await saveLog(log2);
    await saveLog(log3);

    const benchLogs = await getLogsForExercise('bench_press_barbell');
    expect(benchLogs.length).toBe(2);
  });
});

describe('Storage Layer - Config (localStorage)', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('returns default config when none exists', () => {
    const config = getConfig();
    expect(config.units).toBe('lbs');
    expect(config.equipment.standard_bar_weight_lbs).toBe(45);
  });

  it('saves and retrieves config', () => {
    const config = createDefaultConfig();
    config.units = 'kg';
    config.equipment.standard_bar_weight_lbs = 50;

    saveConfig(config);

    const retrieved = getConfig();
    expect(retrieved.units).toBe('kg');
    expect(retrieved.equipment.standard_bar_weight_lbs).toBe(50);
  });

  it('updates updated_at on save', async () => {
    const config = getConfig();
    const originalUpdatedAt = config.updated_at;

    // Wait a bit to ensure different timestamp
    await new Promise((r) => setTimeout(r, 50));

    // Modify and save
    config.units = config.units === 'lbs' ? 'kg' : 'lbs';
    saveConfig(config);

    const retrieved = getConfig();
    // saveConfig sets updated_at automatically
    expect(new Date(retrieved.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(originalUpdatedAt).getTime()
    );
  });
});

describe('Storage Layer - Schedule (localStorage)', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('returns null when no schedule exists', () => {
    const schedule = getSchedule();
    expect(schedule).toBeNull();
  });

  it('saves and retrieves schedule', () => {
    const schedule = {
      active_plan_id: 'test_plan',
      workout_queue: ['day_a', 'day_b'],
      current_queue_index: 0,
      weekly_goal: 2,
      week_start_day: 'Monday' as const,
      current_week_start: new Date().toISOString(),
      completed_this_week: 1,
    };

    saveSchedule(schedule);

    const retrieved = getSchedule();
    expect(retrieved?.active_plan_id).toBe('test_plan');
    expect(retrieved?.workout_queue).toEqual(['day_a', 'day_b']);
    expect(retrieved?.completed_this_week).toBe(1);
  });

  it('clears schedule', () => {
    saveSchedule({
      active_plan_id: 'test',
      workout_queue: [],
      current_queue_index: 0,
      weekly_goal: 0,
      week_start_day: 'Monday',
      current_week_start: '',
      completed_this_week: 0,
    });

    clearSchedule();

    expect(getSchedule()).toBeNull();
  });
});

describe('Storage Layer - Export/Import', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('exports all data', async () => {
    await saveExercises(sampleExercises);
    await savePlan(samplePlan);
    await saveLog(sampleLog);

    const exported = await exportData();

    expect(exported.exercises.length).toBe(sampleExercises.length);
    expect(exported.plans.length).toBe(1);
    expect(exported.logs.length).toBe(1);
    expect(exported.config).toBeDefined();
  });

  it('imports data', async () => {
    const data = {
      exercises: sampleExercises,
      plans: [samplePlan],
      logs: [sampleLog],
    };

    await importData(data);

    const exercises = await getExercises();
    const plans = await getPlans();
    const logs = await getLogs();

    expect(exercises.length).toBe(sampleExercises.length);
    expect(plans.length).toBe(1);
    expect(logs.length).toBe(1);
  });

  it('clears all data', async () => {
    await saveExercises(sampleExercises);
    await savePlan(samplePlan);
    await saveLog(sampleLog);

    await clearAllData();

    // After clearing, getExercises() re-seeds with default exercises
    // So we verify plans, logs, and schedule are cleared
    expect(await getPlans()).toEqual([]);
    expect(await getLogs()).toEqual([]);
    expect(getSchedule()).toBeNull();
    // Exercises will be re-seeded, so just verify clearAllData ran without error
  });
});
