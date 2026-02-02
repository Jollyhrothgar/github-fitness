import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlans } from './usePlans';
import { clearAllData, getExercises } from '@/lib/storage';
import { samplePlan, createTestPlan } from '@/test/fixtures';

describe('usePlans hook', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('starts with loading state', () => {
    const { result } = renderHook(() => usePlans());
    expect(result.current.loading).toBe(true);
  });

  it('loads plans from storage', async () => {
    const { result } = renderHook(() => usePlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plans).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('saves and retrieves a plan', async () => {
    const { result } = renderHook(() => usePlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.savePlan(samplePlan);
    });

    expect(result.current.plans.length).toBe(1);
    expect(result.current.plans[0].plan_meta.plan_name).toBe(samplePlan.plan_meta.plan_name);
  });

  it('generates plan ID if not provided', async () => {
    const { result } = renderHook(() => usePlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const planWithoutId = {
      plan_meta: {
        plan_name: 'My New Plan',
        version: '1.0',
        days_per_week: 2,
      },
      schedule: samplePlan.schedule,
    };

    let planId: string;
    await act(async () => {
      planId = await result.current.savePlan(planWithoutId as any);
    });

    expect(planId!).toBe('my_new_plan');
  });

  it('generates day IDs if not provided', async () => {
    const { result } = renderHook(() => usePlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const planWithoutDayIds = {
      plan_meta: {
        plan_name: 'Test',
        plan_id: 'test_day_ids',
        version: '1.0',
        days_per_week: 2,
      },
      schedule: [
        { day_name: 'Day One', day_order: 1, exercises: [] },
        { day_name: 'Day Two', day_order: 2, exercises: [] },
      ],
    };

    await act(async () => {
      await result.current.savePlan(planWithoutDayIds as any);
    });

    const plan = await result.current.getPlan('test_day_ids');
    expect(plan?.schedule[0].id).toBe('day_a');
    expect(plan?.schedule[1].id).toBe('day_b');
  });

  it('deletes a plan', async () => {
    const { result } = renderHook(() => usePlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.savePlan(samplePlan);
    });

    expect(result.current.plans.length).toBe(1);

    await act(async () => {
      await result.current.deletePlan(samplePlan.plan_meta.plan_id!);
    });

    expect(result.current.plans.length).toBe(0);
  });

  it('imports valid JSON plan', async () => {
    const { result } = renderHook(() => usePlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const json = JSON.stringify(samplePlan);

    let importResult: { planId: string; createdExercises: unknown[] };
    await act(async () => {
      importResult = await result.current.importPlan(json);
    });

    expect(result.current.plans.length).toBe(1);
    expect(importResult!.planId).toBeDefined();
    expect(importResult!.createdExercises).toBeDefined();
  });

  it('rejects invalid JSON', async () => {
    const { result } = renderHook(() => usePlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.importPlan('{ invalid json }');
      })
    ).rejects.toThrow('Invalid JSON format');
  });

  it('rejects plan without required fields', async () => {
    const { result } = renderHook(() => usePlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.importPlan(JSON.stringify({ foo: 'bar' }));
      })
    ).rejects.toThrow('missing plan_meta');
  });

  it('rejects plan without plan_name', async () => {
    const { result } = renderHook(() => usePlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const invalidPlan = {
      plan_meta: { version: '1.0' },
      schedule: [],
    };

    await expect(
      act(async () => {
        await result.current.importPlan(JSON.stringify(invalidPlan));
      })
    ).rejects.toThrow('missing plan_name');
  });

  it('rejects plan with empty schedule', async () => {
    const { result } = renderHook(() => usePlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const invalidPlan = {
      plan_meta: { plan_name: 'Test', version: '1.0' },
      schedule: [],
    };

    await expect(
      act(async () => {
        await result.current.importPlan(JSON.stringify(invalidPlan));
      })
    ).rejects.toThrow('non-empty array');
  });

  it('auto-creates exercises when importing plan', async () => {
    const { result } = renderHook(() => usePlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Seed exercises exist initially (auto-seeded)
    let exercises = await getExercises();
    const initialCount = exercises.length;
    expect(initialCount).toBeGreaterThan(0);

    // Import the sample plan
    const json = JSON.stringify(samplePlan);
    let importResult: { planId: string; createdExercises: unknown[] };
    await act(async () => {
      importResult = await result.current.importPlan(json);
    });

    // Should have created exercises for each unique exercise in the plan
    // (test_* exercises don't exist in seed data)
    expect(importResult!.createdExercises.length).toBe(4);

    // Verify test exercises are now in storage
    exercises = await getExercises();
    expect(exercises.length).toBe(initialCount + 4);
    expect(exercises.some(e => e.id === 'test_bench_press')).toBe(true);
    expect(exercises.some(e => e.id === 'test_curl')).toBe(true);
    expect(exercises.some(e => e.id === 'test_squat')).toBe(true);
    expect(exercises.some(e => e.id === 'test_pulldown')).toBe(true);
  });

  it('does not duplicate existing exercises on import', async () => {
    const { result } = renderHook(() => usePlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Import the same plan twice
    const json = JSON.stringify(samplePlan);
    let firstResult: { createdExercises: unknown[] };
    let secondResult: { createdExercises: unknown[] };

    await act(async () => {
      firstResult = await result.current.importPlan(json);
    });

    // Import again with a different plan ID to avoid duplicate plan error
    const plan2 = createTestPlan();
    await act(async () => {
      secondResult = await result.current.importPlan(JSON.stringify(plan2));
    });

    // First import should create the 4 test exercises (not in seed data)
    expect(firstResult!.createdExercises.length).toBe(4);

    // Second import should not create duplicates (same exercises used)
    expect(secondResult!.createdExercises.length).toBe(0);

    // Should have seed exercises plus our 4 test exercises
    const exercises = await getExercises();
    // Verify our 4 test exercises were created
    expect(exercises.some(e => e.id === 'test_bench_press')).toBe(true);
    expect(exercises.some(e => e.id === 'test_curl')).toBe(true);
    expect(exercises.some(e => e.id === 'test_squat')).toBe(true);
    expect(exercises.some(e => e.id === 'test_pulldown')).toBe(true);
  });
});
