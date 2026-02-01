import { useState, useEffect, useCallback } from 'react';
import type { WorkoutPlan, ExerciseDefinition } from '@/types';
import { generatePlanId } from '@/types/plan';
import { inferExerciseFromPlan } from '@/types/exercise';
import * as storage from '@/lib/storage';

interface ImportResult {
  planId: string;
  createdExercises: ExerciseDefinition[];
}

interface UsePlansReturn {
  plans: WorkoutPlan[];
  loading: boolean;
  error: Error | null;
  getPlan: (id: string) => Promise<WorkoutPlan | undefined>;
  savePlan: (plan: WorkoutPlan) => Promise<string>; // Returns plan ID
  deletePlan: (id: string) => Promise<void>;
  importPlan: (json: string) => Promise<ImportResult>; // Returns plan ID and created exercises
  refresh: () => Promise<void>;
}

// Extract all unique exercise IDs from a plan
function extractExerciseIds(plan: WorkoutPlan): Map<string, string | undefined> {
  const exerciseMap = new Map<string, string | undefined>();
  for (const day of plan.schedule) {
    for (const exercise of day.exercises) {
      if (!exerciseMap.has(exercise.exercise_id)) {
        exerciseMap.set(exercise.exercise_id, exercise.substitution_group);
      }
    }
  }
  return exerciseMap;
}

export function usePlans(): UsePlansReturn {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await storage.getPlans();
      setPlans(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load plans'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const getPlan = useCallback(async (id: string) => {
    return storage.getPlan(id);
  }, []);

  const savePlan = useCallback(async (plan: WorkoutPlan): Promise<string> => {
    // Ensure plan has an ID
    if (!plan.plan_meta.plan_id) {
      plan.plan_meta.plan_id = generatePlanId(plan.plan_meta.plan_name);
    }

    // Ensure each day has an ID
    plan.schedule = plan.schedule.map((day, index) => ({
      ...day,
      id: day.id || `day_${String.fromCharCode(97 + index)}`, // day_a, day_b, etc.
    }));

    await storage.savePlan(plan);
    await loadPlans();
    return plan.plan_meta.plan_id;
  }, [loadPlans]);

  const deletePlan = useCallback(async (id: string) => {
    await storage.deletePlan(id);
    await loadPlans();
  }, [loadPlans]);

  const importPlan = useCallback(async (json: string): Promise<ImportResult> => {
    try {
      const parsed = JSON.parse(json) as WorkoutPlan;

      // Validate basic structure
      if (!parsed.plan_meta || !parsed.schedule) {
        throw new Error('Invalid plan structure: missing plan_meta or schedule');
      }

      if (!parsed.plan_meta.plan_name) {
        throw new Error('Invalid plan: missing plan_name');
      }

      if (!Array.isArray(parsed.schedule) || parsed.schedule.length === 0) {
        throw new Error('Invalid plan: schedule must be a non-empty array');
      }

      // Extract exercise IDs and their substitution groups
      const exerciseMap = extractExerciseIds(parsed);

      // Check which exercises already exist
      const existingExercises = await storage.getExercises();
      const existingIds = new Set(existingExercises.map((e) => e.id));

      // Create definitions for missing exercises
      const createdExercises: ExerciseDefinition[] = [];
      for (const [exerciseId, substitutionGroup] of exerciseMap) {
        if (!existingIds.has(exerciseId)) {
          const newExercise = inferExerciseFromPlan(exerciseId, substitutionGroup);
          await storage.saveExercise(newExercise);
          createdExercises.push(newExercise);
        }
      }

      const planId = await savePlan(parsed);
      return { planId, createdExercises };
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw e;
    }
  }, [savePlan]);

  return {
    plans,
    loading,
    error,
    getPlan,
    savePlan,
    deletePlan,
    importPlan,
    refresh: loadPlans,
  };
}
