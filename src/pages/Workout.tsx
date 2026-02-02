import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useStorage } from '@/lib/StorageContext';
import { addSetToExercise } from '@/hooks/useWorkoutLogs';
import type { WorkoutPlan, WorkoutDay, WorkoutLog, LoggedSet, ExerciseDefinition } from '@/types';
import { ExerciseCard, RestTimer, WorkoutSummary, SubstitutionModal, ExerciseInfoModal } from '@/components/workout';

type WorkoutState = 'loading' | 'no-plan' | 'pick-day' | 'preview' | 'active';

export default function Workout() {
  const { plans, exercises, logs, config, schedule } = useStorage();
  const { getPlan } = plans;
  const { exercises: exerciseList } = exercises;
  const { createLog, saveLog, completeLog, setActiveSessionId, clearActiveSession } = logs;
  const { config: userConfig } = config;
  const { schedule: activeSchedule, advanceToNext } = schedule;

  // Page state
  const [state, setState] = useState<WorkoutState>('loading');
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [day, setDay] = useState<WorkoutDay | null>(null);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null);

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
  const [showingInfoExercise, setShowingInfoExercise] = useState<ExerciseDefinition | null>(null);

  // Exercise substitutions map (original -> replacement)
  const [substitutions, setSubstitutions] = useState<Map<string, string>>(new Map());

  // Initialize: check for active workout session or show day picker
  useEffect(() => {
    async function init() {
      // Only resume if there's an active session (user explicitly started a workout)
      const activeSessionId = logs.getActiveSessionId();

      if (activeSessionId) {
        // Try to resume the active session
        const activeLog = await logs.getLog(activeSessionId);
        if (activeLog && !activeLog.timestamp_end) {
          const loadedPlan = await getPlan(activeLog.plan_ref);
          if (loadedPlan) {
            const loadedDay = loadedPlan.schedule.find((d) => d.id === activeLog.day_id);
            if (loadedDay) {
              setPlan(loadedPlan);
              setDay(loadedDay);
              setWorkoutLog(activeLog);
              setState('active');
              return;
            }
          }
        }
        // Active session invalid or completed - clear it
        clearActiveSession();
      }

      // No active session - check for active plan
      if (activeSchedule?.active_plan_id) {
        const loadedPlan = await getPlan(activeSchedule.active_plan_id);
        if (loadedPlan) {
          setPlan(loadedPlan);
          setState('pick-day');
          return;
        }
      }

      // No active plan
      setState('no-plan');
    }

    init();
  }, [getPlan, logs, activeSchedule, clearActiveSession]);

  // Preview a day before starting
  const handlePreviewDay = useCallback((selectedDay: WorkoutDay) => {
    setDay(selectedDay);
    setState('preview');
  }, []);

  // Go back to day picker
  const handleBackToPicker = useCallback(() => {
    setDay(null);
    setState('pick-day');
  }, []);

  // Actually start the workout
  const handleStartWorkout = useCallback(async () => {
    if (!plan || !day) return;

    const newLog = createLog(plan.plan_meta.plan_id!, day.id, userConfig.device_id);
    setWorkoutLog(newLog);
    setActiveSessionId(newLog.session_id);
    await saveLog(newLog);
    setState('active');
  }, [plan, day, createLog, userConfig.device_id, saveLog, setActiveSessionId]);

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
    clearActiveSession();
    advanceToNext();
    setShowSummary(true);
  }, [workoutLog, completeLog, clearActiveSession, advanceToNext]);

  // Close summary and reset
  const handleCloseSummary = useCallback(() => {
    setShowSummary(false);
    setWorkoutLog(null);
    setDay(null);
    setSubstitutions(new Map());
    setState(plan ? 'pick-day' : 'no-plan');
  }, [plan]);

  // Calculate workout progress
  const getProgress = useCallback(() => {
    if (!day || !workoutLog) return { completed: 0, total: 0, percent: 0 };

    let completed = 0;
    const total = day.exercises.reduce((sum, ex) => sum + ex.sets, 0);

    for (const planned of day.exercises) {
      const actualId = substitutions.get(planned.exercise_id) ?? planned.exercise_id;
      const performed = workoutLog.performed_exercises.find((p) => p.exercise_id === actualId);
      const workingSets = performed?.sets.filter((s) => !s.is_warmup).length ?? 0;
      completed += Math.min(workingSets, planned.sets);
    }

    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [day, workoutLog, substitutions]);

  // Check if workout is complete
  const isWorkoutComplete = useCallback(() => {
    const progress = getProgress();
    return progress.completed >= progress.total && progress.total > 0;
  }, [getProgress]);

  // Loading state
  if (state === 'loading') {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  // No active plan
  if (state === 'no-plan') {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Workout</h1>
        <div className="bg-surface rounded-lg p-6 text-center">
          <p className="text-text-muted mb-4">
            No active plan selected. Create or import a workout plan to get started.
          </p>
          <Link
            to="/plans"
            className="inline-block px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition-colors"
          >
            Go to Plans
          </Link>
        </div>
      </div>
    );
  }

  // Day picker
  if (state === 'pick-day' && plan) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-2">Choose Workout</h1>
        <p className="text-text-secondary mb-6">{plan.plan_meta.plan_name}</p>

        <div className="space-y-3">
          {plan.schedule.map((scheduleDay) => (
            <button
              key={scheduleDay.id}
              onClick={() => handlePreviewDay(scheduleDay)}
              className="w-full bg-surface hover:bg-surface-elevated active:bg-surface-elevated/80 rounded-lg p-4 text-left transition-colors"
            >
              <h3 className="font-semibold">{scheduleDay.day_name}</h3>
              <p className="text-sm text-text-secondary mt-1">
                {scheduleDay.exercises.length} exercises
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {scheduleDay.exercises.slice(0, 3).map((ex) => (
                  <span
                    key={ex.order}
                    className="px-2 py-0.5 bg-surface-elevated rounded text-xs text-text-muted"
                  >
                    {ex.exercise_id.replace(/_/g, ' ')}
                  </span>
                ))}
                {scheduleDay.exercises.length > 3 && (
                  <span className="px-2 py-0.5 text-xs text-text-muted">
                    +{scheduleDay.exercises.length - 3} more
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Day preview (before starting)
  if (state === 'preview' && plan && day) {
    return (
      <div className="p-4 pb-32">
        {/* Header with back button */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleBackToPicker}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary active:bg-surface-elevated rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold">{day.day_name}</h1>
            <p className="text-sm text-text-secondary">{plan.plan_meta.plan_name}</p>
          </div>
        </div>

        {/* Exercise list preview */}
        <div className="space-y-2 mb-4">
          {day.exercises.map((planned) => {
            const exercise = exerciseList.find((e) => e.id === planned.exercise_id);
            return (
              <div
                key={planned.exercise_id}
                className="bg-surface rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted text-sm">{planned.order}.</span>
                      <h3 className="font-medium">
                        {exercise?.name ?? planned.exercise_id.replace(/_/g, ' ')}
                      </h3>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                      {planned.sets} sets × {planned.target_reps} reps
                      {planned.target_rpe && ` @ RPE ${planned.target_rpe}`}
                    </p>
                  </div>
                  {exercise && (
                    <button
                      onClick={() => setShowingInfoExercise(exercise)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted hover:text-text-primary active:bg-surface-elevated rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                </div>
                {planned.notes && (
                  <p className="text-sm text-text-muted mt-2 italic">{planned.notes}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Start button */}
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent pointer-events-none">
          <button
            onClick={handleStartWorkout}
            className="w-full max-w-lg mx-auto block min-h-[48px] py-3 bg-primary hover:bg-primary-hover active:bg-primary-hover/90 rounded-lg font-medium transition-colors pointer-events-auto"
          >
            Start Workout
          </button>
        </div>

        {/* Exercise info modal */}
        {showingInfoExercise && (
          <ExerciseInfoModal
            exercise={showingInfoExercise}
            onClose={() => setShowingInfoExercise(null)}
          />
        )}
      </div>
    );
  }

  // Active workout
  if (state === 'active' && day && plan && workoutLog) {
    const progress = getProgress();

    return (
      <div className="p-4 pb-32">
        {/* Header with progress */}
        <div className="mb-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-2xl font-bold">{day.day_name}</h1>
              <p className="text-sm text-text-secondary">{plan.plan_meta.plan_name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{progress.percent}%</p>
              <p className="text-xs text-text-muted">{progress.completed}/{progress.total} sets</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
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
                onShowInfo={() => setShowingInfoExercise(exercise)}
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
            className={`w-full max-w-lg mx-auto block py-3 rounded-lg font-medium transition-colors pointer-events-auto ${
              isWorkoutComplete()
                ? 'bg-success hover:bg-success/90'
                : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {isWorkoutComplete()
              ? 'Complete Workout'
              : `${progress.completed}/${progress.total} sets done`}
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

        {/* Exercise info modal */}
        {showingInfoExercise && (
          <ExerciseInfoModal
            exercise={showingInfoExercise}
            onClose={() => setShowingInfoExercise(null)}
          />
        )}
      </div>
    );
  }

  // Fallback
  return null;
}
