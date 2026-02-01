import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStorage } from '@/lib/StorageContext';
import type { WorkoutDay } from '@/types';
import { formatDuration } from '@/types/log';

export default function Home() {
  const navigate = useNavigate();
  const { schedule, plans, logs, isLoading } = useStorage();
  const { schedule: activeSchedule, nextWorkoutDayId, weeklyProgress } = schedule;
  const { getPlan } = plans;
  const { logs: recentLogs } = logs;

  const [nextDay, setNextDay] = useState<WorkoutDay | null>(null);
  const [activePlanName, setActivePlanName] = useState<string>('');

  // Load next workout day details
  useEffect(() => {
    async function loadNextDay() {
      if (activeSchedule?.active_plan_id && nextWorkoutDayId) {
        const plan = await getPlan(activeSchedule.active_plan_id);
        if (plan) {
          setActivePlanName(plan.plan_meta.plan_name);
          const day = plan.schedule.find((d) => d.id === nextWorkoutDayId);
          setNextDay(day || null);
        }
      } else {
        setNextDay(null);
        setActivePlanName('');
      }
    }
    loadNextDay();
  }, [activeSchedule, nextWorkoutDayId, getPlan]);

  const handleStartWorkout = () => {
    if (nextDay && activeSchedule) {
      navigate(`/workout?plan=${activeSchedule.active_plan_id}&day=${nextDay.id}`);
    }
  };

  const progressPercent =
    weeklyProgress.goal > 0
      ? Math.min(100, (weeklyProgress.completed / weeklyProgress.goal) * 100)
      : 0;

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">GitHub Fitness</h1>

      {/* Next Workout Card */}
      <section className="bg-surface rounded-lg p-4 mb-4">
        <h2 className="text-sm font-medium text-text-secondary mb-2">
          Next Workout
        </h2>

        {nextDay ? (
          <div>
            <h3 className="text-xl font-semibold">{nextDay.day_name}</h3>
            <p className="text-sm text-text-secondary mt-1">
              {activePlanName} • {nextDay.exercises.length} exercises
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {nextDay.exercises.slice(0, 4).map((ex) => (
                <span
                  key={ex.order}
                  className="px-2 py-1 bg-surface-elevated rounded text-xs text-text-secondary"
                >
                  {ex.exercise_id.replace(/_/g, ' ')}
                </span>
              ))}
              {nextDay.exercises.length > 4 && (
                <span className="px-2 py-1 bg-surface-elevated rounded text-xs text-text-muted">
                  +{nextDay.exercises.length - 4} more
                </span>
              )}
            </div>

            <button
              onClick={handleStartWorkout}
              className="w-full mt-4 px-4 py-3 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors"
            >
              Start Workout
            </button>
          </div>
        ) : (
          <div>
            <p className="text-text-muted">
              No active plan. Import or create a workout plan to get started.
            </p>
            <Link
              to="/plans"
              className="inline-block mt-3 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition-colors"
            >
              Go to Plans
            </Link>
          </div>
        )}
      </section>

      {/* Weekly Goal */}
      <section className="bg-surface rounded-lg p-4 mb-4">
        <h2 className="text-sm font-medium text-text-secondary mb-2">
          This Week
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{weeklyProgress.completed}</span>
          <span className="text-text-muted">of {weeklyProgress.goal} sessions</span>
        </div>
        <div className="mt-2 h-2 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {weeklyProgress.completed >= weeklyProgress.goal && weeklyProgress.goal > 0 && (
          <p className="text-success text-sm mt-2">Weekly goal achieved!</p>
        )}
      </section>

      {/* Recent Workouts */}
      <section className="bg-surface rounded-lg p-4">
        <h2 className="text-sm font-medium text-text-secondary mb-3">
          Recent Workouts
        </h2>

        {recentLogs.length === 0 ? (
          <p className="text-text-muted text-sm">No workouts logged yet.</p>
        ) : (
          <div className="space-y-3">
            {recentLogs.slice(0, 5).map((log) => (
              <div
                key={log.session_id}
                className="p-3 bg-surface-elevated rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {new Date(log.timestamp_start).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {log.performed_exercises.length} exercises •{' '}
                      {formatDuration(log.timestamp_start, log.timestamp_end)}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted">
                    {log.day_id.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
