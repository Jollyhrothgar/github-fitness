import { useState } from 'react';
import type { WorkoutLog, LoggedSet } from '@/types';
import { formatDuration, calculateExerciseVolume, estimate1RM } from '@/types/log';

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
  unit: string;
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
      <div className="space-y-1">
        <label className="block text-xs text-text-muted">Weight ({unit})</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setEditState((s) => ({ ...s, weightEntered: Math.max(0, s.weightEntered - 5) }))
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
              setEditState((s) => ({ ...s, weightEntered: s.weightEntered + 5 }))
            }
            className="w-10 h-10 bg-surface hover:bg-surface/80 active:bg-surface/60 rounded-lg text-lg font-medium transition-colors"
          >
            +
          </button>
        </div>
      </div>

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

interface SessionDetailProps {
  log: WorkoutLog;
  onClose: () => void;
  onSelectExercise?: (exerciseId: string) => void;
  onSaveLog?: (log: WorkoutLog) => Promise<void>;
}

export function SessionDetail({ log, onClose, onSelectExercise, onSaveLog }: SessionDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null); // "exerciseId:setIndex"
  const [editedLog, setEditedLog] = useState<WorkoutLog>(log);
  const [isSaving, setIsSaving] = useState(false);

  // Use editedLog when editing, original log otherwise
  const displayLog = isEditing ? editedLog : log;

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

  const handleEditSet = (exerciseId: string, setIndex: number, weightEntered: number, reps: number) => {
    setEditedLog((prev) => ({
      ...prev,
      performed_exercises: prev.performed_exercises.map((pe) => {
        if (pe.exercise_id !== exerciseId) return pe;
        const newSets = [...pe.sets];
        newSets[setIndex] = {
          ...newSets[setIndex],
          weight_entered: weightEntered,
          weight_calculated: weightEntered,
          reps,
          calculated_1rm: reps > 0 ? estimate1RM(weightEntered, reps) : undefined,
        };
        return { ...pe, sets: newSets };
      }),
    }));
    setEditingKey(null);
  };

  const handleDeleteSet = (exerciseId: string, setIndex: number) => {
    setEditedLog((prev) => ({
      ...prev,
      performed_exercises: prev.performed_exercises.map((pe) => {
        if (pe.exercise_id !== exerciseId) return pe;
        const newSets = pe.sets
          .filter((_, i) => i !== setIndex)
          .map((s, i) => ({ ...s, set_number: i + 1 }));
        return { ...pe, sets: newSets };
      }),
    }));
    setEditingKey(null);
  };

  const handleSave = async () => {
    if (!onSaveLog) return;
    setIsSaving(true);
    try {
      await onSaveLog(editedLog);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEditing = () => {
    setEditedLog(log);
    setEditingKey(null);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-background/95 z-50 overflow-y-auto">
      <div className="min-h-full p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">{displayLog.day_id.replace(/_/g, ' ')}</h2>
              <p className="text-sm text-text-secondary">
                {formatDate(displayLog.timestamp_start)} at {formatTime(displayLog.timestamp_start)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onSaveLog && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-text-muted hover:text-text-primary transition-colors"
                  aria-label="Edit"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              <button
                onClick={isEditing ? handleCancelEditing : onClose}
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
          </div>

          {/* Editing banner */}
          {isEditing && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-4 flex items-center justify-between">
              <p className="text-sm text-primary font-medium">Editing workout — tap a set to change it</p>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-surface rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{displayLog.performed_exercises.length}</p>
              <p className="text-xs text-text-secondary">Exercises</p>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">
                {displayLog.performed_exercises.reduce(
                  (sum, ex) => sum + ex.sets.filter((s) => !s.is_warmup).length,
                  0
                )}
              </p>
              <p className="text-xs text-text-secondary">Sets</p>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">
                {displayLog.timestamp_end ? formatDuration(displayLog.timestamp_start, displayLog.timestamp_end) : '-'}
              </p>
              <p className="text-xs text-text-secondary">Duration</p>
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-4">
            {displayLog.performed_exercises.map((exercise) => {
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
                      <div className="space-y-1">
                        {warmupSets.map((set, i) => {
                          const globalIndex = exercise.sets.indexOf(set);
                          const key = `${exercise.exercise_id}:${globalIndex}`;

                          if (isEditing && editingKey === key) {
                            return (
                              <InlineSetEditor
                                key={i}
                                set={set}
                                unit={set.unit}
                                onSave={(w, r) => handleEditSet(exercise.exercise_id, globalIndex, w, r)}
                                onCancel={() => setEditingKey(null)}
                                onDelete={() => handleDeleteSet(exercise.exercise_id, globalIndex)}
                              />
                            );
                          }

                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => isEditing && setEditingKey(key)}
                              className={`text-sm text-text-secondary bg-surface-elevated px-2 py-1 rounded inline-block ${
                                isEditing ? 'active:opacity-70 cursor-pointer' : ''
                              }`}
                            >
                              {set.weight_calculated} x {set.reps ?? '-'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Working sets */}
                  <div>
                    <p className="text-xs text-text-muted mb-1">Working Sets</p>
                    <div className="space-y-1">
                      {workingSets.map((set, i) => {
                        const globalIndex = exercise.sets.indexOf(set);
                        const key = `${exercise.exercise_id}:${globalIndex}`;
                        const isBest = set === bestSet;

                        if (isEditing && editingKey === key) {
                          return (
                            <InlineSetEditor
                              key={i}
                              set={set}
                              unit={set.unit}
                              onSave={(w, r) => handleEditSet(exercise.exercise_id, globalIndex, w, r)}
                              onCancel={() => setEditingKey(null)}
                              onDelete={() => handleDeleteSet(exercise.exercise_id, globalIndex)}
                            />
                          );
                        }

                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => isEditing && setEditingKey(key)}
                            className={`text-sm px-2 py-1 rounded inline-block mr-2 ${
                              isBest
                                ? 'bg-primary/20 text-primary font-medium'
                                : 'bg-surface-elevated text-text-primary'
                            } ${isEditing ? 'active:opacity-70 cursor-pointer' : ''}`}
                          >
                            {set.weight_calculated} x {set.reps ?? '-'}
                            {set.rpe !== undefined && (
                              <span className="text-text-muted ml-1">@{set.rpe}</span>
                            )}
                          </button>
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
          {displayLog.notes && (
            <div className="mt-6 bg-surface rounded-lg p-4">
              <p className="text-sm text-text-secondary mb-1">Notes</p>
              <p className="text-sm">{displayLog.notes}</p>
            </div>
          )}

          {/* Bottom buttons */}
          {isEditing ? (
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancelEditing}
                className="flex-1 py-3 bg-surface hover:bg-surface-elevated rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full mt-6 py-3 bg-surface hover:bg-surface-elevated rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
