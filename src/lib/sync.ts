// GitHub sync service for fitness data

import { GitHubClient, createGitHubClient } from './github';
import {
  getConfig,
  saveConfig,
  getLogs,
  saveLog,
  deleteLog,
  getExercises,
  saveExercises,
  getPlans,
  savePlan,
  setLastSyncTime,
  getLastSyncTime,
  getTombstones,
  saveTombstones,
} from './storage';
import type {
  SyncState,
  PendingChange,
  GitHubAuthConfig,
  LogTombstone,
} from '@/types/sync';
import { getLogFilePath, SYNC_PATHS } from '@/types/sync';
import type { WorkoutLog, ExerciseDefinition, WorkoutPlan } from '@/types';

// Storage keys for sync data
const AUTH_KEY = 'gh-fitness-auth';
const QUEUE_KEY = 'gh-fitness-sync-queue';

// Event emitter for sync status updates
type SyncEventCallback = (state: SyncState) => void;
const listeners: Set<SyncEventCallback> = new Set();

let currentState: SyncState = {
  status: 'idle',
  lastSyncTime: null,
  pendingChanges: 0,
};

// Notify all listeners of state change
function notifyListeners() {
  listeners.forEach((callback) => callback({ ...currentState }));
}

// Update sync state
function updateState(updates: Partial<SyncState>) {
  currentState = { ...currentState, ...updates };
  notifyListeners();
}

// Subscribe to sync state changes
export function subscribeSyncState(callback: SyncEventCallback): () => void {
  listeners.add(callback);
  callback({ ...currentState }); // Immediate callback with current state
  return () => listeners.delete(callback);
}

// Get current sync state
export function getSyncState(): SyncState {
  return { ...currentState };
}

// ============ AUTH MANAGEMENT ============

export function getAuthConfig(): GitHubAuthConfig | null {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse auth config:', e);
  }
  return null;
}

export function saveAuthConfig(config: GitHubAuthConfig): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(config));

  // Also update user config
  const userConfig = getConfig();
  userConfig.github_sync_enabled = true;
  userConfig.github_username = config.username;
  userConfig.github_repo = config.repo;
  saveConfig(userConfig);
}

export function clearAuthConfig(): void {
  localStorage.removeItem(AUTH_KEY);

  // Update user config
  const userConfig = getConfig();
  userConfig.github_sync_enabled = false;
  delete userConfig.github_username;
  delete userConfig.github_repo;
  saveConfig(userConfig);

  updateState({ status: 'not_configured' });
}

// Create GitHub client from stored auth
function getClient(): GitHubClient | null {
  const auth = getAuthConfig();
  if (!auth) return null;

  return createGitHubClient(auth.accessToken, auth.username, auth.repo);
}

// ============ SYNC QUEUE ============

export function getSyncQueue(): PendingChange[] {
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse sync queue:', e);
  }
  return [];
}

function saveSyncQueue(queue: PendingChange[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  updateState({ pendingChanges: queue.length });
}

export function addToSyncQueue(change: Omit<PendingChange, 'id' | 'timestamp' | 'retryCount'>): void {
  const queue = getSyncQueue();
  queue.push({
    ...change,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    retryCount: 0,
  });
  saveSyncQueue(queue);
}

function removeFromSyncQueue(id: string): void {
  const queue = getSyncQueue().filter((item) => item.id !== id);
  saveSyncQueue(queue);
}

function incrementRetryCount(id: string): void {
  const queue = getSyncQueue();
  const item = queue.find((i) => i.id === id);
  if (item) {
    item.retryCount++;
    saveSyncQueue(queue);
  }
}

// ============ SYNC OPERATIONS ============

// Sync a single workout log to GitHub
async function syncLog(client: GitHubClient, log: WorkoutLog): Promise<void> {
  const config = getConfig();
  const dateStr = log.timestamp_start.split('T')[0];
  const filePath = getLogFilePath(config.device_id, new Date(log.timestamp_start));

  const logLine = JSON.stringify(log);
  await client.appendToFile(
    filePath,
    logLine,
    `Add workout log: ${dateStr} - ${log.day_id}`
  );
}

// Sync exercises to GitHub
async function syncExercises(client: GitHubClient): Promise<void> {
  const exercises = await getExercises();
  const content = JSON.stringify(exercises, null, 2);

  await client.putFile(
    'data/exercises.json',
    content,
    `Update exercises (${exercises.length} total)`
  );
}

// Sync a plan to GitHub
async function syncPlan(client: GitHubClient, plan: WorkoutPlan): Promise<void> {
  const planId = plan.plan_meta.plan_id;
  const content = JSON.stringify(plan, null, 2);

  await client.putFile(
    `data/plans/${planId}.json`,
    content,
    `Update plan: ${plan.plan_meta.plan_name}`
  );
}

// Pull all logs from GitHub and merge
async function pullLogs(client: GitHubClient): Promise<WorkoutLog[]> {
  const logFiles = await client.listDirectory('data/logs');
  const allLogs: WorkoutLog[] = [];

  for (const file of logFiles) {
    if (!file.name.endsWith('.jsonl')) continue;

    const content = await client.getFileContentRaw(file.path);
    if (!content) continue;

    const lines = content.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const log = JSON.parse(line) as WorkoutLog;
        allLogs.push(log);
      } catch (e) {
        console.error('Failed to parse log line:', e);
      }
    }
  }

  return allLogs;
}

// Pull exercises from GitHub
async function pullExercises(client: GitHubClient): Promise<ExerciseDefinition[]> {
  const exercises = await client.getFileContent<ExerciseDefinition[]>('data/exercises.json');
  return exercises || [];
}

// Pull all plans from GitHub
async function pullPlans(client: GitHubClient): Promise<WorkoutPlan[]> {
  const planFiles = await client.listDirectory('data/plans');
  const plans: WorkoutPlan[] = [];

  for (const file of planFiles) {
    if (!file.name.endsWith('.json')) continue;

    const plan = await client.getFileContent<WorkoutPlan>(file.path);
    if (plan) {
      plans.push(plan);
    }
  }

  return plans;
}

// Pull tombstones from GitHub
async function pullTombstones(client: GitHubClient): Promise<LogTombstone[]> {
  const tombstones = await client.getFileContent<LogTombstone[]>(SYNC_PATHS.tombstones);
  return tombstones || [];
}

// Push tombstones to GitHub
async function syncTombstones(client: GitHubClient, tombstones: LogTombstone[]): Promise<void> {
  const content = JSON.stringify(tombstones, null, 2);
  await client.putFile(
    SYNC_PATHS.tombstones,
    content,
    `Update tombstones (${tombstones.length} deleted logs)`
  );
}

// Merge tombstones from multiple devices
function mergeTombstones(local: LogTombstone[], remote: LogTombstone[]): LogTombstone[] {
  const merged = new Map<string, LogTombstone>();

  // Add all tombstones, using the earliest deletion time
  for (const tombstone of [...remote, ...local]) {
    const existing = merged.get(tombstone.session_id);
    if (!existing || new Date(tombstone.deleted_at) < new Date(existing.deleted_at)) {
      merged.set(tombstone.session_id, tombstone);
    }
  }

  return Array.from(merged.values());
}

// Merge logs from multiple devices, filtering out tombstoned logs
function mergeLogs(
  local: WorkoutLog[],
  remote: WorkoutLog[],
  tombstones: LogTombstone[]
): WorkoutLog[] {
  const tombstoneSet = new Set(tombstones.map(t => t.session_id));
  const merged = new Map<string, WorkoutLog>();

  // Add remote logs first (skip tombstoned)
  for (const log of remote) {
    if (tombstoneSet.has(log.session_id)) continue;
    merged.set(log.session_id, log);
  }

  // Add/overwrite with local logs (local takes precedence for same session)
  for (const log of local) {
    if (tombstoneSet.has(log.session_id)) continue;

    const existing = merged.get(log.session_id);
    if (!existing) {
      merged.set(log.session_id, log);
    } else {
      // Use the more recent version
      const localTime = new Date(log.timestamp_end || log.timestamp_start).getTime();
      const remoteTime = new Date(existing.timestamp_end || existing.timestamp_start).getTime();
      if (localTime >= remoteTime) {
        merged.set(log.session_id, log);
      }
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.timestamp_start).getTime() - new Date(a.timestamp_start).getTime()
  );
}

// Merge exercises (remote wins for existing, local adds new)
function mergeExercises(
  local: ExerciseDefinition[],
  remote: ExerciseDefinition[]
): ExerciseDefinition[] {
  const merged = new Map<string, ExerciseDefinition>();

  // Add remote exercises
  for (const ex of remote) {
    merged.set(ex.id, ex);
  }

  // Add local exercises that don't exist remotely
  for (const ex of local) {
    if (!merged.has(ex.id)) {
      merged.set(ex.id, ex);
    }
  }

  return Array.from(merged.values());
}

// ============ MAIN SYNC FUNCTIONS ============

// Process pending changes in the queue
export async function processSyncQueue(): Promise<void> {
  const client = getClient();
  if (!client) {
    updateState({ status: 'not_configured' });
    return;
  }

  if (!navigator.onLine) {
    updateState({ status: 'offline' });
    return;
  }

  const queue = getSyncQueue();
  if (queue.length === 0) return;

  updateState({ status: 'syncing' });

  for (const item of queue) {
    try {
      switch (item.type) {
        case 'log':
          await syncLog(client, item.data as WorkoutLog);
          break;
        case 'exercise':
          await syncExercises(client);
          break;
        case 'plan':
          await syncPlan(client, item.data as WorkoutPlan);
          break;
      }

      removeFromSyncQueue(item.id);
    } catch (error) {
      console.error(`Sync failed for ${item.type}:`, error);
      incrementRetryCount(item.id);

      // Remove after 5 retries
      if (item.retryCount >= 5) {
        removeFromSyncQueue(item.id);
      }
    }
  }

  setLastSyncTime();
  updateState({
    status: 'idle',
    lastSyncTime: new Date(),
  });
}

// Full sync: push local changes, pull remote changes
export async function fullSync(): Promise<{ success: boolean; error?: string }> {
  const client = getClient();
  if (!client) {
    updateState({ status: 'not_configured' });
    return { success: false, error: 'GitHub sync not configured' };
  }

  if (!navigator.onLine) {
    updateState({ status: 'offline' });
    return { success: false, error: 'No internet connection' };
  }

  updateState({ status: 'syncing' });

  try {
    // Verify access first
    const { valid, error } = await client.verifyAccess();
    if (!valid) {
      updateState({ status: 'error', error });
      return { success: false, error };
    }

    // Ensure data structure exists
    await client.ensureDataStructure();

    // Process any pending changes first
    await processSyncQueue();

    // Pull remote data (including tombstones)
    const [remoteLogs, remoteExercises, remotePlans, remoteTombstones] = await Promise.all([
      pullLogs(client),
      pullExercises(client),
      pullPlans(client),
      pullTombstones(client),
    ]);

    // Get local data
    const [localLogs, localExercises, localPlans] = await Promise.all([
      getLogs(),
      getExercises(),
      getPlans(),
    ]);
    const localTombstones = getTombstones();

    // Merge tombstones first (deletions from any device should be respected)
    const mergedTombstones = mergeTombstones(localTombstones, remoteTombstones);
    saveTombstones(mergedTombstones);

    // Merge logs, filtering out tombstoned ones
    const mergedLogs = mergeLogs(localLogs, remoteLogs, mergedTombstones);
    const mergedExercises = mergeExercises(localExercises, remoteExercises);

    // Delete any tombstoned logs from local storage
    for (const tombstone of mergedTombstones) {
      await deleteLog(tombstone.session_id);
    }

    // Save merged data locally (only non-tombstoned logs)
    for (const log of mergedLogs) {
      await saveLog(log);
    }

    await saveExercises(mergedExercises);

    // Save plans that don't exist locally
    for (const plan of remotePlans) {
      const existsLocally = localPlans.some(
        (p) => p.plan_meta.plan_id === plan.plan_meta.plan_id
      );
      if (!existsLocally) {
        await savePlan(plan);
      }
    }

    // Push local exercises and plans that are newer
    await syncExercises(client);
    for (const plan of localPlans) {
      await syncPlan(client, plan);
    }

    // Push tombstones to GitHub (so other devices know about deletions)
    if (mergedTombstones.length > 0) {
      await syncTombstones(client, mergedTombstones);
    }

    // Push any local-only logs (skip tombstoned ones)
    const tombstoneSet = new Set(mergedTombstones.map(t => t.session_id));
    for (const log of localLogs) {
      if (tombstoneSet.has(log.session_id)) continue;

      const existsRemotely = remoteLogs.some(
        (r) => r.session_id === log.session_id
      );
      if (!existsRemotely) {
        await syncLog(client, log);
      }
    }

    setLastSyncTime();
    updateState({
      status: 'idle',
      lastSyncTime: new Date(),
      pendingChanges: 0,
    });

    return { success: true };
  } catch (error) {
    const errorMsg = (error as Error).message;
    updateState({ status: 'error', error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

// Track if sync has been initialized to avoid duplicate listeners
let syncInitialized = false;

// Initialize sync state on app load
export function initializeSync(): void {
  if (syncInitialized) return;
  syncInitialized = true;

  const auth = getAuthConfig();
  const lastSync = getLastSyncTime();
  const queue = getSyncQueue();

  if (!auth) {
    updateState({
      status: 'not_configured',
      lastSyncTime: null,
      pendingChanges: 0,
    });
    return;
  }

  updateState({
    status: navigator.onLine ? 'idle' : 'offline',
    lastSyncTime: lastSync,
    pendingChanges: queue.length,
  });

  // Listen for online/offline changes
  window.addEventListener('online', () => {
    updateState({ status: 'idle' });
    // Auto-sync when coming back online
    fullSync();
  });

  window.addEventListener('offline', () => {
    updateState({ status: 'offline' });
  });

  // Auto-sync on app load if online (for multi-device support)
  if (navigator.onLine) {
    fullSync();
  }
}

// Queue a workout log for sync
export function queueLogSync(log: WorkoutLog): void {
  addToSyncQueue({
    type: 'log',
    action: 'create',
    data: log,
  });

  // Try to sync immediately if online
  if (navigator.onLine && getAuthConfig()) {
    processSyncQueue();
  }
}

// Queue exercises for sync
export function queueExercisesSync(): void {
  addToSyncQueue({
    type: 'exercise',
    action: 'update',
    data: null, // Will fetch fresh data when syncing
  });

  if (navigator.onLine && getAuthConfig()) {
    processSyncQueue();
  }
}

// Queue plan for sync
export function queuePlanSync(plan: WorkoutPlan): void {
  addToSyncQueue({
    type: 'plan',
    action: 'update',
    data: plan,
  });

  if (navigator.onLine && getAuthConfig()) {
    processSyncQueue();
  }
}
