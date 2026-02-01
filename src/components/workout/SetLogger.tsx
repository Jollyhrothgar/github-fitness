import { useState } from 'react';
import type { PlannedExercise, ExerciseDefinition, LoggedSet } from '@/types';
import { WeightInput } from './WeightInput';
import { isInRepRange } from '@/lib/calculations';
import { triggerHaptic } from '@/lib/haptics';

// RPE descriptions based on reps in reserve (RIR)
function getRpeDescription(rpe: number | undefined): string {
  if (rpe === undefined) return 'Slide to rate effort';
  switch (rpe) {
    case 10: return 'Max effort — couldn\'t do another rep';
    case 9: return 'Very hard — maybe 1 more rep';
    case 8: return 'Hard — could do 2 more reps';
    case 7: return 'Challenging — could do 3 more reps';
    case 6: return 'Moderate — could do 4+ more reps';
    case 5: return 'Moderate — good for technique work';
    case 4: return 'Light — warmup intensity';
    case 3: return 'Light — easy warmup';
    case 2: return 'Very light — minimal effort';
    case 1: return 'Minimal — just moving the weight';
    default: return '';
  }
}

interface SetLoggerProps {
  exercise: ExerciseDefinition;
  planned: PlannedExercise;
  setNumber: number;
  totalSets: number;
  previousWeight?: number;
  previousReps?: number;
  unit: 'lbs' | 'kg';
  barWeight: number;
  vibrationEnabled?: boolean;
  onLogSet: (set: Omit<LoggedSet, 'timestamp'>) => void;
}

export function SetLogger({
  exercise,
  planned,
  setNumber,
  totalSets,
  previousWeight = 0,
  previousReps,
  unit,
  barWeight,
  vibrationEnabled = true,
  onLogSet,
}: SetLoggerProps) {
  const [weight, setWeight] = useState(previousWeight);
  const [calculatedWeight, setCalculatedWeight] = useState(previousWeight);
  const [reps, setReps] = useState(previousReps ?? 0);
  const [rpe, setRpe] = useState<number | undefined>(undefined);
  const [isWarmup, setIsWarmup] = useState(setNumber === 1);
  const [showRpe, setShowRpe] = useState(false);

  const handleWeightChange = (entered: number, calculated: number) => {
    setWeight(entered);
    setCalculatedWeight(calculated);
  };

  const handleLogSet = () => {
    // Haptic feedback when logging a set
    triggerHaptic('success', vibrationEnabled);

    const set: Omit<LoggedSet, 'timestamp'> = {
      set_number: setNumber,
      is_warmup: isWarmup,
      weight_entered: weight,
      weight_calculated: calculatedWeight,
      unit,
      reps,
      rpe,
      failure: rpe !== undefined && rpe >= 10,
    };
    onLogSet(set);
  };

  const inRange = isInRepRange(reps, planned.target_reps);

  return (
    <div className="bg-surface rounded-lg p-4 space-y-4">
      {/* Set header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{exercise.name}</h3>
          <p className="text-sm text-text-secondary">
            Set {setNumber} of {totalSets} &middot; Target: {planned.target_reps} reps
            {planned.target_rpe && ` @ RPE ${planned.target_rpe}`}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isWarmup}
            onChange={(e) => setIsWarmup(e.target.checked)}
            className="w-4 h-4 rounded border-text-muted"
          />
          Warmup
        </label>
      </div>

      {/* Weight input */}
      <WeightInput
        value={weight}
        onChange={handleWeightChange}
        entryMode={exercise.weight_entry_mode}
        equipmentType={exercise.equipment_type}
        barWeight={exercise.default_bar_weight_lbs ?? barWeight}
        unit={unit}
      />

      {/* Reps input */}
      <div className="space-y-2">
        <label className="block text-sm text-text-secondary">Reps completed</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReps(Math.max(0, reps - 1))}
            disabled={reps <= 0}
            className="w-12 h-12 bg-surface-elevated hover:bg-surface disabled:opacity-50 rounded-lg text-xl font-medium transition-colors"
          >
            -
          </button>

          <div className="flex-1 relative">
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(Math.max(0, parseInt(e.target.value) || 0))}
              className={`w-full h-12 px-4 text-center text-2xl font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                reps > 0 && inRange
                  ? 'bg-success/20 text-success'
                  : 'bg-surface-elevated text-text-primary'
              }`}
              min="0"
              data-testid="reps-input"
            />
          </div>

          <button
            type="button"
            onClick={() => setReps(reps + 1)}
            className="w-12 h-12 bg-surface-elevated hover:bg-surface rounded-lg text-xl font-medium transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* RPE (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowRpe(!showRpe)}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          {showRpe ? '- Hide RPE' : '+ Add RPE'}
        </button>

        {showRpe && (
          <div className="mt-2 space-y-2">
            <input
              type="range"
              min="1"
              max="10"
              value={rpe ?? 7}
              onChange={(e) => setRpe(parseInt(e.target.value))}
              className="w-full h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="text-center">
              <p className="text-lg font-bold">
                RPE {rpe ?? '-'}
              </p>
              <p className={`text-sm ${rpe === 10 ? 'text-error' : 'text-text-secondary'}`}>
                {getRpeDescription(rpe)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notes from plan */}
      {planned.notes && (
        <p className="text-sm text-text-muted italic bg-surface-elevated rounded p-2">
          {planned.notes}
        </p>
      )}

      {/* Log button */}
      <button
        onClick={handleLogSet}
        disabled={reps === 0 && !isWarmup}
        className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        Log Set
      </button>
    </div>
  );
}
