import { useState, useEffect, useCallback } from 'react';
import type { ExerciseDefinition, MovementPattern, EquipmentType } from '@/types';
import * as storage from '@/lib/storage';

interface UseExercisesReturn {
  exercises: ExerciseDefinition[];
  loading: boolean;
  error: Error | null;
  getExercise: (id: string) => Promise<ExerciseDefinition | undefined>;
  saveExercise: (exercise: ExerciseDefinition) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  getByMovement: (pattern: MovementPattern) => Promise<ExerciseDefinition[]>;
  getByEquipment: (equipment: EquipmentType) => Promise<ExerciseDefinition[]>;
  refresh: () => Promise<void>;
}

export function useExercises(): UseExercisesReturn {
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadExercises = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await storage.getExercises();
      setExercises(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load exercises'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const getExercise = useCallback(async (id: string) => {
    return storage.getExercise(id);
  }, []);

  const saveExercise = useCallback(async (exercise: ExerciseDefinition) => {
    await storage.saveExercise(exercise);
    await loadExercises();
  }, [loadExercises]);

  const deleteExercise = useCallback(async (id: string) => {
    await storage.deleteExercise(id);
    await loadExercises();
  }, [loadExercises]);

  const getByMovement = useCallback(async (pattern: MovementPattern) => {
    return storage.getExercisesByMovement(pattern);
  }, []);

  const getByEquipment = useCallback(async (equipment: EquipmentType) => {
    return storage.getExercisesByEquipment(equipment);
  }, []);

  return {
    exercises,
    loading,
    error,
    getExercise,
    saveExercise,
    deleteExercise,
    getByMovement,
    getByEquipment,
    refresh: loadExercises,
  };
}
