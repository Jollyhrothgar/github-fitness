import { useEffect, useState, useCallback } from 'react';
import type { SyncState, GitHubAuthConfig } from '@/types/sync';
import {
  subscribeSyncState,
  getSyncState,
  fullSync,
  initializeSync,
  getAuthConfig,
  saveAuthConfig,
  clearAuthConfig,
  queueLogSync,
  queueExercisesSync,
  queuePlanSync,
} from '@/lib/sync';
import type { WorkoutLog, WorkoutPlan } from '@/types';

export interface UseSyncReturn {
  syncState: SyncState;
  isConfigured: boolean;
  sync: () => Promise<{ success: boolean; error?: string }>;
  configure: (config: GitHubAuthConfig) => void;
  disconnect: () => void;
  queueLog: (log: WorkoutLog) => void;
  queueExercises: () => void;
  queuePlan: (plan: WorkoutPlan) => void;
}

export function useSync(): UseSyncReturn {
  const [syncState, setSyncState] = useState<SyncState>(getSyncState);
  const [isConfigured, setIsConfigured] = useState(() => !!getAuthConfig());

  useEffect(() => {
    // Initialize sync on mount
    initializeSync();

    // Subscribe to state changes
    const unsubscribe = subscribeSyncState((state) => {
      setSyncState(state);
      setIsConfigured(state.status !== 'not_configured');
    });

    return unsubscribe;
  }, []);

  const sync = useCallback(async () => {
    return fullSync();
  }, []);

  const configure = useCallback((config: GitHubAuthConfig) => {
    saveAuthConfig(config);
    setIsConfigured(true);
    // Trigger initial sync
    fullSync();
  }, []);

  const disconnect = useCallback(() => {
    clearAuthConfig();
    setIsConfigured(false);
  }, []);

  const queueLog = useCallback((log: WorkoutLog) => {
    queueLogSync(log);
  }, []);

  const queueExercises = useCallback(() => {
    queueExercisesSync();
  }, []);

  const queuePlan = useCallback((plan: WorkoutPlan) => {
    queuePlanSync(plan);
  }, []);

  return {
    syncState,
    isConfigured,
    sync,
    configure,
    disconnect,
    queueLog,
    queueExercises,
    queuePlan,
  };
}
