import { useSync } from '@/hooks/useSync';
import type { SyncStatus as SyncStatusType } from '@/types/sync';

const STATUS_CONFIG: Record<
  SyncStatusType,
  { label: string; color: string; icon: string; pulse?: boolean }
> = {
  idle: {
    label: 'Synced',
    color: 'text-success',
    icon: '✓',
  },
  syncing: {
    label: 'Syncing...',
    color: 'text-primary',
    icon: '↻',
    pulse: true,
  },
  error: {
    label: 'Sync Error',
    color: 'text-error',
    icon: '!',
  },
  offline: {
    label: 'Offline',
    color: 'text-warning',
    icon: '○',
  },
  not_configured: {
    label: 'Not configured',
    color: 'text-text-muted',
    icon: '–',
  },
};

interface SyncStatusProps {
  showLabel?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export function SyncStatus({ showLabel = true, compact = false, onClick }: SyncStatusProps) {
  const { syncState, sync } = useSync();
  const config = STATUS_CONFIG[syncState.status];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (syncState.status === 'idle' || syncState.status === 'error') {
      sync();
    }
  };

  // Format last sync time
  const formatLastSync = () => {
    if (!syncState.lastSyncTime) return null;

    const now = new Date();
    const diff = now.getTime() - syncState.lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return syncState.lastSyncTime.toLocaleDateString();
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-1 ${config.color}`}
        data-testid="sync-status"
        title={`${config.label}${syncState.error ? `: ${syncState.error}` : ''}`}
      >
        <span className={config.pulse ? 'animate-spin' : ''}>{config.icon}</span>
        {syncState.pendingChanges > 0 && (
          <span className="text-xs bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center">
            {syncState.pendingChanges}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated ${config.color} hover:bg-surface-hover transition-colors`}
      data-testid="sync-status"
    >
      <span className={config.pulse ? 'animate-spin' : ''}>{config.icon}</span>

      {showLabel && (
        <div className="flex flex-col items-start text-xs">
          <span className="font-medium">{config.label}</span>
          {syncState.lastSyncTime && syncState.status !== 'syncing' && (
            <span className="text-text-muted">{formatLastSync()}</span>
          )}
        </div>
      )}

      {syncState.pendingChanges > 0 && (
        <span className="text-xs bg-primary text-white rounded-full px-1.5 py-0.5 ml-1">
          {syncState.pendingChanges} pending
        </span>
      )}
    </button>
  );
}
