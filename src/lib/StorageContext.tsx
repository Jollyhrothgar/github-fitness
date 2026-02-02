import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useExercises } from '@/hooks/useExercises';
import { usePlans } from '@/hooks/usePlans';
import { useWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { useConfig } from '@/hooks/useConfig';
import { useSchedule } from '@/hooks/useSchedule';
import { initializeSync } from '@/lib/sync';

// Get return types from hooks
type ExercisesContext = ReturnType<typeof useExercises>;
type PlansContext = ReturnType<typeof usePlans>;
type WorkoutLogsContext = ReturnType<typeof useWorkoutLogs>;
type ConfigContext = ReturnType<typeof useConfig>;
type ScheduleContext = ReturnType<typeof useSchedule>;

interface StorageContextType {
  exercises: ExercisesContext;
  plans: PlansContext;
  logs: WorkoutLogsContext;
  config: ConfigContext;
  schedule: ScheduleContext;
  isLoading: boolean;
}

const StorageContext = createContext<StorageContextType | null>(null);

interface StorageProviderProps {
  children: ReactNode;
}

export function StorageProvider({ children }: StorageProviderProps) {
  const exercises = useExercises();
  const plans = usePlans();
  const logs = useWorkoutLogs();
  const config = useConfig();
  const schedule = useSchedule();

  // Initialize sync on app load
  useEffect(() => {
    initializeSync();
  }, []);

  const isLoading =
    exercises.loading ||
    plans.loading ||
    logs.loading ||
    config.loading ||
    schedule.loading;

  return (
    <StorageContext.Provider
      value={{
        exercises,
        plans,
        logs,
        config,
        schedule,
        isLoading,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage(): StorageContextType {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}

// Convenience hooks that use the context
export function useStorageExercises(): ExercisesContext {
  return useStorage().exercises;
}

export function useStoragePlans(): PlansContext {
  return useStorage().plans;
}

export function useStorageLogs(): WorkoutLogsContext {
  return useStorage().logs;
}

export function useStorageConfig(): ConfigContext {
  return useStorage().config;
}

export function useStorageSchedule(): ScheduleContext {
  return useStorage().schedule;
}
