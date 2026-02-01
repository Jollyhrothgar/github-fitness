export type EquipmentType =
  | 'barbell'
  | 'trap_bar'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'kettlebell'
  | 'fixed_barbell'
  | 'bodyweight'
  | 'sled'
  | 'other';

export type WeightEntryMode =
  | 'plates_per_side' // barbell, trap_bar
  | 'total_weight' // fixed_barbell, machine stack
  | 'per_hand' // dumbbell, kettlebell
  | 'stack' // cable machine
  | 'bodyweight_plus' // pull-ups with added weight
  | 'duration' // sled push, carries (time-based)
  | 'distance'; // carries, sled (distance-based)

export type MovementPattern =
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'knee_dominant'
  | 'hip_dominant'
  | 'carry_conditioning'
  | 'conditioning'
  | 'isolation'
  | 'core';

export interface ExerciseDefinition {
  id: string;
  name: string;
  equipment_type: EquipmentType;
  movement_pattern: MovementPattern;
  primary_muscle_groups: string[];
  secondary_muscle_groups?: string[];
  weight_entry_mode: WeightEntryMode;
  default_bar_weight_lbs?: number; // For barbell exercises
  unilateral?: boolean; // Single-arm/leg exercises
  images?: string[];
  instructions?: string[];
  created_at?: string;
  updated_at?: string;
}

// Helper to get weight entry mode from equipment type
export function getWeightEntryMode(equipmentType: EquipmentType): WeightEntryMode {
  switch (equipmentType) {
    case 'barbell':
    case 'trap_bar':
      return 'plates_per_side';
    case 'dumbbell':
    case 'kettlebell':
      return 'per_hand';
    case 'cable':
      return 'stack';
    case 'machine':
    case 'fixed_barbell':
      return 'total_weight';
    case 'bodyweight':
      return 'bodyweight_plus';
    case 'sled':
      return 'duration';
    default:
      return 'total_weight';
  }
}

// Helper to get default bar weight
export function getDefaultBarWeight(equipmentType: EquipmentType): number | undefined {
  switch (equipmentType) {
    case 'barbell':
      return 45; // Standard Olympic bar
    case 'trap_bar':
      return 55; // Common hex bar weight
    default:
      return undefined;
  }
}

// Infer equipment type from exercise ID
export function inferEquipmentType(exerciseId: string): EquipmentType {
  const id = exerciseId.toLowerCase();

  if (id.includes('barbell') && !id.includes('trap')) return 'barbell';
  if (id.includes('trap_bar') || id.includes('hex_bar')) return 'trap_bar';
  if (id.includes('dumbbell') || id.includes('db_')) return 'dumbbell';
  if (id.includes('kettlebell') || id.includes('kb_')) return 'kettlebell';
  if (id.includes('cable')) return 'cable';
  if (id.includes('machine')) return 'machine';
  if (id.includes('sled')) return 'sled';
  if (
    id.includes('pullup') ||
    id.includes('pushup') ||
    id.includes('dip') ||
    id.includes('bodyweight')
  )
    return 'bodyweight';

  return 'other';
}

// Convert exercise_id to display name (e.g., "bench_press_barbell" → "Bench Press Barbell")
export function formatExerciseName(exerciseId: string): string {
  return exerciseId
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Infer primary muscle groups from movement pattern
export function inferMuscleGroups(movementPattern: MovementPattern): string[] {
  switch (movementPattern) {
    case 'horizontal_push':
      return ['chest', 'triceps', 'shoulders'];
    case 'horizontal_pull':
      return ['back', 'biceps', 'rear_delts'];
    case 'vertical_push':
      return ['shoulders', 'triceps'];
    case 'vertical_pull':
      return ['lats', 'biceps', 'upper_back'];
    case 'knee_dominant':
      return ['quadriceps', 'glutes'];
    case 'hip_dominant':
      return ['hamstrings', 'glutes', 'lower_back'];
    case 'core':
      return ['abs', 'obliques'];
    case 'isolation':
      return []; // Too varied to infer
    case 'carry_conditioning':
    case 'conditioning':
      return ['full_body'];
    default:
      return [];
  }
}

// Create an exercise definition from plan data
export function inferExerciseFromPlan(
  exerciseId: string,
  substitutionGroup?: string
): ExerciseDefinition {
  const equipmentType = inferEquipmentType(exerciseId);
  const weightEntryMode = getWeightEntryMode(equipmentType);
  const movementPattern = (substitutionGroup as MovementPattern) || 'isolation';
  const muscleGroups = inferMuscleGroups(movementPattern);

  return {
    id: exerciseId,
    name: formatExerciseName(exerciseId),
    equipment_type: equipmentType,
    movement_pattern: movementPattern,
    primary_muscle_groups: muscleGroups,
    weight_entry_mode: weightEntryMode,
    default_bar_weight_lbs: getDefaultBarWeight(equipmentType),
  };
}
