import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { WorkoutLog, PerformedExercise, LoggedSet } from '@/types';
import { estimate1RM } from '@/types/log';
import * as storage from '@/lib/storage';
import { queueLogSync, processSyncQueue, getAuthConfig } from '@/lib/sync';

interface UseWorkoutLogsReturn {
  logs: WorkoutLog[];
  loading: boolean;
  error: Error | null;
  getLog: (sessionId: string) => Promise<WorkoutLog | undefined>;
  createLog: (planRef: string, dayId: string, deviceId: string) => WorkoutLog;
  saveLog: (log: WorkoutLog) => Promise<void>;
  completeLog: (log: WorkoutLog) => Promise<void>;
  deleteLog: (sessionId: string) => Promise<void>;
  getLogsForExercise: (exerciseId: string) => Promise<WorkoutLog[]>;
  getRecentLogs: (limit?: number) => Promise<WorkoutLog[]>;
  getIncompleteLog: () => Promise<WorkoutLog | undefined>;
  getActiveSessionId: () => string | null;
  setActiveSessionId: (sessionId: string) => void;
  clearActiveSession: () => void;
  refresh: () => Promise<void>;
}

export function useWorkoutLogs(): UseWorkoutLogsReturn {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await storage.getLogs();
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load logs'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getLog = useCallback(async (sessionId: string) => {
    return storage.getLog(sessionId);
  }, []);

  const createLog = useCallback(
    (planRef: string, dayId: string, deviceId: string): WorkoutLog => {
      return {
        session_id: uuidv4(),
        plan_ref: planRef,
        day_id: dayId,
        timestamp_start: new Date().toISOString(),
        performed_exercises: [],
        device_id: deviceId,
      };
    },
    []
  );

  const saveLog = useCallback(async (log: WorkoutLog) => {
    // Calculate 1RM for any sets that don't have it
    const updatedLog = {
      ...log,
      performed_exercises: log.performed_exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => {
          if (set.reps && set.reps > 0 && !set.calculated_1rm) {
            return {
              ...set,
              calculated_1rm: estimate1RM(set.weight_calculated, set.reps),
            };
          }
          return set;
        }),
      })),
    };

    await storage.saveLog(updatedLog);
    queueLogSync(updatedLog);
    await loadLogs();
  }, [loadLogs]);

  const completeLog = useCallback(async (log: WorkoutLog) => {
    const completedLog = {
      ...log,
      timestamp_end: new Date().toISOString(),
    };
    await saveLog(completedLog);
  }, [saveLog]);

  const deleteLog = useCallback(async (sessionId: string) => {
    // Create tombstone to prevent resurrection on sync
    const config = storage.getConfig();
    storage.addTombstone(sessionId, config.device_id);

    // Delete from local storage
    await storage.deleteLog(sessionId);

    // If sync is configured, trigger sync to push tombstone
    if (getAuthConfig() && navigator.onLine) {
      processSyncQueue();
    }

    await loadLogs();
  }, [loadLogs]);

  const getLogsForExercise = useCallback(async (exerciseId: string) => {
    return storage.getLogsForExercise(exerciseId);
  }, []);

  const getRecentLogs = useCallback(async (limit = 10) => {
    return storage.getLogs({ limit });
  }, []);

  const getIncompleteLog = useCallback(async () => {
    return storage.getIncompleteLog();
  }, []);

  const getActiveSessionId = useCallback(() => {
    return storage.getActiveSessionId();
  }, []);

  const setActiveSessionId = useCallback((sessionId: string) => {
    storage.setActiveSessionId(sessionId);
  }, []);

  const clearActiveSession = useCallback(() => {
    storage.clearActiveSession();
  }, []);

  return {
    logs,
    loading,
    error,
    getLog,
    createLog,
    saveLog,
    completeLog,
    deleteLog,
    getLogsForExercise,
    getRecentLogs,
    getIncompleteLog,
    getActiveSessionId,
    setActiveSessionId,
    clearActiveSession,
    refresh: loadLogs,
  };
}

// Helper hook for building a set during active workout
export function useSetBuilder(
  initialWeight: number = 0,
  initialReps: number = 0
) {
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [rpe, setRpe] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isWarmup, setIsWarmup] = useState(false);
  const [failure, setFailure] = useState(false);

  const buildSet = useCallback(
    (
      setNumber: number,
      weightCalculated: number,
      unit: 'lbs' | 'kg'
    ): LoggedSet => ({
      set_number: setNumber,
      is_warmup: isWarmup,
      weight_entered: weight,
      weight_calculated: weightCalculated,
      unit,
      reps,
      rpe,
      failure,
      notes: notes || undefined,
      timestamp: new Date().toISOString(),
    }),
    [weight, reps, rpe, notes, isWarmup, failure]
  );

  const reset = useCallback((newWeight?: number, newReps?: number) => {
    if (newWeight !== undefined) setWeight(newWeight);
    if (newReps !== undefined) setReps(newReps);
    setRpe(undefined);
    setNotes('');
    setIsWarmup(false);
    setFailure(false);
  }, []);

  return {
    weight,
    setWeight,
    reps,
    setReps,
    rpe,
    setRpe,
    notes,
    setNotes,
    isWarmup,
    setIsWarmup,
    failure,
    setFailure,
    buildSet,
    reset,
  };
}

// Helper to add a set to an exercise in a log
export function addSetToExercise(
  log: WorkoutLog,
  exerciseId: string,
  set: LoggedSet,
  wasSubstitution = false,
  originalExerciseId?: string
): WorkoutLog {
  const existingIndex = log.performed_exercises.findIndex(
    (ex) => ex.exercise_id === exerciseId
  );

  if (existingIndex >= 0) {
    // Add set to existing exercise
    const updatedExercises = [...log.performed_exercises];
    updatedExercises[existingIndex] = {
      ...updatedExercises[existingIndex],
      sets: [...updatedExercises[existingIndex].sets, set],
    };
    return { ...log, performed_exercises: updatedExercises };
  } else {
    // Create new exercise entry
    const newExercise: PerformedExercise = {
      exercise_id: exerciseId,
      was_substitution: wasSubstitution,
      original_exercise_id: originalExerciseId,
      sets: [set],
    };
    return {
      ...log,
      performed_exercises: [...log.performed_exercises, newExercise],
    };
  }
}
