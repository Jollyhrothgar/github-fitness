import type { WorkoutLog } from '@/types';
import { formatDuration, calculateExerciseVolume, estimate1RM } from '@/types/log';

interface SessionDetailProps {
  log: WorkoutLog;
  onClose: () => void;
  onSelectExercise?: (exerciseId: string) => void;
}

export function SessionDetail({ log, onClose, onSelectExercise }: SessionDetailProps) {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-background/95 z-50 overflow-y-auto">
      <div className="min-h-full p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">{log.day_id.replace(/_/g, ' ')}</h2>
              <p className="text-sm text-text-secondary">
                {formatDate(log.timestamp_start)} at {formatTime(log.timestamp_start)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-surface rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{log.performed_exercises.length}</p>
              <p className="text-xs text-text-secondary">Exercises</p>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">
                {log.performed_exercises.reduce(
                  (sum, ex) => sum + ex.sets.filter((s) => !s.is_warmup).length,
                  0
                )}
              </p>
              <p className="text-xs text-text-secondary">Sets</p>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">
                {log.timestamp_end ? formatDuration(log.timestamp_start, log.timestamp_end) : '-'}
              </p>
              <p className="text-xs text-text-secondary">Duration</p>
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-4">
            {log.performed_exercises.map((exercise) => {
              const workingSets = exercise.sets.filter((s) => !s.is_warmup);
              const warmupSets = exercise.sets.filter((s) => s.is_warmup);
              const volume = calculateExerciseVolume(exercise);

              // Find best set (highest 1RM)
              const bestSet = workingSets.reduce((best, set) => {
                if (!set.reps) return best;
                const rm = estimate1RM(set.weight_calculated, set.reps);
                const bestRm = best?.reps
                  ? estimate1RM(best.weight_calculated, best.reps)
                  : 0;
                return rm > bestRm ? set : best;
              }, workingSets[0]);

              return (
                <div key={exercise.exercise_id} className="bg-surface rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => onSelectExercise?.(exercise.exercise_id)}
                      className="font-medium text-left hover:text-primary transition-colors"
                    >
                      {exercise.exercise_id.replace(/_/g, ' ')}
                      {exercise.was_substitution && (
                        <span className="ml-2 text-xs text-text-muted">(substituted)</span>
                      )}
                    </button>
                    <span className="text-sm text-text-muted">{volume.toLocaleString()} lbs</span>
                  </div>

                  {/* Warmup sets */}
                  {warmupSets.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-text-muted mb-1">Warmup</p>
                      <div className="flex flex-wrap gap-2">
                        {warmupSets.map((set, i) => (
                          <span
                            key={i}
                            className="text-sm text-text-secondary bg-surface-elevated px-2 py-1 rounded"
                          >
                            {set.weight_calculated} x {set.reps ?? '-'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Working sets */}
                  <div>
                    <p className="text-xs text-text-muted mb-1">Working Sets</p>
                    <div className="flex flex-wrap gap-2">
                      {workingSets.map((set, i) => {
                        const isBest = set === bestSet;
                        return (
                          <span
                            key={i}
                            className={`text-sm px-2 py-1 rounded ${
                              isBest
                                ? 'bg-primary/20 text-primary font-medium'
                                : 'bg-surface-elevated text-text-primary'
                            }`}
                          >
                            {set.weight_calculated} x {set.reps ?? '-'}
                            {set.rpe !== undefined && (
                              <span className="text-text-muted ml-1">@{set.rpe}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Best estimated 1RM */}
                  {bestSet?.reps && (
                    <p className="text-xs text-text-muted mt-2">
                      Est. 1RM: {Math.round(estimate1RM(bestSet.weight_calculated, bestSet.reps))} lbs
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Notes */}
          {log.notes && (
            <div className="mt-6 bg-surface rounded-lg p-4">
              <p className="text-sm text-text-secondary mb-1">Notes</p>
              <p className="text-sm">{log.notes}</p>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full mt-6 py-3 bg-surface hover:bg-surface-elevated rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
