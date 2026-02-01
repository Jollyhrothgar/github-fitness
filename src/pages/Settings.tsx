import { useStorage } from '@/lib/StorageContext';
import { GitHubConnect } from '@/components/ui';
import { useNotifications } from '@/hooks/useNotifications';

export default function Settings() {
  const { config } = useStorage();
  const {
    config: userConfig,
    setUnits,
    setTimerAudio,
    setTimerVibration,
    setTimerNotifications,
    updateConfig,
  } = config;
  const { permission, requestPermission, isSupported } = useNotifications();

  const handleBarWeightChange = (value: number) => {
    updateConfig({
      equipment: {
        ...userConfig.equipment,
        standard_bar_weight_lbs: value,
      },
    });
  };

  const handleTrapBarWeightChange = (value: number) => {
    updateConfig({
      equipment: {
        ...userConfig.equipment,
        trap_bar_weight_lbs: value,
      },
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Units */}
      <section className="bg-surface rounded-lg p-4 mb-4">
        <h2 className="text-sm font-medium text-text-secondary mb-3">Units</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setUnits('lbs')}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              userConfig.units === 'lbs'
                ? 'bg-primary'
                : 'bg-surface-elevated hover:bg-surface'
            }`}
          >
            Pounds (lbs)
          </button>
          <button
            onClick={() => setUnits('kg')}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              userConfig.units === 'kg'
                ? 'bg-primary'
                : 'bg-surface-elevated hover:bg-surface'
            }`}
          >
            Kilograms (kg)
          </button>
        </div>
      </section>

      {/* Timer Settings */}
      <section className="bg-surface rounded-lg p-4 mb-4">
        <h2 className="text-sm font-medium text-text-secondary mb-3">Timer</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span>Audio alerts</span>
            <input
              type="checkbox"
              checked={userConfig.timer_audio_enabled}
              onChange={(e) => setTimerAudio(e.target.checked)}
              className="w-5 h-5 rounded bg-surface-elevated accent-primary"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Vibration</span>
            <input
              type="checkbox"
              checked={userConfig.timer_vibration_enabled}
              onChange={(e) => setTimerVibration(e.target.checked)}
              className="w-5 h-5 rounded bg-surface-elevated accent-primary"
            />
          </label>
          {isSupported && (
            <div className="flex items-center justify-between">
              <div>
                <span>Notifications</span>
                {permission === 'denied' && (
                  <p className="text-xs text-text-muted mt-0.5">
                    Blocked in browser settings
                  </p>
                )}
              </div>
              {permission === 'granted' ? (
                <input
                  type="checkbox"
                  checked={userConfig.timer_notifications_enabled}
                  onChange={(e) => setTimerNotifications(e.target.checked)}
                  className="w-5 h-5 rounded bg-surface-elevated accent-primary"
                />
              ) : permission === 'denied' ? (
                <span className="text-xs text-text-muted">Denied</span>
              ) : (
                <button
                  onClick={() => requestPermission()}
                  className="px-3 py-1 bg-primary hover:bg-primary-hover rounded text-xs font-medium transition-colors"
                >
                  Enable
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Equipment Profile */}
      <section className="bg-surface rounded-lg p-4 mb-4">
        <h2 className="text-sm font-medium text-text-secondary mb-3">
          Equipment
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-text-muted">
              Standard Bar Weight ({userConfig.units})
            </label>
            <input
              type="number"
              value={userConfig.equipment.standard_bar_weight_lbs}
              onChange={(e) => handleBarWeightChange(Number(e.target.value))}
              className="w-full mt-1 p-3 bg-surface-elevated rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm text-text-muted">
              Trap Bar Weight ({userConfig.units})
            </label>
            <input
              type="number"
              value={userConfig.equipment.trap_bar_weight_lbs}
              onChange={(e) => handleTrapBarWeightChange(Number(e.target.value))}
              className="w-full mt-1 p-3 bg-surface-elevated rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </section>

      {/* GitHub Sync */}
      <section className="mb-4">
        <GitHubConnect />
      </section>

      {/* Debug Info */}
      <section className="bg-surface rounded-lg p-4">
        <h2 className="text-sm font-medium text-text-secondary mb-3">
          Debug Info
        </h2>
        <p className="text-xs text-text-muted font-mono">
          Device ID: {userConfig.device_id}
        </p>
      </section>
    </div>
  );
}
