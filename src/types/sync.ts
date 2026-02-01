// GitHub sync types

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'not_configured';

export interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  pendingChanges: number;
  error?: string;
}

export interface GitHubAuthConfig {
  accessToken: string;
  username: string;
  repo: string;
  tokenExpiresAt?: string;
}

export interface PendingChange {
  id: string;
  type: 'log' | 'exercise' | 'plan' | 'config';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  timestamp: string;
  retryCount: number;
}

export interface SyncQueueItem {
  id: string;
  operation: 'push' | 'pull';
  resourceType: 'log' | 'exercise' | 'plan' | 'config';
  resourceId: string;
  data?: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

// GitHub API response types
export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  content?: string; // Base64 encoded for files
  encoding?: string;
  download_url?: string;
}

export interface GitHubCommitResponse {
  content: GitHubFileContent;
  commit: {
    sha: string;
    message: string;
  };
}

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

// Data file paths in GitHub repo
export const SYNC_PATHS = {
  exercises: 'data/exercises.json',
  config: 'data/config.json',
  plans: (planId: string) => `data/plans/${planId}.json`,
  logs: (date: string, deviceId: string) => `data/logs/${date}-${deviceId}.jsonl`,
  logsDir: 'data/logs',
  plansDir: 'data/plans',
} as const;

// Get log file path for current device
export function getLogFilePath(deviceId: string, date?: Date): string {
  const dateStr = (date ?? new Date()).toISOString().split('T')[0];
  return SYNC_PATHS.logs(dateStr, deviceId);
}
