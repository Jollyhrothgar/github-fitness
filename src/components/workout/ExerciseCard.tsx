import { useState } from 'react';
import type { PlannedExercise, ExerciseDefinition, LoggedSet, PerformedExercise } from '@/types';
import { SetLogger } from './SetLogger';
import { estimate1RM } from '@/types/log';

interface ExerciseCardProps {
  exercise: ExerciseDefinition;
  planned: PlannedExercise;
  performed?: PerformedExercise;
  unit: 'lbs' | 'kg';
  barWeight: number;
  lastSessionWeight?: number;
  vibrationEnabled?: boolean;
  onLogSet: (set: Omit<LoggedSet, 'timestamp'>) => void;
  onSubstitute: () => void;
  onShowInfo: () => void;
  isActive: boolean;
  onActivate: () => void;
}

export function ExerciseCard({
  exercise,
  planned,
  performed,
  unit,
  barWeight,
  lastSessionWeight,
  vibrationEnabled = true,
  onLogSet,
  onSubstitute,
  onShowInfo,
  isActive,
  onActivate,
}: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(isActive);
  const loggedSets = performed?.sets ?? [];
  const workingSets = loggedSets.filter((s) => !s.is_warmup);
  const completedWorkingSets = workingSets.length;
  const isComplete = completedWorkingSets >= planned.sets;

  // Get previous set weight for pre-fill
  const lastSet = loggedSets[loggedSets.length - 1];
  const previousWeight = lastSet?.weight_entered ?? lastSessionWeight ?? 0;
  const previousReps = lastSet?.reps;

  // Next set number
  const nextSetNumber = loggedSets.length + 1;

  // Calculate best set 1RM
  const bestSet = workingSets.reduce<LoggedSet | null>((best, set) => {
    if (!set.reps) return best;
    const setRM = estimate1RM(set.weight_calculated, set.reps);
    if (!best) return set;
    const bestRM = estimate1RM(best.weight_calculated, best.reps || 0);
    return setRM > bestRM ? set : best;
  }, null);

  return (
    <div
      className={`rounded-lg overflow-hidden transition-all ${
        isComplete ? 'bg-success/10 border border-success/30' : 'bg-surface'
      }`}
    >
      {/* Header - always visible */}
      <button
        onClick={() => {
          setExpanded(!expanded);
          if (!isActive) onActivate();
        }}
        className="w-full p-4 text-left flex items-center justify-between"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-sm">{planned.order}.</span>
            <h3 className="font-medium truncate">{exercise.name}</h3>
            {isComplete && (
              <span className="text-success text-sm">✓</span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-0.5">
            {completedWorkingSets}/{planned.sets} sets &middot; {planned.target_reps} reps
          </p>
        </div>

        <div className="flex items-center gap-2 ml-2">
          {bestSet && (
            <span className="text-xs text-text-muted">
              Best: {bestSet.weight_calculated}{unit}
            </span>
          )}
          <svg
            className={`w-5 h-5 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Logged sets */}
          {loggedSets.length > 0 && (
            <div className="space-y-1">
              {loggedSets.map((set, i) => {
                // Count working sets up to this point for proper numbering
                const workingSetNum = loggedSets
                  .slice(0, i + 1)
                  .filter((s) => !s.is_warmup).length;

                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between py-2 px-3 rounded text-sm ${
                      set.is_warmup ? 'bg-warning/10 text-text-muted' : 'bg-surface-elevated'
                    }`}
                  >
                    <span>
                      {set.is_warmup ? 'W' : workingSetNum}.
                      {' '}{set.weight_calculated} {unit} × {set.reps}
                      {set.rpe && <span className="text-text-muted"> @ RPE {set.rpe}</span>}
                    </span>
                    {!set.is_warmup && set.reps && (
                      <span className="text-text-muted text-xs">
                        ~{Math.round(estimate1RM(set.weight_calculated, set.reps))} 1RM
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Set logger or completion message */}
          {!isComplete ? (
            <SetLogger
              exercise={exercise}
              planned={planned}
              setNumber={nextSetNumber}
              previousWeight={previousWeight}
              previousReps={previousReps}
              unit={unit}
              barWeight={barWeight}
              vibrationEnabled={vibrationEnabled}
              onLogSet={onLogSet}
            />
          ) : (
            <div className="text-center py-4">
              <p className="text-success font-medium">Exercise complete!</p>
              <button
                onClick={() => {
                  // Allow logging extra sets
                  onLogSet({
                    set_number: nextSetNumber,
                    is_warmup: false,
                    weight_entered: previousWeight,
                    weight_calculated: previousWeight,
                    unit,
                    reps: 0,
                    failure: false,
                  });
                }}
                className="min-h-[44px] px-4 py-3 text-sm text-text-secondary hover:text-text-primary active:bg-surface-elevated/50 rounded-lg mt-2"
              >
                + Add extra set
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onShowInfo}
              className="flex-1 min-h-[44px] py-3 text-sm text-text-secondary hover:text-text-primary active:bg-surface-elevated/80 hover:bg-surface-elevated rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How To
            </button>
            {/* Only show Swap if no sets logged yet */}
            {loggedSets.length === 0 && (
              <button
                onClick={onSubstitute}
                className="flex-1 min-h-[44px] py-3 text-sm text-text-secondary hover:text-text-primary active:bg-surface-elevated/80 hover:bg-surface-elevated rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Swap
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
