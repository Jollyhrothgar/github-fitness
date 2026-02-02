import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExercises } from './useExercises';
import { clearAllData } from '@/lib/storage';
import { createTestExercise } from '@/test/fixtures';

describe('useExercises hook', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('starts with loading state', () => {
    const { result } = renderHook(() => useExercises());
    expect(result.current.loading).toBe(true);
  });

  it('loads exercises from storage', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Seed exercises are auto-loaded
    expect(result.current.exercises.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  it('saves and retrieves an exercise', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCount = result.current.exercises.length;
    const exercise = createTestExercise({ id: 'test_save' });

    await act(async () => {
      await result.current.saveExercise(exercise);
    });

    expect(result.current.exercises.length).toBe(initialCount + 1);
    expect(result.current.exercises.some(e => e.id === 'test_save')).toBe(true);
  });

  it('deletes an exercise', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCount = result.current.exercises.length;
    const exercise = createTestExercise({ id: 'test_delete' });

    await act(async () => {
      await result.current.saveExercise(exercise);
    });

    expect(result.current.exercises.length).toBe(initialCount + 1);

    await act(async () => {
      await result.current.deleteExercise('test_delete');
    });

    expect(result.current.exercises.length).toBe(initialCount);
  });

  it('queries exercises by movement pattern', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Save exercises with different movement patterns
    await act(async () => {
      await result.current.saveExercise(
        createTestExercise({ id: 'test_push1', movement_pattern: 'horizontal_push' })
      );
      await result.current.saveExercise(
        createTestExercise({ id: 'test_push2', movement_pattern: 'horizontal_push' })
      );
      await result.current.saveExercise(
        createTestExercise({ id: 'test_pull1', movement_pattern: 'horizontal_pull' })
      );
    });

    const pushExercises = await result.current.getByMovement('horizontal_push');
    // Includes seed horizontal_push exercises plus our 2 test ones
    expect(pushExercises.some(e => e.id === 'test_push1')).toBe(true);
    expect(pushExercises.some(e => e.id === 'test_push2')).toBe(true);
  });

  it('queries exercises by equipment type', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.saveExercise(
        createTestExercise({ id: 'test_barbell1', equipment_type: 'barbell' })
      );
      await result.current.saveExercise(
        createTestExercise({ id: 'test_dumbbell1', equipment_type: 'dumbbell' })
      );
    });

    const barbellExercises = await result.current.getByEquipment('barbell');
    // Includes seed barbell exercises plus our test one
    expect(barbellExercises.some(e => e.id === 'test_barbell1')).toBe(true);
  });

  it('refreshes exercises from storage', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCount = result.current.exercises.length;

    await act(async () => {
      await result.current.saveExercise(createTestExercise({ id: 'refresh_test' }));
    });

    expect(result.current.exercises.length).toBe(initialCount + 1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.exercises.length).toBe(initialCount + 1);
  });
});
