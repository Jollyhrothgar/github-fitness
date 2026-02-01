import { useState, useEffect } from 'react';
import type { WeightEntryMode, EquipmentType } from '@/types';
import {
  calculateTotalWeight,
  getWeightEntryLabel,
  getWeightIncrement,
} from '@/lib/calculations';

interface WeightInputProps {
  value: number;
  onChange: (entered: number, calculated: number) => void;
  entryMode: WeightEntryMode;
  equipmentType: EquipmentType;
  barWeight?: number;
  unit?: 'lbs' | 'kg';
  disabled?: boolean;
}

export function WeightInput({
  value,
  onChange,
  entryMode,
  equipmentType,
  barWeight = 45,
  unit = 'lbs',
  disabled = false,
}: WeightInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const increment = getWeightIncrement(equipmentType);
  const label = getWeightEntryLabel(entryMode);

  // Calculate total weight for display
  const totalWeight = calculateTotalWeight(value, entryMode, barWeight);
  const showTotal = entryMode === 'plates_per_side' || entryMode === 'per_hand';

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);

    const num = parseFloat(raw);
    if (!isNaN(num) && num >= 0) {
      const calculated = calculateTotalWeight(num, entryMode, barWeight);
      onChange(num, calculated);
    }
  };

  const handleIncrement = (delta: number) => {
    const newValue = Math.max(0, value + delta);
    setInputValue(newValue.toString());
    const calculated = calculateTotalWeight(newValue, entryMode, barWeight);
    onChange(newValue, calculated);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm text-text-secondary">{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleIncrement(-increment)}
          disabled={disabled || value <= 0}
          className="w-12 h-12 bg-surface-elevated hover:bg-surface active:bg-surface/80 disabled:opacity-50 rounded-lg text-xl font-medium transition-colors"
          aria-label={`Decrease by ${increment}`}
        >
          -
        </button>

        <div className="flex-1 relative">
          <input
            type="number"
            inputMode="decimal"
            value={inputValue}
            onChange={handleInputChange}
            disabled={disabled}
            className="w-full h-12 px-4 text-center text-2xl font-bold bg-surface-elevated rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            min="0"
            step={increment}
            data-testid="weight-input"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
            {unit}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleIncrement(increment)}
          disabled={disabled}
          className="w-12 h-12 bg-surface-elevated hover:bg-surface active:bg-surface/80 disabled:opacity-50 rounded-lg text-xl font-medium transition-colors"
          aria-label={`Increase by ${increment}`}
        >
          +
        </button>
      </div>

      {showTotal && (
        <p className="text-center text-sm text-text-secondary">
          Total: <span className="font-medium text-text-primary">{totalWeight} {unit}</span>
          {entryMode === 'plates_per_side' && (
            <span className="text-text-muted"> ({barWeight} bar + {value * 2} plates)</span>
          )}
        </p>
      )}
    </div>
  );
}
