import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkoutLogs, addSetToExercise } from './useWorkoutLogs';
import { clearAllData } from '@/lib/storage';
import { sampleLog, createTestLog } from '@/test/fixtures';
import type { WorkoutLog, LoggedSet } from '@/types';

describe('useWorkoutLogs hook', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('starts with loading state', () => {
    const { result } = renderHook(() => useWorkoutLogs());
    expect(result.current.loading).toBe(true);
  });

  it('loads logs from storage', async () => {
    const { result } = renderHook(() => useWorkoutLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.logs).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('creates a new log', async () => {
    const { result } = renderHook(() => useWorkoutLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const log = result.current.createLog('test_plan', 'day_a', 'test_device');

    expect(log.session_id).toBeDefined();
    expect(log.plan_ref).toBe('test_plan');
    expect(log.day_id).toBe('day_a');
    expect(log.device_id).toBe('test_device');
    expect(log.timestamp_start).toBeDefined();
    expect(log.performed_exercises).toEqual([]);
  });

  it('saves and retrieves a log', async () => {
    const { result } = renderHook(() => useWorkoutLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.saveLog(sampleLog);
    });

    expect(result.current.logs.length).toBe(1);
    expect(result.current.logs[0].session_id).toBe(sampleLog.session_id);
  });

  it('calculates 1RM for sets without it', async () => {
    const { result } = renderHook(() => useWorkoutLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const log = createTestLog({
      performed_exercises: [
        {
          exercise_id: 'bench_press',
          was_substitution: false,
          sets: [
            {
              set_number: 1,
              is_warmup: false,
              weight_entered: 100,
              weight_calculated: 100,
              unit: 'lbs',
              reps: 10,
              failure: false,
              timestamp: new Date().toISOString(),
              // No calculated_1rm provided
            },
          ],
        },
      ],
    });

    await act(async () => {
      await result.current.saveLog(log);
    });

    const saved = await result.current.getLog(log.session_id);
    // 1RM = 100 * (1 + 10/30) = 133.3
    expect(saved?.performed_exercises[0].sets[0].calculated_1rm).toBeCloseTo(133.3, 1);
  });

  it('completes a log with end timestamp', async () => {
    const { result } = renderHook(() => useWorkoutLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const log = result.current.createLog('test_plan', 'day_a', 'device');

    await act(async () => {
      await result.current.completeLog(log);
    });

    expect(result.current.logs[0].timestamp_end).toBeDefined();
  });

  it('deletes a log', async () => {
    const { result } = renderHook(() => useWorkoutLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.saveLog(sampleLog);
    });

    expect(result.current.logs.length).toBe(1);

    await act(async () => {
      await result.current.deleteLog(sampleLog.session_id);
    });

    expect(result.current.logs.length).toBe(0);
  });

  it('gets logs for specific exercise', async () => {
    const { result } = renderHook(() => useWorkoutLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.saveLog(
        createTestLog({
          performed_exercises: [
            { exercise_id: 'bench_press', was_substitution: false, sets: [] },
          ],
        })
      );
      await result.current.saveLog(
        createTestLog({
          performed_exercises: [
            { exercise_id: 'squat', was_substitution: false, sets: [] },
          ],
        })
      );
    });

    const benchLogs = await result.current.getLogsForExercise('bench_press');
    expect(benchLogs.length).toBe(1);
  });

  it('gets recent logs with limit', async () => {
    const { result } = renderHook(() => useWorkoutLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      for (let i = 0; i < 5; i++) {
        await result.current.saveLog(createTestLog());
      }
    });

    const recent = await result.current.getRecentLogs(3);
    expect(recent.length).toBe(3);
  });
});

describe('addSetToExercise helper', () => {
  it('adds set to new exercise', () => {
    const log: WorkoutLog = {
      session_id: 'test',
      plan_ref: 'plan',
      day_id: 'day_a',
      timestamp_start: new Date().toISOString(),
      device_id: 'device',
      performed_exercises: [],
    };

    const set: LoggedSet = {
      set_number: 1,
      is_warmup: false,
      weight_entered: 100,
      weight_calculated: 100,
      unit: 'lbs',
      reps: 10,
      failure: false,
      timestamp: new Date().toISOString(),
    };

    const updated = addSetToExercise(log, 'bench_press', set);

    expect(updated.performed_exercises.length).toBe(1);
    expect(updated.performed_exercises[0].exercise_id).toBe('bench_press');
    expect(updated.performed_exercises[0].sets.length).toBe(1);
  });

  it('adds set to existing exercise', () => {
    const log: WorkoutLog = {
      session_id: 'test',
      plan_ref: 'plan',
      day_id: 'day_a',
      timestamp_start: new Date().toISOString(),
      device_id: 'device',
      performed_exercises: [
        {
          exercise_id: 'bench_press',
          was_substitution: false,
          sets: [
            {
              set_number: 1,
              is_warmup: false,
              weight_entered: 100,
              weight_calculated: 100,
              unit: 'lbs',
              reps: 10,
              failure: false,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      ],
    };

    const set: LoggedSet = {
      set_number: 2,
      is_warmup: false,
      weight_entered: 110,
      weight_calculated: 110,
      unit: 'lbs',
      reps: 8,
      failure: false,
      timestamp: new Date().toISOString(),
    };

    const updated = addSetToExercise(log, 'bench_press', set);

    expect(updated.performed_exercises.length).toBe(1);
    expect(updated.performed_exercises[0].sets.length).toBe(2);
  });

  it('marks substitution correctly', () => {
    const log: WorkoutLog = {
      session_id: 'test',
      plan_ref: 'plan',
      day_id: 'day_a',
      timestamp_start: new Date().toISOString(),
      device_id: 'device',
      performed_exercises: [],
    };

    const set: LoggedSet = {
      set_number: 1,
      is_warmup: false,
      weight_entered: 50,
      weight_calculated: 100,
      unit: 'lbs',
      reps: 10,
      failure: false,
      timestamp: new Date().toISOString(),
    };

    const updated = addSetToExercise(log, 'dumbbell_press', set, true, 'bench_press');

    expect(updated.performed_exercises[0].was_substitution).toBe(true);
    expect(updated.performed_exercises[0].original_exercise_id).toBe('bench_press');
  });

  it('does not mutate original log', () => {
    const log: WorkoutLog = {
      session_id: 'test',
      plan_ref: 'plan',
      day_id: 'day_a',
      timestamp_start: new Date().toISOString(),
      device_id: 'device',
      performed_exercises: [],
    };

    const set: LoggedSet = {
      set_number: 1,
      is_warmup: false,
      weight_entered: 100,
      weight_calculated: 100,
      unit: 'lbs',
      reps: 10,
      failure: false,
      timestamp: new Date().toISOString(),
    };

    addSetToExercise(log, 'bench_press', set);

    expect(log.performed_exercises.length).toBe(0);
  });
});
