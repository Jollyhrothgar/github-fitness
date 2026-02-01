import { useState, useEffect, useCallback } from 'react';
import type { UserConfig, UnitSystem, EquipmentProfile } from '@/types';
import * as storage from '@/lib/storage';

interface UseConfigReturn {
  config: UserConfig;
  loading: boolean;
  updateConfig: (updates: Partial<UserConfig>) => void;
  setUnits: (units: UnitSystem) => void;
  setEquipment: (equipment: EquipmentProfile) => void;
  setTimerAudio: (enabled: boolean) => void;
  setTimerVibration: (enabled: boolean) => void;
  setTimerNotifications: (enabled: boolean) => void;
  setGitHubSync: (enabled: boolean, username?: string, repo?: string) => void;
}

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<UserConfig>(() => storage.getConfig());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Config is synchronous from localStorage, so just mark as loaded
    setConfig(storage.getConfig());
    setLoading(false);
  }, []);

  const updateConfig = useCallback((updates: Partial<UserConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...updates };
      storage.saveConfig(updated);
      return updated;
    });
  }, []);

  const setUnits = useCallback((units: UnitSystem) => {
    updateConfig({ units });
  }, [updateConfig]);

  const setEquipment = useCallback((equipment: EquipmentProfile) => {
    updateConfig({ equipment });
  }, [updateConfig]);

  const setTimerAudio = useCallback((enabled: boolean) => {
    updateConfig({ timer_audio_enabled: enabled });
  }, [updateConfig]);

  const setTimerVibration = useCallback((enabled: boolean) => {
    updateConfig({ timer_vibration_enabled: enabled });
  }, [updateConfig]);

  const setTimerNotifications = useCallback((enabled: boolean) => {
    updateConfig({ timer_notifications_enabled: enabled });
  }, [updateConfig]);

  const setGitHubSync = useCallback(
    (enabled: boolean, username?: string, repo?: string) => {
      updateConfig({
        github_sync_enabled: enabled,
        github_username: username,
        github_repo: repo,
      });
    },
    [updateConfig]
  );

  return {
    config,
    loading,
    updateConfig,
    setUnits,
    setEquipment,
    setTimerAudio,
    setTimerVibration,
    setTimerNotifications,
    setGitHubSync,
  };
}
