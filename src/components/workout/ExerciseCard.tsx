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
  onEditSet: (exerciseId: string, setIndex: number, updatedSet: LoggedSet) => void;
  onDeleteSet: (exerciseId: string, setIndex: number) => void;
  onSubstitute: () => void;
  onShowInfo: () => void;
  isActive: boolean;
  onActivate: () => void;
}

interface SetEditState {
  weightEntered: number;
  reps: number;
}

function InlineSetEditor({
  set,
  unit,
  onSave,
  onCancel,
  onDelete,
}: {
  set: LoggedSet;
  unit: 'lbs' | 'kg';
  onSave: (weightEntered: number, reps: number) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [editState, setEditState] = useState<SetEditState>({
    weightEntered: set.weight_entered,
    reps: set.reps ?? 0,
  });

  return (
    <div className="bg-surface-elevated rounded-lg p-3 space-y-3">
      {/* Weight row */}
      <div className="space-y-1">
        <label className="block text-xs text-text-muted">Weight ({unit})</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setEditState((s) => ({ ...s, weightEntered: Math.max(0, s.weightEntered - 2.5) }))
            }
            className="w-10 h-10 bg-surface hover:bg-surface/80 active:bg-surface/60 rounded-lg text-lg font-medium transition-colors"
          >
            -
          </button>
          <input
            type="number"
            inputMode="decimal"
            value={editState.weightEntered}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 0) setEditState((s) => ({ ...s, weightEntered: v }));
            }}
            className="flex-1 h-10 px-3 text-center text-lg font-bold bg-surface rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            min="0"
            step="2.5"
          />
          <button
            type="button"
            onClick={() =>
              setEditState((s) => ({ ...s, weightEntered: s.weightEntered + 2.5 }))
            }
            className="w-10 h-10 bg-surface hover:bg-surface/80 active:bg-surface/60 rounded-lg text-lg font-medium transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Reps row */}
      <div className="space-y-1">
        <label className="block text-xs text-text-muted">Reps</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setEditState((s) => ({ ...s, reps: Math.max(0, s.reps - 1) }))
            }
            disabled={editState.reps <= 0}
            className="w-10 h-10 bg-surface hover:bg-surface/80 active:bg-surface/60 disabled:opacity-50 rounded-lg text-lg font-medium transition-colors"
          >
            -
          </button>
          <input
            type="number"
            inputMode="numeric"
            value={editState.reps}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 0) setEditState((s) => ({ ...s, reps: v }));
            }}
            className="flex-1 h-10 px-3 text-center text-lg font-bold bg-surface rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            min="0"
          />
          <button
            type="button"
            onClick={() => setEditState((s) => ({ ...s, reps: s.reps + 1 }))}
            className="w-10 h-10 bg-surface hover:bg-surface/80 active:bg-surface/60 rounded-lg text-lg font-medium transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSave(editState.weightEntered, editState.reps)}
          className="flex-1 min-h-[40px] py-2 bg-primary hover:bg-primary-hover active:bg-primary-hover/90 rounded-lg text-sm font-medium transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[40px] py-2 bg-surface hover:bg-surface/80 active:bg-surface/60 rounded-lg text-sm text-text-secondary transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="min-h-[40px] px-3 py-2 text-sm text-error hover:text-error/80 active:opacity-70 rounded-lg transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
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
  onEditSet,
  onDeleteSet,
  onSubstitute,
  onShowInfo,
  isActive,
  onActivate,
}: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(isActive);
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const [showExtraLogger, setShowExtraLogger] = useState(false);

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

  const handleSaveEdit = (setIndex: number, weightEntered: number, reps: number) => {
    const original = loggedSets[setIndex];
    const updatedSet: LoggedSet = {
      ...original,
      weight_entered: weightEntered,
      weight_calculated: weightEntered, // parent can recalculate if needed
      reps,
    };
    onEditSet(exercise.id, setIndex, updatedSet);
    setEditingSetIndex(null);
  };

  const handleDeleteSet = (setIndex: number) => {
    onDeleteSet(exercise.id, setIndex);
    setEditingSetIndex(null);
  };

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

                if (editingSetIndex === i) {
                  return (
                    <InlineSetEditor
                      key={i}
                      set={set}
                      unit={unit}
                      onSave={(w, r) => handleSaveEdit(i, w, r)}
                      onCancel={() => setEditingSetIndex(null)}
                      onDelete={() => handleDeleteSet(i)}
                    />
                  );
                }

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setEditingSetIndex(i)}
                    className={`w-full flex items-center justify-between py-2 px-3 rounded text-sm text-left active:opacity-70 transition-opacity ${
                      set.is_warmup ? 'bg-warning/10 text-text-muted' : 'bg-surface-elevated'
                    }`}
                  >
                    <span>
                      {set.is_warmup ? 'W' : workingSetNum}.
                      {' '}{set.weight_calculated} {unit} × {set.reps}
                      {set.rpe && <span className="text-text-muted"> @ RPE {set.rpe}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      {!set.is_warmup && set.reps && (
                        <span className="text-text-muted text-xs">
                          ~{Math.round(estimate1RM(set.weight_calculated, set.reps))} 1RM
                        </span>
                      )}
                      <svg className="w-3.5 h-3.5 text-text-muted opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </span>
                  </button>
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
            <div className="space-y-2">
              <div className="text-center py-3">
                <p className="text-success font-medium">Exercise complete!</p>
                <button
                  type="button"
                  onClick={() => setShowExtraLogger((v) => !v)}
                  className="min-h-[44px] px-4 py-3 text-sm text-text-secondary hover:text-text-primary active:bg-surface-elevated/50 rounded-lg mt-1"
                >
                  {showExtraLogger ? '- Hide extra set' : '+ Add extra set'}
                </button>
              </div>
              {showExtraLogger && (
                <SetLogger
                  exercise={exercise}
                  planned={planned}
                  setNumber={nextSetNumber}
                  previousWeight={previousWeight}
                  previousReps={previousReps}
                  unit={unit}
                  barWeight={barWeight}
                  vibrationEnabled={vibrationEnabled}
                  onLogSet={(set) => {
                    onLogSet(set);
                    setShowExtraLogger(false);
                  }}
                />
              )}
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
            <button
              onClick={onSubstitute}
              className="flex-1 min-h-[44px] py-3 text-sm text-text-secondary hover:text-text-primary active:bg-surface-elevated/80 hover:bg-surface-elevated rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Swap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
