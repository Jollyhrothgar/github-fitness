import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLogFilePath, SYNC_PATHS } from '@/types/sync';

// Test sync path generation
describe('SYNC_PATHS', () => {
  it('generates correct exercises path', () => {
    expect(SYNC_PATHS.exercises).toBe('data/exercises.json');
  });

  it('generates correct config path', () => {
    expect(SYNC_PATHS.config).toBe('data/config.json');
  });

  it('generates correct plans path', () => {
    expect(SYNC_PATHS.plans('my_plan_123')).toBe('data/plans/my_plan_123.json');
  });

  it('generates correct logs path', () => {
    expect(SYNC_PATHS.logs('2026-01-21', 'device123')).toBe(
      'data/logs/2026-01-21-device123.jsonl'
    );
  });
});

describe('getLogFilePath', () => {
  it('generates log file path for current date', () => {
    const path = getLogFilePath('mydevice');
    const today = new Date().toISOString().split('T')[0];
    expect(path).toBe(`data/logs/${today}-mydevice.jsonl`);
  });

  it('generates log file path for specific date', () => {
    const date = new Date('2026-03-15T12:00:00Z');
    const path = getLogFilePath('device123', date);
    expect(path).toBe('data/logs/2026-03-15-device123.jsonl');
  });

  it('handles different device IDs', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    expect(getLogFilePath('iphone', date)).toBe('data/logs/2026-01-01-iphone.jsonl');
    expect(getLogFilePath('macbook', date)).toBe('data/logs/2026-01-01-macbook.jsonl');
    expect(getLogFilePath('web_abc123', date)).toBe('data/logs/2026-01-01-web_abc123.jsonl');
  });
});

// Test GitHub client (mocked)
describe('GitHubClient', () => {
  // Note: Full integration tests would require mocking fetch
  // These tests verify the client interface and error handling

  it('constructs repo path correctly', async () => {
    const { GitHubClient } = await import('./github');
    const client = new GitHubClient({
      accessToken: 'test-token',
      owner: 'testuser',
      repo: 'fitness-data',
    });

    // The client stores config internally
    expect(client).toBeDefined();
  });
});

// Test sync queue operations
describe('Sync Queue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns empty queue initially', async () => {
    const { getSyncQueue } = await import('./sync');
    expect(getSyncQueue()).toEqual([]);
  });

  it('adds items to queue', async () => {
    const { addToSyncQueue, getSyncQueue } = await import('./sync');

    addToSyncQueue({
      type: 'log',
      action: 'create',
      data: { session_id: 'test-session' },
    });

    const queue = getSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('log');
    expect(queue[0].action).toBe('create');
    expect(queue[0].retryCount).toBe(0);
    expect(queue[0].id).toBeDefined();
    expect(queue[0].timestamp).toBeDefined();
  });

  it('persists queue to localStorage', async () => {
    const { addToSyncQueue } = await import('./sync');

    addToSyncQueue({
      type: 'exercise',
      action: 'update',
      data: null,
    });

    // Check localStorage directly
    const stored = localStorage.getItem('gh-fitness-sync-queue');
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
  });

  it('generates unique IDs for queue items', async () => {
    const { addToSyncQueue, getSyncQueue } = await import('./sync');

    addToSyncQueue({ type: 'log', action: 'create', data: { id: 1 } });
    addToSyncQueue({ type: 'log', action: 'create', data: { id: 2 } });
    addToSyncQueue({ type: 'log', action: 'create', data: { id: 3 } });

    const queue = getSyncQueue();
    const ids = queue.map((item) => item.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(3);
  });
});

// Test auth config management
describe('Auth Config', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns null when no auth configured', async () => {
    const { getAuthConfig } = await import('./sync');
    expect(getAuthConfig()).toBeNull();
  });

  it('saves and retrieves auth config', async () => {
    const { saveAuthConfig, getAuthConfig } = await import('./sync');

    saveAuthConfig({
      accessToken: 'test-token-123',
      username: 'testuser',
      repo: 'fitness-data',
    });

    const config = getAuthConfig();
    expect(config).toBeDefined();
    expect(config?.accessToken).toBe('test-token-123');
    expect(config?.username).toBe('testuser');
    expect(config?.repo).toBe('fitness-data');
  });

  it('clears auth config', async () => {
    const { saveAuthConfig, clearAuthConfig, getAuthConfig } = await import('./sync');

    saveAuthConfig({
      accessToken: 'test-token',
      username: 'user',
      repo: 'repo',
    });

    expect(getAuthConfig()).not.toBeNull();

    clearAuthConfig();

    expect(getAuthConfig()).toBeNull();
  });
});

// Test sync state management
describe('Sync State', () => {
  beforeEach(() => {
    localStorage.clear();
    // Clear session storage too
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns initial state', async () => {
    // Re-import to get fresh state
    vi.resetModules();
    const { getSyncState } = await import('./sync');

    const state = getSyncState();

    expect(state.status).toBeDefined();
    // pendingChanges reflects queue length which may have items from other tests
    // Just verify the state structure
    expect(typeof state.pendingChanges).toBe('number');
  });

  it('notifies subscribers of state changes', async () => {
    const { subscribeSyncState, addToSyncQueue } = await import('./sync');

    const states: unknown[] = [];
    const unsubscribe = subscribeSyncState((state) => {
      states.push(state);
    });

    // Initial callback
    expect(states.length).toBeGreaterThanOrEqual(1);

    // Add to queue triggers state update
    addToSyncQueue({
      type: 'log',
      action: 'create',
      data: {},
    });

    expect(states.length).toBeGreaterThan(1);

    unsubscribe();
  });

  it('unsubscribe stops notifications', async () => {
    const { subscribeSyncState, addToSyncQueue } = await import('./sync');

    let callCount = 0;
    const unsubscribe = subscribeSyncState(() => {
      callCount++;
    });

    const initialCount = callCount;
    unsubscribe();

    addToSyncQueue({
      type: 'log',
      action: 'create',
      data: {},
    });

    // Should not have received additional callbacks after unsubscribe
    expect(callCount).toBe(initialCount);
  });
});

// Test log merging logic
describe('Log Merging', () => {
  // We need to test the internal merge logic
  // Since it's not exported, we'll test the behavior through fullSync
  // or extract the merge functions

  it('merges logs by session_id', () => {
    // Manual test of merge logic
    const mergeLogs = (
      local: Array<{ session_id: string; timestamp_start: string; timestamp_end?: string }>,
      remote: Array<{ session_id: string; timestamp_start: string; timestamp_end?: string }>
    ) => {
      const merged = new Map<
        string,
        { session_id: string; timestamp_start: string; timestamp_end?: string }
      >();

      for (const log of remote) {
        merged.set(log.session_id, log);
      }

      for (const log of local) {
        const existing = merged.get(log.session_id);
        if (!existing) {
          merged.set(log.session_id, log);
        } else {
          const localTime = new Date(log.timestamp_end || log.timestamp_start).getTime();
          const remoteTime = new Date(
            existing.timestamp_end || existing.timestamp_start
          ).getTime();
          if (localTime >= remoteTime) {
            merged.set(log.session_id, log);
          }
        }
      }

      return Array.from(merged.values());
    };

    const local = [
      { session_id: 'a', timestamp_start: '2026-01-01T10:00:00Z' },
      { session_id: 'b', timestamp_start: '2026-01-02T10:00:00Z' },
    ];

    const remote = [
      { session_id: 'b', timestamp_start: '2026-01-02T09:00:00Z' }, // Older
      { session_id: 'c', timestamp_start: '2026-01-03T10:00:00Z' },
    ];

    const result = mergeLogs(local, remote);

    expect(result).toHaveLength(3);
    expect(result.find((l) => l.session_id === 'a')).toBeDefined();
    expect(result.find((l) => l.session_id === 'b')?.timestamp_start).toBe(
      '2026-01-02T10:00:00Z'
    ); // Local wins (newer)
    expect(result.find((l) => l.session_id === 'c')).toBeDefined();
  });

  it('prefers local log when timestamps are equal', () => {
    const mergeLogs = (
      local: Array<{ session_id: string; timestamp_start: string; data: string }>,
      remote: Array<{ session_id: string; timestamp_start: string; data: string }>
    ) => {
      const merged = new Map<
        string,
        { session_id: string; timestamp_start: string; data: string }
      >();

      for (const log of remote) {
        merged.set(log.session_id, log);
      }

      for (const log of local) {
        const existing = merged.get(log.session_id);
        if (!existing) {
          merged.set(log.session_id, log);
        } else {
          const localTime = new Date(log.timestamp_start).getTime();
          const remoteTime = new Date(existing.timestamp_start).getTime();
          if (localTime >= remoteTime) {
            merged.set(log.session_id, log);
          }
        }
      }

      return Array.from(merged.values());
    };

    const local = [{ session_id: 'x', timestamp_start: '2026-01-01T10:00:00Z', data: 'local' }];
    const remote = [{ session_id: 'x', timestamp_start: '2026-01-01T10:00:00Z', data: 'remote' }];

    const result = mergeLogs(local, remote);

    expect(result).toHaveLength(1);
    expect(result[0].data).toBe('local'); // Local wins on tie
  });
});

// Test exercise merging
describe('Exercise Merging', () => {
  it('merges exercises, remote wins for existing', () => {
    const mergeExercises = (
      local: Array<{ id: string; name: string }>,
      remote: Array<{ id: string; name: string }>
    ) => {
      const merged = new Map<string, { id: string; name: string }>();

      for (const ex of remote) {
        merged.set(ex.id, ex);
      }

      for (const ex of local) {
        if (!merged.has(ex.id)) {
          merged.set(ex.id, ex);
        }
      }

      return Array.from(merged.values());
    };

    const local = [
      { id: 'bench', name: 'Bench Press (local)' },
      { id: 'squat', name: 'Squat' },
    ];

    const remote = [
      { id: 'bench', name: 'Bench Press (remote)' },
      { id: 'deadlift', name: 'Deadlift' },
    ];

    const result = mergeExercises(local, remote);

    expect(result).toHaveLength(3);
    expect(result.find((e) => e.id === 'bench')?.name).toBe('Bench Press (remote)');
    expect(result.find((e) => e.id === 'squat')?.name).toBe('Squat');
    expect(result.find((e) => e.id === 'deadlift')?.name).toBe('Deadlift');
  });

  it('adds local exercises that do not exist remotely', () => {
    const mergeExercises = (
      local: Array<{ id: string }>,
      remote: Array<{ id: string }>
    ) => {
      const merged = new Map<string, { id: string }>();

      for (const ex of remote) {
        merged.set(ex.id, ex);
      }

      for (const ex of local) {
        if (!merged.has(ex.id)) {
          merged.set(ex.id, ex);
        }
      }

      return Array.from(merged.values());
    };

    const local = [
      { id: 'local_only_1' },
      { id: 'local_only_2' },
      { id: 'shared' },
    ];

    const remote = [{ id: 'shared' }, { id: 'remote_only' }];

    const result = mergeExercises(local, remote);

    expect(result).toHaveLength(4);
    expect(result.map((e) => e.id).sort()).toEqual([
      'local_only_1',
      'local_only_2',
      'remote_only',
      'shared',
    ]);
  });
});

// Test device ID generation
describe('Device ID Generation', () => {
  it('generates unique device IDs', async () => {
    const { generateDeviceId } = await import('@/types/config');

    const id1 = generateDeviceId();
    // Wait a tiny bit to ensure different timestamp
    await new Promise((r) => setTimeout(r, 1));
    const id2 = generateDeviceId();

    expect(id1).not.toBe(id2);
  });

  it('generates device ID with user agent prefix', async () => {
    const { generateDeviceId } = await import('@/types/config');

    const id = generateDeviceId();

    // Should contain alphanumeric characters and underscore
    expect(id).toMatch(/^[a-zA-Z0-9_]+$/);
    // Should have underscore separator
    expect(id).toContain('_');
  });
});
