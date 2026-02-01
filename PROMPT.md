This is a github pages application, designed for tracking exercises to set goals, track progresss,
analyse trends in workouts. It focuses primarily on weight training, but it could also support other
fitness goals that can be described with summary metrics.

The goal of this app is to enable a user to execute workout plans that are defined by AI Chat
assistants (e.g. Gemini, ChatGPT, Claude, etc).

Features
- Export / import exercises using a serialized dataformat (YAML?, JSONL, etc?)
- Database of lifts / exercises for weight training and circuit training.
- Smartly compute weight based on exericise to minimize "real time calculation"
- Schedules (set number of workout goals per week and which days workouts will happen).
- Substitute exercises on the fly for when the machine or freeweight you want to use is busy.
- Track progress on lifts with proper error analysis (e.g. is what is the statistical spread of your
  heaviest lift? Is the distribution shifting? By how much? Is it significant?)
- Set timer set the time between sets based on the exercise that was done, audible alerts.
- Local data cached first and synced to github during and after workouts via actions using cached
  data for responsiveness, but eventually there are best effort guaratees that you can use the app
  locally and get all the features, and sync with github when data is available.
- Proress tracking (weigh ins, body metrics, etc).
- Automatically set new rep/set goals (as appropriate) based on a statistical analysis of past
  sessions and based on workout goals.

Data Management
- Data is synced to gihub via github actions. As a workout progresses, local progress is set, and
  synchronized with the backend data that is also checked in to github.

States
- Working out: focus should be on tracking progress through the workout and entering the values for
  the workout.
- Workout planning: select which workouts you'll do from your library of workouts and on what days.
- Workout notifications: send email notification if it's been too long since logging a planned
  workout.
- Progress review dashboard
 - Fun stats
  - Total weight lifted
  - ... other ideas?
 - Trend + error bars for heaviest lift for workout X
 - Other metrics?

More brainstorming:

I have broken this into three core structures:

ExerciseDefinitions: The static lookup table (Taxonomy).

WorkoutPlan: The prescriptive file (what the AI writes).

WorkoutLog: The descriptive file (what you record).

1. The Exercise Taxonomy (Static Config)
This enables your Substitution logic. By grouping exercises by movement_pattern, your app can instantly query: "User wants to swap Bench Press? Find all other horizontal_push items."

JSON

{
  "exercise_db": [
    {
      "id": "bench_press_barbell",
      "name": "Barbell Bench Press",
      "movement_pattern": "horizontal_push",
      "primary_muscle_groups": ["pectoralis", "triceps", "anterior_deltoid"],
      "equipment_type": "barbell",
      "unilateral": false,
      "metrics": ["weight", "reps", "rpe"]
    },
    {
      "id": "dumbbell_press_flat",
      "name": "Dumbbell Chest Press",
      "movement_pattern": "horizontal_push",
      "equipment_type": "dumbbell",
      "unilateral": true, 
      "metrics": ["weight_per_hand", "reps", "rpe"]
    }
  ]
}
2. The Workout Plan (AI Output)
This is the file you would ask Gemini/ChatGPT to generate.

Key Feature: The progression_logic field. This tells your app how to update weights next week automatically (e.g., "If RPE < 7, add 5lbs").

Key Feature: warmup_sets vs working_sets distinction for accurate volume calculation.

JSON

{
  "plan_meta": {
    "plan_name": "Rebuilding the Engine - Hypertrophy Block",
    "author_agent": "Gemini-Pro-1.5",
    "version": "1.0",
    "focus": "hypertrophy",
    "duration_weeks": 4,
    "days_per_week": 3
  },
  "schedule": [
    {
      "day_name": "Day A - Push Focus",
      "day_order": 1,
      "exercises": [
        {
          "order": 1,
          "exercise_id": "bench_press_barbell",
          "substitution_group": "horizontal_push", 
          "sets": 3,
          "target_reps": "8-12",
          "target_rpe": 8,
          "rest_seconds": 120,
          "notes": "Focus on controlled eccentric (3s down).",
          "progression_logic": "linear_load_2.5kg"
        },
        {
          "order": 2,
          "exercise_id": "goblet_squat",
          "substitution_group": "knee_dominant",
          "sets": 3,
          "target_reps": "12-15",
          "target_rpe": 7,
          "rest_seconds": 90
        }
      ]
    }
  ]
}
3. The Workout Log (The "Data Lake")
This is what your app saves to localStorage and syncs to GitHub.

Statistical Key: rpe and failure are critical. A 1RM calculation is only valid if we know how close to failure you were.

Plate Math: actual_weight_lifted should be the final resolved number after your app does the plate math.

JSON

{
  "session_id": "uuid-v4-string",
  "timestamp_start": "2026-01-20T18:30:00Z",
  "timestamp_end": "2026-01-20T19:25:00Z",
  "plan_ref": "Rebuilding the Engine v1.0",
  "body_weight_kg": 98.5,
  "subjective_readiness": 7, 
  "performed_exercises": [
    {
      "exercise_id": "bench_press_barbell",
      "was_substitution": false,
      "sets": [
        {
          "set_number": 1,
          "is_warmup": true,
          "weight": 45.0,
          "reps": 10,
          "rpe": 3,
          "rest_taken_seconds": 60
        },
        {
          "set_number": 2,
          "is_warmup": false,
          "weight": 135.0,
          "reps": 10,
          "rpe": 8.5,
          "failure": false,
          "notes": "Felt heavy today",
          "calculated_1rm": 180.0 
        }
      ]
    }
  ]
}
How this enables your Features
1. Statistical "True 1RM" Analysis
You mentioned wanting to know if your strength distribution is shifting. With the WorkoutLog schema, you can run this Python logic:

Python

# Calculate One Rep Max (Epley Formula)
# 1RM = Weight * (1 + Reps/30)
# Filter: Only count sets where RPE >= 7 OR Failure = True to reduce noise.

df['estimated_1rm'] = df['weight'] * (1 + df['reps'] / 30)
valid_sets = df[(df['rpe'] >= 7) | (df['failure'] == True)]

# Now you can plot a rolling average with error bars
daily_max = valid_sets.groupby('date')['estimated_1rm'].max()
rolling_mean = daily_max.rolling(window=3).mean()
rolling_std = daily_max.rolling(window=3).std()
2. The "Busy Gym" Substitution
When the user clicks "Swap" on bench_press_barbell:

App looks at WorkoutPlan -> sees substitution_group: "horizontal_push".

App queries ExerciseDefinitions -> WHERE movement_pattern == "horizontal_push".

App filters out the current exercise.

App sorts remaining list by unilateral (preference) or recent history.

3. Smart Plate Math
You need a small local config file for UserEquipment.

JSON

{
  "available_plates_lbs": [45, 45, 45, 45, 25, 25, 10, 10, 5, 5, 2.5, 2.5],
  "bar_weight_lbs": 45
}
Algorithm: Target Weight = 185 lbs.

185 - 45 (bar) = 140

140 / 2 sides = 70 lbs per side

Recursive subtraction from available_plates: 70 - 45 = 25, 25 - 25 = 0.

Output: "Load [45] [25] per side."

## Data Sources

- https://github.com/yuhonas/free-exercise-db 
- https://wger.de/api/v2/ (use WGER_API_KEY in ~/.env
- Exercise with Gifs dataset: https://www.kaggle.com/datasets/exercisedb/fitness-exercises-dataset

Optional schema mapping idea:

import requests
import json

# 1. Fetch the raw "Free Exercise DB" JSON
url = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
response = requests.get(url)
raw_data = response.json()

# 2. Define a helper to map their "mechanic" to your "Movement Pattern"
# Note: This is imperfect, but a good starting point for the AI to refine later.
def map_pattern(ex):
    # logic to guess pattern based on muscle + force
    force = ex.get('force')
    mechanic = ex.get('mechanic')
    primary = ex.get('primaryMuscles', [])[0] if ex.get('primaryMuscles') else "unknown"
    
    if force == "push" and "chest" in primary: return "horizontal_push"
    if force == "push" and "shoulders" in primary: return "vertical_push"
    if force == "pull" and "back" in primary: return "vertical_pull" # simplistic, needs manual review
    if force == "push" and "quadriceps" in primary: return "knee_dominant"
    if force == "pull" and "hamstrings" in primary: return "hip_dominant"
    return "isolation" # default fallback

# 3. Transform to your Schema
my_db = []

for item in raw_data:
    entry = {
        "id": item['id'],
        "name": item['name'],
        "movement_pattern": map_pattern(item), # The heuristic above
        "primary_muscle_groups": item.get('primaryMuscles', []),
        "equipment_type": item.get('equipment', 'body_only'),
        "images": item.get('images', []),
        "instructions": item.get('instructions', [])
    }
    my_db.append(entry)

# 4. Save to your repo
with open('exercise_db_v1.json', 'w') as f:
    json.dump({"exercise_db": my_db}, f, indent=2)

print(f"Database populated with {len(my_db)} exercises.")
-  
