// Mapping from our exercise IDs to free-exercise-db IDs
// DB source: https://github.com/yuhonas/free-exercise-db

const EXERCISE_DB_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// Map our exercise_id to the free-exercise-db folder name
export const exerciseDbMapping: Record<string, string> = {
  // Horizontal Push
  bench_press_barbell: 'Barbell_Bench_Press_-_Medium_Grip',
  bench_press_dumbbell: 'Dumbbell_Bench_Press',
  incline_bench_press_barbell: 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  incline_bench_press_dumbbell: 'Incline_Dumbbell_Press',
  decline_bench_press_barbell: 'Decline_Barbell_Bench_Press',
  chest_press_machine: 'Machine_Bench_Press',
  pushups: 'Pushups',
  dips_chest: 'Chest_Dip',
  cable_fly: 'Cable_Crossover',

  // Horizontal Pull
  barbell_row: 'Bent_Over_Barbell_Row',
  pendlay_row: 'Bent_Over_Barbell_Row',
  dumbbell_row: 'One-Arm_Dumbbell_Row',
  cable_row_seated: 'Seated_Cable_Rows',
  chest_supported_row: 'Incline_Dumbbell_Row',
  t_bar_row: 'T-Bar_Row_with_Handle',
  machine_row: 'Leverage_High_Row',
  face_pulls: 'Face_Pull',

  // Vertical Push
  overhead_press_barbell: 'Standing_Military_Press',
  overhead_press_dumbbell: 'Standing_Dumbbell_Press',
  seated_shoulder_press_dumbbell: 'Seated_Dumbbell_Press',
  shoulder_press_machine: 'Machine_Shoulder_(Military)_Press',
  push_press: 'Push_Press',
  lateral_raise_dumbbell: 'Side_Lateral_Raise',
  lateral_raise_cable: 'Cable_Lateral_Raise',

  // Vertical Pull
  pullups: 'Pullups',
  chinups: 'Chin-Up',
  lat_pulldown: 'Wide-Grip_Lat_Pulldown',
  lat_pulldown_close_grip: 'Close-Grip_Front_Lat_Pulldown',
  assisted_pullup_machine: 'Assisted_Parallel_Close-Grip_Pull-Up',
  straight_arm_pulldown: 'Straight-Arm_Pulldown',

  // Knee Dominant
  squat_barbell: 'Barbell_Full_Squat',
  front_squat: 'Front_Barbell_Squat',
  goblet_squat: 'Goblet_Squat',
  leg_press: 'Leg_Press',
  hack_squat: 'Hack_Squat',
  lunges_dumbbell: 'Dumbbell_Lunges',
  bulgarian_split_squat: 'Single_Leg_Squat',
  leg_extension: 'Leg_Extensions',
  step_ups: 'Barbell_Step_Ups',

  // Hip Dominant
  deadlift_conventional: 'Barbell_Deadlift',
  deadlift_sumo: 'Sumo_Deadlift',
  romanian_deadlift: 'Romanian_Deadlift',
  romanian_deadlift_dumbbell: 'Romanian_Deadlift',
  trap_bar_deadlift: 'Barbell_Deadlift',
  hip_thrust_barbell: 'Barbell_Hip_Thrust',
  glute_bridge: 'Barbell_Glute_Bridge',
  good_mornings: 'Good_Morning',
  leg_curl_lying: 'Lying_Leg_Curls',
  leg_curl_seated: 'Seated_Leg_Curl',
  back_extension: 'Hyperextensions_(Back_Extensions)',
  kettlebell_swing: 'Kettlebell_Sumo_High_Pull',

  // Isolation - Arms
  bicep_curl_barbell: 'Barbell_Curl',
  bicep_curl_dumbbell: 'Dumbbell_Bicep_Curl',
  hammer_curl: 'Hammer_Curls',
  preacher_curl: 'Preacher_Curl',
  cable_curl: 'Cable_Hammer_Curls_-_Rope_Attachment',
  tricep_pushdown: 'Triceps_Pushdown',
  tricep_extension_overhead: 'Standing_Dumbbell_Triceps_Extension',
  skull_crushers: 'Lying_Triceps_Press',
  tricep_kickback: 'Tricep_Dumbbell_Kickback',
  close_grip_bench_press: 'Close-Grip_Barbell_Bench_Press',

  // Core
  plank: 'Plank',
  hanging_leg_raise: 'Hanging_Leg_Raise',
  cable_crunch: 'Cable_Crunch',
  ab_wheel_rollout: 'Ab_Roller',
  russian_twist: 'Russian_Twist',
  dead_bug: 'Dead_Bug',
  pallof_press: 'Pallof_Press_With_Rotation',

  // Carry/Conditioning
  farmers_walk: 'Farmer\'s_Walk',
  suitcase_carry: 'Farmer\'s_Walk',
  trap_bar_carry: 'Farmer\'s_Walk',

  // Isolation - Other
  calf_raise_standing: 'Standing_Calf_Raises',
  calf_raise_seated: 'Seated_Calf_Raise',
  shrugs_barbell: 'Barbell_Shrug',
  shrugs_dumbbell: 'Dumbbell_Shrug',
  rear_delt_fly: 'Seated_Bent-Over_Rear_Delt_Raise',
  reverse_pec_deck: 'Reverse_Machine_Flyes',
  wrist_curl: 'Palms-Down_Wrist_Curl_Over_A_Bench',
};

export interface ExerciseMediaInfo {
  images: string[];
  instructions: string[];
  found: boolean;
}

// Cache for fetched exercise data
const exerciseCache = new Map<string, ExerciseMediaInfo>();

// Get image URLs for an exercise
export function getExerciseImageUrls(exerciseId: string): string[] {
  const dbId = exerciseDbMapping[exerciseId];
  if (!dbId) return [];

  // Most exercises have 2 images (start and end position)
  return [
    `${EXERCISE_DB_BASE}/${encodeURIComponent(dbId)}/0.jpg`,
    `${EXERCISE_DB_BASE}/${encodeURIComponent(dbId)}/1.jpg`,
  ];
}

// Fetch full exercise info from the DB
export async function fetchExerciseMedia(exerciseId: string): Promise<ExerciseMediaInfo> {
  // Check cache first
  if (exerciseCache.has(exerciseId)) {
    return exerciseCache.get(exerciseId)!;
  }

  const dbId = exerciseDbMapping[exerciseId];
  if (!dbId) {
    const notFound = { images: [], instructions: [], found: false };
    exerciseCache.set(exerciseId, notFound);
    return notFound;
  }

  try {
    // Fetch the full exercise database (it's cached by the service worker)
    const response = await fetch(
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exercise database');
    }

    const exercises = await response.json();
    const exercise = exercises.find((e: { id: string }) => e.id === dbId);

    if (!exercise) {
      const notFound = { images: [], instructions: [], found: false };
      exerciseCache.set(exerciseId, notFound);
      return notFound;
    }

    const info: ExerciseMediaInfo = {
      images: (exercise.images || []).map(
        (img: string) => `${EXERCISE_DB_BASE}/${encodeURIComponent(img)}`
      ),
      instructions: exercise.instructions || [],
      found: true,
    };

    exerciseCache.set(exerciseId, info);
    return info;
  } catch (error) {
    console.error('Failed to fetch exercise media:', error);
    const notFound = { images: [], instructions: [], found: false };
    exerciseCache.set(exerciseId, notFound);
    return notFound;
  }
}
