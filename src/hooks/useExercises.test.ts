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

    expect(result.current.exercises).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('saves and retrieves an exercise', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const exercise = createTestExercise({ id: 'test_save' });

    await act(async () => {
      await result.current.saveExercise(exercise);
    });

    expect(result.current.exercises.length).toBe(1);
    expect(result.current.exercises[0].id).toBe('test_save');
  });

  it('deletes an exercise', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const exercise = createTestExercise({ id: 'test_delete' });

    await act(async () => {
      await result.current.saveExercise(exercise);
    });

    expect(result.current.exercises.length).toBe(1);

    await act(async () => {
      await result.current.deleteExercise('test_delete');
    });

    expect(result.current.exercises.length).toBe(0);
  });

  it('queries exercises by movement pattern', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Save exercises with different movement patterns
    await act(async () => {
      await result.current.saveExercise(
        createTestExercise({ id: 'push1', movement_pattern: 'horizontal_push' })
      );
      await result.current.saveExercise(
        createTestExercise({ id: 'push2', movement_pattern: 'horizontal_push' })
      );
      await result.current.saveExercise(
        createTestExercise({ id: 'pull1', movement_pattern: 'horizontal_pull' })
      );
    });

    const pushExercises = await result.current.getByMovement('horizontal_push');
    expect(pushExercises.length).toBe(2);
  });

  it('queries exercises by equipment type', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.saveExercise(
        createTestExercise({ id: 'barbell1', equipment_type: 'barbell' })
      );
      await result.current.saveExercise(
        createTestExercise({ id: 'dumbbell1', equipment_type: 'dumbbell' })
      );
    });

    const barbellExercises = await result.current.getByEquipment('barbell');
    expect(barbellExercises.length).toBe(1);
    expect(barbellExercises[0].id).toBe('barbell1');
  });

  it('refreshes exercises from storage', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.saveExercise(createTestExercise({ id: 'refresh_test' }));
    });

    expect(result.current.exercises.length).toBe(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.exercises.length).toBe(1);
  });
});
