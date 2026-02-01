import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useStorage } from '@/lib/StorageContext';
import { addSetToExercise } from '@/hooks/useWorkoutLogs';
import type { WorkoutPlan, WorkoutDay, WorkoutLog, LoggedSet, ExerciseDefinition } from '@/types';
import { ExerciseCard, RestTimer, WorkoutSummary, SubstitutionModal } from '@/components/workout';

export default function Workout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('plan');
  const dayId = searchParams.get('day');

  const { plans, exercises, logs, config, schedule } = useStorage();
  const { getPlan } = plans;
  const { exercises: exerciseList } = exercises;
  const { createLog, saveLog, completeLog } = logs;
  const { config: userConfig } = config;
  const { advanceToNext } = schedule;

  // Workout state
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [day, setDay] = useState<WorkoutDay | null>(null);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(120);
  const [showSummary, setShowSummary] = useState(false);
  const [substitutingExercise, setSubstitutingExercise] = useState<{
    index: number;
    exercise: ExerciseDefinition;
    group: string;
  } | null>(null);

  // Exercise substitutions map (original -> replacement)
  const [substitutions, setSubstitutions] = useState<Map<string, string>>(new Map());

  // Load plan and create workout log
  useEffect(() => {
    async function initWorkout() {
      if (!planId || !dayId) {
        setLoading(false);
        return;
      }

      const loadedPlan = await getPlan(planId);
      if (!loadedPlan) {
        setLoading(false);
        return;
      }

      const loadedDay = loadedPlan.schedule.find((d) => d.id === dayId);
      if (!loadedDay) {
        setLoading(false);
        return;
      }

      setPlan(loadedPlan);
      setDay(loadedDay);

      // Create new workout log
      const newLog = createLog(planId, dayId, userConfig.device_id);
      setWorkoutLog(newLog);
      setLoading(false);
    }

    initWorkout();
  }, [planId, dayId, getPlan, createLog, userConfig.device_id]);

  // Handle logging a set
  const handleLogSet = useCallback(
    async (plannedExerciseId: string, set: Omit<LoggedSet, 'timestamp'>) => {
      if (!workoutLog || !day) return;

      const actualExerciseId = substitutions.get(plannedExerciseId) ?? plannedExerciseId;
      const wasSubstitution = substitutions.has(plannedExerciseId);

      const fullSet: LoggedSet = {
        ...set,
        timestamp: new Date().toISOString(),
      };

      const updatedLog = addSetToExercise(
        workoutLog,
        actualExerciseId,
        fullSet,
        wasSubstitution,
        wasSubstitution ? plannedExerciseId : undefined
      );

      setWorkoutLog(updatedLog);
      await saveLog(updatedLog);

      // Get rest time for this exercise
      const planned = day.exercises.find((e) => e.exercise_id === plannedExerciseId);
      if (planned && !set.is_warmup) {
        setTimerDuration(planned.rest_seconds);
        setShowTimer(true);
      }
    },
    [workoutLog, day, substitutions, saveLog]
  );

  // Handle timer complete
  const handleTimerComplete = useCallback(() => {
    setShowTimer(false);
  }, []);

  // Handle exercise substitution
  const handleSubstitute = useCallback(
    (index: number, exercise: ExerciseDefinition, group: string) => {
      setSubstitutingExercise({ index, exercise, group });
    },
    []
  );

  const handleSubstitutionSelect = useCallback(
    (originalId: string, newExercise: ExerciseDefinition) => {
      setSubstitutions((prev) => new Map(prev).set(originalId, newExercise.id));
      setSubstitutingExercise(null);
    },
    []
  );

  // Complete workout
  const handleCompleteWorkout = useCallback(async () => {
    if (!workoutLog) return;

    await completeLog(workoutLog);
    advanceToNext();
    setShowSummary(true);
  }, [workoutLog, completeLog, advanceToNext]);

  // Close summary and go home
  const handleCloseSummary = useCallback(() => {
    setShowSummary(false);
    navigate('/');
  }, [navigate]);

  // Check if workout is complete
  const isWorkoutComplete = useCallback(() => {
    if (!day || !workoutLog) return false;

    for (const planned of day.exercises) {
      const actualId = substitutions.get(planned.exercise_id) ?? planned.exercise_id;
      const performed = workoutLog.performed_exercises.find((p) => p.exercise_id === actualId);
      const workingSets = performed?.sets.filter((s) => !s.is_warmup).length ?? 0;
      if (workingSets < planned.sets) return false;
    }
    return true;
  }, [day, workoutLog, substitutions]);

  // Loading state
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <p className="text-text-muted">Loading workout...</p>
      </div>
    );
  }

  // No plan/day selected
  if (!planId || !dayId || !plan || !day) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Start Workout</h1>
        <div className="bg-surface rounded-lg p-6 text-center">
          <p className="text-text-muted mb-4">
            Select a workout from your active plan to begin.
          </p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-32">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{day.day_name}</h1>
        <p className="text-sm text-text-secondary">{plan.plan_meta.plan_name}</p>
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        {day.exercises.map((planned, index) => {
          const actualId = substitutions.get(planned.exercise_id) ?? planned.exercise_id;
          const exercise = exerciseList.find((e) => e.id === actualId);
          const performed = workoutLog?.performed_exercises.find((p) => p.exercise_id === actualId);

          if (!exercise) {
            return (
              <div key={planned.exercise_id} className="bg-surface rounded-lg p-4">
                <p className="text-text-muted">
                  Exercise not found: {planned.exercise_id}
                </p>
              </div>
            );
          }

          return (
            <ExerciseCard
              key={planned.exercise_id}
              exercise={exercise}
              planned={planned}
              performed={performed}
              unit={userConfig.units}
              barWeight={userConfig.equipment.standard_bar_weight_lbs}
              vibrationEnabled={userConfig.timer_vibration_enabled}
              onLogSet={(set) => handleLogSet(planned.exercise_id, set)}
              onSubstitute={() => handleSubstitute(index, exercise, planned.substitution_group)}
              isActive={index === activeExerciseIndex}
              onActivate={() => setActiveExerciseIndex(index)}
            />
          );
        })}
      </div>

      {/* Complete workout button */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent pointer-events-none">
        <button
          onClick={handleCompleteWorkout}
          disabled={!isWorkoutComplete()}
          className="w-full max-w-lg mx-auto block py-3 bg-success hover:bg-success/90 disabled:bg-surface-elevated disabled:text-text-muted rounded-lg font-medium transition-colors pointer-events-auto"
        >
          {isWorkoutComplete() ? 'Complete Workout' : `${day.exercises.length - (workoutLog?.performed_exercises.length ?? 0)} exercises remaining`}
        </button>
      </div>

      {/* Rest timer */}
      <RestTimer
        duration={timerDuration}
        isActive={showTimer}
        onComplete={handleTimerComplete}
        audioEnabled={userConfig.timer_audio_enabled}
        notificationsEnabled={userConfig.timer_notifications_enabled}
      />

      {/* Workout summary */}
      {showSummary && workoutLog && (
        <WorkoutSummary log={workoutLog} onClose={handleCloseSummary} />
      )}

      {/* Substitution modal */}
      {substitutingExercise && (
        <SubstitutionModal
          currentExercise={substitutingExercise.exercise}
          substitutionGroup={substitutingExercise.group}
          allExercises={exerciseList}
          onSelect={(ex) =>
            handleSubstitutionSelect(
              day.exercises[substitutingExercise.index].exercise_id,
              ex
            )
          }
          onCancel={() => setSubstitutingExercise(null)}
        />
      )}
    </div>
  );
}
