import type { WorkoutLog } from '@/types';
import { calculateSessionVolume, formatDuration, estimate1RM } from '@/types/log';

interface WorkoutSummaryProps {
  log: WorkoutLog;
  onClose: () => void;
}

export function WorkoutSummary({ log, onClose }: WorkoutSummaryProps) {
  const totalVolume = calculateSessionVolume(log);
  const duration = formatDuration(log.timestamp_start, log.timestamp_end);

  // Count working sets
  const workingSets = log.performed_exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => !s.is_warmup).length,
    0
  );

  // Find PRs (highest estimated 1RMs)
  const prs: { exerciseId: string; weight: number; reps: number; estimated1RM: number }[] = [];
  for (const ex of log.performed_exercises) {
    const workingSetsOnly = ex.sets.filter((s) => !s.is_warmup && s.reps && s.reps > 0);
    if (workingSetsOnly.length === 0) continue;

    const best = workingSetsOnly.reduce((best, set) => {
      const rm = estimate1RM(set.weight_calculated, set.reps || 0);
      const bestRm = estimate1RM(best.weight_calculated, best.reps || 0);
      return rm > bestRm ? set : best;
    });

    if (best.reps) {
      prs.push({
        exerciseId: ex.exercise_id,
        weight: best.weight_calculated,
        reps: best.reps,
        estimated1RM: Math.round(estimate1RM(best.weight_calculated, best.reps)),
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">💪</div>
          <h2 className="text-2xl font-bold">Workout Complete!</h2>
          <p className="text-text-secondary mt-1">{duration}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface-elevated rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{log.performed_exercises.length}</p>
            <p className="text-sm text-text-secondary">Exercises</p>
          </div>
          <div className="bg-surface-elevated rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{workingSets}</p>
            <p className="text-sm text-text-secondary">Working Sets</p>
          </div>
          <div className="col-span-2 bg-surface-elevated rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{totalVolume.toLocaleString()}</p>
            <p className="text-sm text-text-secondary">Total Volume (lbs)</p>
          </div>
        </div>

        {/* PRs / Best lifts */}
        {prs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Best Lifts</h3>
            <div className="space-y-2">
              {prs.slice(0, 5).map((pr) => (
                <div
                  key={pr.exerciseId}
                  className="flex items-center justify-between bg-surface-elevated rounded-lg p-3"
                >
                  <span className="text-sm truncate flex-1">
                    {pr.exerciseId.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-medium ml-2">
                    {pr.weight} × {pr.reps}
                    <span className="text-text-muted ml-1">~{pr.estimated1RM}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
