import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  ExerciseDefinition,
  WorkoutPlan,
  WorkoutLog,
  UserConfig,
  UserSchedule,
} from '@/types';
import { createDefaultConfig } from '@/types/config';
import { seedExercises } from '@/data/seedExercises';

// Database schema version - increment when schema changes
const DB_VERSION = 1;
const DB_NAME = 'github-fitness';
const SEED_KEY = 'gh-fitness-seeded';

// IndexedDB schema definition
interface FitnessDBSchema extends DBSchema {
  exercises: {
    key: string;
    value: ExerciseDefinition;
    indexes: {
      'by-movement': string;
      'by-equipment': string;
    };
  };
  plans: {
    key: string;
    value: WorkoutPlan;
  };
  logs: {
    key: string;
    value: WorkoutLog;
    indexes: {
      'by-date': string;
      'by-plan': string;
    };
  };
}

// Singleton database instance
let dbInstance: IDBPDatabase<FitnessDBSchema> | null = null;

// Initialize the database
async function getDB(): Promise<IDBPDatabase<FitnessDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<FitnessDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, _transaction) {
      // Initial schema creation
      if (oldVersion < 1) {
        // Exercises store
        const exerciseStore = db.createObjectStore('exercises', {
          keyPath: 'id',
        });
        exerciseStore.createIndex('by-movement', 'movement_pattern');
        exerciseStore.createIndex('by-equipment', 'equipment_type');

        // Plans store
        db.createObjectStore('plans', {
          keyPath: 'plan_meta.plan_id',
        });

        // Logs store
        const logsStore = db.createObjectStore('logs', {
          keyPath: 'session_id',
        });
        logsStore.createIndex('by-date', 'timestamp_start');
        logsStore.createIndex('by-plan', 'plan_ref');
      }

      // Future migrations go here:
      // if (oldVersion < 2) { ... }
    },
  });

  return dbInstance;
}

// ============ EXERCISES ============

// Seed default exercises if database is empty
async function ensureSeedData(): Promise<void> {
  // Check if already seeded
  if (localStorage.getItem(SEED_KEY)) return;

  const db = await getDB();
  const existingExercises = await db.getAll('exercises');

  if (existingExercises.length === 0) {
    const now = new Date().toISOString();
    const tx = db.transaction('exercises', 'readwrite');
    await Promise.all([
      ...seedExercises.map((exercise) =>
        tx.store.put({
          ...exercise,
          created_at: now,
          updated_at: now,
        })
      ),
      tx.done,
    ]);
  }

  localStorage.setItem(SEED_KEY, 'true');
}

export async function getExercises(): Promise<ExerciseDefinition[]> {
  await ensureSeedData();
  const db = await getDB();
  return db.getAll('exercises');
}

export async function getExercise(id: string): Promise<ExerciseDefinition | undefined> {
  const db = await getDB();
  return db.get('exercises', id);
}

export async function saveExercise(exercise: ExerciseDefinition): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  const existing = await db.get('exercises', exercise.id);

  await db.put('exercises', {
    ...exercise,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  });
}

export async function saveExercises(exercises: ExerciseDefinition[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('exercises', 'readwrite');
  const now = new Date().toISOString();

  await Promise.all([
    ...exercises.map(async (exercise) => {
      const existing = await tx.store.get(exercise.id);
      return tx.store.put({
        ...exercise,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      });
    }),
    tx.done,
  ]);
}

export async function deleteExercise(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('exercises', id);
}

export async function getExercisesByMovement(
  pattern: string
): Promise<ExerciseDefinition[]> {
  const db = await getDB();
  return db.getAllFromIndex('exercises', 'by-movement', pattern);
}

export async function getExercisesByEquipment(
  equipment: string
): Promise<ExerciseDefinition[]> {
  const db = await getDB();
  return db.getAllFromIndex('exercises', 'by-equipment', equipment);
}

// ============ PLANS ============

export async function getPlans(): Promise<WorkoutPlan[]> {
  const db = await getDB();
  return db.getAll('plans');
}

export async function getPlan(id: string): Promise<WorkoutPlan | undefined> {
  const db = await getDB();
  return db.get('plans', id);
}

export async function savePlan(plan: WorkoutPlan): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  const existing = await db.get('plans', plan.plan_meta.plan_id!);

  await db.put('plans', {
    ...plan,
    plan_meta: {
      ...plan.plan_meta,
      created_at: existing?.plan_meta.created_at ?? now,
      updated_at: now,
    },
  });
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('plans', id);
}

// ============ LOGS ============

export async function getLogs(options?: {
  limit?: number;
  planRef?: string;
}): Promise<WorkoutLog[]> {
  const db = await getDB();

  let logs: WorkoutLog[];

  if (options?.planRef) {
    logs = await db.getAllFromIndex('logs', 'by-plan', options.planRef);
  } else {
    logs = await db.getAll('logs');
  }

  // Sort by date descending (most recent first)
  logs.sort((a, b) =>
    new Date(b.timestamp_start).getTime() - new Date(a.timestamp_start).getTime()
  );

  if (options?.limit) {
    logs = logs.slice(0, options.limit);
  }

  return logs;
}

export async function getLog(sessionId: string): Promise<WorkoutLog | undefined> {
  const db = await getDB();
  return db.get('logs', sessionId);
}

export async function saveLog(log: WorkoutLog): Promise<void> {
  const db = await getDB();
  await db.put('logs', log);
}

export async function deleteLog(sessionId: string): Promise<void> {
  const db = await getDB();
  await db.delete('logs', sessionId);
}

export async function getLogsForExercise(exerciseId: string): Promise<WorkoutLog[]> {
  const db = await getDB();
  const allLogs = await db.getAll('logs');

  return allLogs.filter((log) =>
    log.performed_exercises.some((ex) => ex.exercise_id === exerciseId)
  );
}

// ============ CONFIG (localStorage) ============

const CONFIG_KEY = 'gh-fitness-config';

export function getConfig(): UserConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored) as UserConfig;
    }
  } catch (e) {
    console.error('Failed to parse config:', e);
  }

  // Return and save default config
  const defaultConfig = createDefaultConfig();
  saveConfig(defaultConfig);
  return defaultConfig;
}

export function saveConfig(config: UserConfig): void {
  config.updated_at = new Date().toISOString();
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// ============ SCHEDULE (localStorage) ============

const SCHEDULE_KEY = 'gh-fitness-schedule';

export function getSchedule(): UserSchedule | null {
  try {
    const stored = localStorage.getItem(SCHEDULE_KEY);
    if (stored) {
      return JSON.parse(stored) as UserSchedule;
    }
  } catch (e) {
    console.error('Failed to parse schedule:', e);
  }
  return null;
}

export function saveSchedule(schedule: UserSchedule): void {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
}

export function clearSchedule(): void {
  localStorage.removeItem(SCHEDULE_KEY);
}

// ============ SYNC METADATA ============

const SYNC_KEY = 'gh-fitness-last-sync';

export function getLastSyncTime(): Date | null {
  const stored = localStorage.getItem(SYNC_KEY);
  return stored ? new Date(stored) : null;
}

export function setLastSyncTime(date: Date = new Date()): void {
  localStorage.setItem(SYNC_KEY, date.toISOString());
}

// ============ UTILITY ============

// Clear all data (for testing or reset)
export async function clearAllData(): Promise<void> {
  const db = await getDB();

  const tx1 = db.transaction('exercises', 'readwrite');
  await tx1.store.clear();
  await tx1.done;

  const tx2 = db.transaction('plans', 'readwrite');
  await tx2.store.clear();
  await tx2.done;

  const tx3 = db.transaction('logs', 'readwrite');
  await tx3.store.clear();
  await tx3.done;

  localStorage.removeItem(CONFIG_KEY);
  localStorage.removeItem(SCHEDULE_KEY);
  localStorage.removeItem(SYNC_KEY);
}

// Export database for backup
export async function exportData(): Promise<{
  exercises: ExerciseDefinition[];
  plans: WorkoutPlan[];
  logs: WorkoutLog[];
  config: UserConfig;
  schedule: UserSchedule | null;
}> {
  const [exercises, plans, logs] = await Promise.all([
    getExercises(),
    getPlans(),
    getLogs(),
  ]);

  return {
    exercises,
    plans,
    logs,
    config: getConfig(),
    schedule: getSchedule(),
  };
}

// Import data from backup
export async function importData(data: {
  exercises?: ExerciseDefinition[];
  plans?: WorkoutPlan[];
  logs?: WorkoutLog[];
  config?: UserConfig;
  schedule?: UserSchedule;
}): Promise<void> {
  if (data.exercises?.length) {
    await saveExercises(data.exercises);
  }

  if (data.plans?.length) {
    for (const plan of data.plans) {
      await savePlan(plan);
    }
  }

  if (data.logs?.length) {
    for (const log of data.logs) {
      await saveLog(log);
    }
  }

  if (data.config) {
    saveConfig(data.config);
  }

  if (data.schedule) {
    saveSchedule(data.schedule);
  }
}
