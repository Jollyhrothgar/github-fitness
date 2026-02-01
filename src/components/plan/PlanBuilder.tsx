import { useState, useMemo } from 'react';
import { useStorage } from '@/lib/StorageContext';
import type {
  WorkoutPlan,
  WorkoutDay,
  PlannedExercise,
  PlanMeta,
  ExerciseDefinition,
  MovementPattern,
} from '@/types';
import { generatePlanId } from '@/types/plan';

interface PlanBuilderProps {
  existingPlan?: WorkoutPlan;
  onSave: (plan: WorkoutPlan) => void;
  onCancel: () => void;
}

const MOVEMENT_LABELS: Record<MovementPattern, string> = {
  horizontal_push: 'Horizontal Push',
  horizontal_pull: 'Horizontal Pull',
  vertical_push: 'Vertical Push',
  vertical_pull: 'Vertical Pull',
  knee_dominant: 'Knee Dominant',
  hip_dominant: 'Hip Dominant',
  carry_conditioning: 'Carry/Conditioning',
  conditioning: 'Conditioning',
  isolation: 'Isolation',
  core: 'Core',
};

// Default empty exercise
const createEmptyExercise = (order: number): PlannedExercise => ({
  order,
  exercise_id: '',
  substitution_group: 'horizontal_push',
  sets: 3,
  target_reps: '8-10',
  target_rpe: 7,
  rest_seconds: 90,
});

// Default empty day
const createEmptyDay = (order: number): WorkoutDay => ({
  id: `day_${String.fromCharCode(97 + order)}`, // day_a, day_b, etc.
  day_name: `Day ${String.fromCharCode(65 + order)}`, // Day A, Day B, etc.
  day_order: order,
  exercises: [createEmptyExercise(1)],
});

// Default empty plan meta
const createEmptyMeta = (): PlanMeta => ({
  plan_name: '',
  version: '1.0',
  days_per_week: 3,
  focus: 'general',
});

export function PlanBuilder({ existingPlan, onSave, onCancel }: PlanBuilderProps) {
  const { exercises } = useStorage();
  const { exercises: exerciseList } = exercises;

  const [meta, setMeta] = useState<PlanMeta>(existingPlan?.plan_meta || createEmptyMeta());
  const [days, setDays] = useState<WorkoutDay[]>(
    existingPlan?.schedule || [createEmptyDay(0)]
  );
  const [expandedDay, setExpandedDay] = useState<number>(0);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [activeExerciseSlot, setActiveExerciseSlot] = useState<{
    dayIndex: number;
    exerciseIndex: number;
  } | null>(null);

  // Filter exercises for the picker
  const filteredExercises = useMemo(() => {
    if (!exerciseSearch.trim()) return exerciseList.slice(0, 20);
    const search = exerciseSearch.toLowerCase();
    return exerciseList
      .filter(
        (ex) =>
          ex.name.toLowerCase().includes(search) || ex.id.toLowerCase().includes(search)
      )
      .slice(0, 20);
  }, [exerciseList, exerciseSearch]);

  // Get exercise name by ID
  const getExerciseName = (id: string) => {
    const ex = exerciseList.find((e) => e.id === id);
    return ex?.name || id;
  };

  // Add a new day
  const addDay = () => {
    setDays([...days, createEmptyDay(days.length)]);
    setExpandedDay(days.length);
  };

  // Remove a day
  const removeDay = (index: number) => {
    if (days.length <= 1) return;
    const newDays = days.filter((_, i) => i !== index);
    // Reorder remaining days
    const reorderedDays = newDays.map((day, i) => ({
      ...day,
      id: `day_${String.fromCharCode(97 + i)}`,
      day_order: i,
    }));
    setDays(reorderedDays);
    if (expandedDay >= reorderedDays.length) {
      setExpandedDay(Math.max(0, reorderedDays.length - 1));
    }
  };

  // Update day name
  const updateDayName = (index: number, name: string) => {
    const newDays = [...days];
    newDays[index] = { ...newDays[index], day_name: name };
    setDays(newDays);
  };

  // Add exercise to a day
  const addExercise = (dayIndex: number) => {
    const newDays = [...days];
    const newOrder = newDays[dayIndex].exercises.length + 1;
    newDays[dayIndex] = {
      ...newDays[dayIndex],
      exercises: [...newDays[dayIndex].exercises, createEmptyExercise(newOrder)],
    };
    setDays(newDays);
  };

  // Remove exercise from a day
  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const newDays = [...days];
    const newExercises = newDays[dayIndex].exercises.filter((_, i) => i !== exerciseIndex);
    // Reorder remaining exercises
    newDays[dayIndex] = {
      ...newDays[dayIndex],
      exercises: newExercises.map((ex, i) => ({ ...ex, order: i + 1 })),
    };
    setDays(newDays);
  };

  // Update an exercise field
  const updateExercise = (
    dayIndex: number,
    exerciseIndex: number,
    updates: Partial<PlannedExercise>
  ) => {
    const newDays = [...days];
    newDays[dayIndex] = {
      ...newDays[dayIndex],
      exercises: newDays[dayIndex].exercises.map((ex, i) =>
        i === exerciseIndex ? { ...ex, ...updates } : ex
      ),
    };
    setDays(newDays);
  };

  // Select an exercise from the picker
  const selectExercise = (exercise: ExerciseDefinition) => {
    if (!activeExerciseSlot) return;
    updateExercise(activeExerciseSlot.dayIndex, activeExerciseSlot.exerciseIndex, {
      exercise_id: exercise.id,
      substitution_group: exercise.movement_pattern,
    });
    setActiveExerciseSlot(null);
    setExerciseSearch('');
  };

  // Move exercise up/down
  const moveExercise = (dayIndex: number, exerciseIndex: number, direction: 'up' | 'down') => {
    const newDays = [...days];
    const exercises = [...newDays[dayIndex].exercises];
    const targetIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;

    if (targetIndex < 0 || targetIndex >= exercises.length) return;

    // Swap
    [exercises[exerciseIndex], exercises[targetIndex]] = [
      exercises[targetIndex],
      exercises[exerciseIndex],
    ];

    // Update order numbers
    newDays[dayIndex] = {
      ...newDays[dayIndex],
      exercises: exercises.map((ex, i) => ({ ...ex, order: i + 1 })),
    };
    setDays(newDays);
  };

  // Validate and save
  const handleSave = () => {
    if (!meta.plan_name.trim()) {
      alert('Please enter a plan name');
      return;
    }

    // Check all exercises have IDs
    for (const day of days) {
      for (const ex of day.exercises) {
        if (!ex.exercise_id) {
          alert(`Please select an exercise for all slots in ${day.day_name}`);
          return;
        }
      }
    }

    const plan: WorkoutPlan = {
      plan_meta: {
        ...meta,
        plan_id: existingPlan?.plan_meta.plan_id || generatePlanId(meta.plan_name),
        days_per_week: days.length,
      },
      schedule: days,
    };

    onSave(plan);
  };

  return (
    <div className="space-y-6">
      {/* Plan Meta */}
      <div className="bg-surface rounded-lg p-4 space-y-4">
        <h2 className="font-medium">Plan Details</h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-text-secondary block mb-1">Plan Name *</label>
            <input
              type="text"
              value={meta.plan_name}
              onChange={(e) => setMeta({ ...meta, plan_name: e.target.value })}
              placeholder="e.g., 4-Day Upper/Lower Split"
              className="w-full p-2 bg-surface-elevated rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-text-secondary block mb-1">Focus</label>
              <select
                value={meta.focus || 'general'}
                onChange={(e) => setMeta({ ...meta, focus: e.target.value })}
                className="w-full p-2 bg-surface-elevated rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="general">General Fitness</option>
                <option value="hypertrophy">Hypertrophy</option>
                <option value="strength">Strength</option>
                <option value="powerbuilding">Powerbuilding</option>
                <option value="recomposition">Recomposition</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-text-secondary block mb-1">Duration (weeks)</label>
              <input
                type="number"
                min={1}
                max={52}
                value={meta.duration_weeks || ''}
                onChange={(e) =>
                  setMeta({ ...meta, duration_weeks: parseInt(e.target.value) || undefined })
                }
                placeholder="Optional"
                className="w-full p-2 bg-surface-elevated rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-text-secondary block mb-1">Notes</label>
            <textarea
              value={meta.notes || ''}
              onChange={(e) => setMeta({ ...meta, notes: e.target.value })}
              placeholder="Optional notes about this plan..."
              rows={2}
              className="w-full p-2 bg-surface-elevated rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>
      </div>

      {/* Workout Days */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Workout Days ({days.length})</h2>
          <button
            onClick={addDay}
            className="px-3 py-1.5 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Day
          </button>
        </div>

        {days.map((day, dayIndex) => (
          <div key={day.id} className="bg-surface rounded-lg overflow-hidden">
            {/* Day Header */}
            <button
              onClick={() => setExpandedDay(expandedDay === dayIndex ? -1 : dayIndex)}
              className="w-full p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold">
                  {String.fromCharCode(65 + dayIndex)}
                </span>
                <input
                  type="text"
                  value={day.day_name}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateDayName(dayIndex, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent font-medium focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">
                  {day.exercises.length} exercise{day.exercises.length !== 1 ? 's' : ''}
                </span>
                {days.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDay(dayIndex);
                    }}
                    className="p-1 text-text-muted hover:text-error rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
                <svg
                  className={`w-5 h-5 transition-transform ${
                    expandedDay === dayIndex ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {/* Day Exercises */}
            {expandedDay === dayIndex && (
              <div className="border-t border-surface-elevated p-4 space-y-3">
                {day.exercises.map((exercise, exerciseIndex) => (
                  <div
                    key={exerciseIndex}
                    className="bg-surface-elevated rounded-lg p-3 space-y-3"
                  >
                    {/* Exercise Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-muted">
                        Exercise {exercise.order}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveExercise(dayIndex, exerciseIndex, 'up')}
                          disabled={exerciseIndex === 0}
                          className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveExercise(dayIndex, exerciseIndex, 'down')}
                          disabled={exerciseIndex === day.exercises.length - 1}
                          className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeExercise(dayIndex, exerciseIndex)}
                          className="p-1 text-text-muted hover:text-error"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Exercise Picker */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveExerciseSlot(
                            activeExerciseSlot?.dayIndex === dayIndex &&
                              activeExerciseSlot?.exerciseIndex === exerciseIndex
                              ? null
                              : { dayIndex, exerciseIndex }
                          )
                        }
                        className={`w-full p-2 text-left rounded-lg border ${
                          exercise.exercise_id
                            ? 'bg-surface border-surface-hover'
                            : 'bg-surface border-dashed border-text-muted'
                        }`}
                      >
                        {exercise.exercise_id
                          ? getExerciseName(exercise.exercise_id)
                          : 'Select exercise...'}
                      </button>

                      {/* Exercise Dropdown */}
                      {activeExerciseSlot?.dayIndex === dayIndex &&
                        activeExerciseSlot?.exerciseIndex === exerciseIndex && (
                          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background rounded-lg shadow-lg border border-surface-elevated max-h-60 overflow-y-auto">
                            <div className="p-2 border-b border-surface-elevated sticky top-0 bg-background">
                              <input
                                type="text"
                                value={exerciseSearch}
                                onChange={(e) => setExerciseSearch(e.target.value)}
                                placeholder="Search exercises..."
                                autoFocus
                                className="w-full p-2 bg-surface-elevated rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                            <div className="p-1">
                              {filteredExercises.length === 0 ? (
                                <p className="p-2 text-sm text-text-muted">No exercises found</p>
                              ) : (
                                filteredExercises.map((ex) => (
                                  <button
                                    key={ex.id}
                                    onClick={() => selectExercise(ex)}
                                    className="w-full p-2 text-left hover:bg-surface-elevated rounded text-sm"
                                  >
                                    <div className="font-medium">{ex.name}</div>
                                    <div className="text-xs text-text-muted">
                                      {MOVEMENT_LABELS[ex.movement_pattern]}
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Exercise Parameters */}
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-xs text-text-muted block mb-1">Sets</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={exercise.sets}
                          onChange={(e) =>
                            updateExercise(dayIndex, exerciseIndex, {
                              sets: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full p-1.5 bg-surface rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-muted block mb-1">Reps</label>
                        <input
                          type="text"
                          value={exercise.target_reps}
                          onChange={(e) =>
                            updateExercise(dayIndex, exerciseIndex, {
                              target_reps: e.target.value,
                            })
                          }
                          placeholder="8-10"
                          className="w-full p-1.5 bg-surface rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-muted block mb-1">RPE</label>
                        <input
                          type="number"
                          min={5}
                          max={10}
                          value={exercise.target_rpe || ''}
                          onChange={(e) =>
                            updateExercise(dayIndex, exerciseIndex, {
                              target_rpe: parseInt(e.target.value) || undefined,
                            })
                          }
                          placeholder="7"
                          className="w-full p-1.5 bg-surface rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-muted block mb-1">Rest (s)</label>
                        <input
                          type="number"
                          min={0}
                          step={15}
                          value={exercise.rest_seconds}
                          onChange={(e) =>
                            updateExercise(dayIndex, exerciseIndex, {
                              rest_seconds: parseInt(e.target.value) || 60,
                            })
                          }
                          className="w-full p-1.5 bg-surface rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => addExercise(dayIndex)}
                  className="w-full p-2 border border-dashed border-text-muted rounded-lg text-sm text-text-secondary hover:border-primary hover:text-primary transition-colors"
                >
                  + Add Exercise
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-surface-elevated">
        <button
          onClick={handleSave}
          className="flex-1 py-3 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors"
        >
          {existingPlan ? 'Save Changes' : 'Create Plan'}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-surface-elevated hover:bg-surface rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
