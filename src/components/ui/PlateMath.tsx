import { useMemo } from 'react';
import {
  findClosestAchievableWeight,
  formatPlateLoading,
  type PlateLoadingResult,
} from '@/lib/calculations';

interface PlateMathProps {
  targetWeight: number;
  barWeight?: number;
  availablePlates?: number[];
  showDiagram?: boolean;
}

// Plate colors for visual display
const PLATE_COLORS: Record<number, string> = {
  45: 'bg-blue-600',
  35: 'bg-yellow-500',
  25: 'bg-green-600',
  10: 'bg-gray-100 text-gray-800',
  5: 'bg-red-600',
  2.5: 'bg-gray-400',
};

// Plate widths for visual proportions (relative)
const PLATE_WIDTHS: Record<number, string> = {
  45: 'w-8',
  35: 'w-7',
  25: 'w-6',
  10: 'w-5',
  5: 'w-4',
  2.5: 'w-3',
};

function PlateVisual({ weight }: { weight: number }) {
  const color = PLATE_COLORS[weight] || 'bg-gray-500';
  const width = PLATE_WIDTHS[weight] || 'w-4';

  return (
    <div
      className={`${color} ${width} h-16 rounded-sm flex items-center justify-center text-xs font-bold`}
      title={`${weight} lb plate`}
    >
      {weight}
    </div>
  );
}

function BarDiagram({ result }: { result: PlateLoadingResult }) {
  // Create plate array for one side
  const plates: number[] = [];
  for (const plate of result.platesPerSide) {
    for (let i = 0; i < plate.count; i++) {
      plates.push(plate.weight);
    }
  }

  return (
    <div className="flex items-center justify-center gap-0.5 my-4">
      {/* Left plates (reversed) */}
      <div className="flex gap-0.5">
        {[...plates].reverse().map((weight, i) => (
          <PlateVisual key={`left-${i}`} weight={weight} />
        ))}
      </div>

      {/* Bar */}
      <div className="w-24 h-4 bg-gray-400 rounded-full" />

      {/* Right plates */}
      <div className="flex gap-0.5">
        {plates.map((weight, i) => (
          <PlateVisual key={`right-${i}`} weight={weight} />
        ))}
      </div>
    </div>
  );
}

export function PlateMath({
  targetWeight,
  barWeight = 45,
  availablePlates,
  showDiagram = true,
}: PlateMathProps) {
  const result = useMemo(() => {
    return findClosestAchievableWeight(targetWeight, barWeight, availablePlates);
  }, [targetWeight, barWeight, availablePlates]);

  const { recommended } = result;

  return (
    <div className="bg-surface rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-text-secondary">Plate Loading</h3>
        {!recommended.isExact && (
          <span className="text-xs text-warning">
            Rounded to {recommended.achievedWeight} lbs
          </span>
        )}
      </div>

      {/* Visual bar diagram */}
      {showDiagram && <BarDiagram result={recommended} />}

      {/* Text breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Bar:</span>
          <span>{barWeight} lbs</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Per side:</span>
          <span>{formatPlateLoading(recommended)}</span>
        </div>
        <div className="flex justify-between font-medium border-t border-surface-elevated pt-2">
          <span>Total:</span>
          <span className={recommended.isExact ? 'text-success' : 'text-warning'}>
            {recommended.achievedWeight} lbs
          </span>
        </div>
      </div>

      {/* Show alternatives if not exact */}
      {!recommended.isExact && result.lower.achievedWeight !== result.upper.achievedWeight && (
        <div className="mt-3 pt-3 border-t border-surface-elevated">
          <p className="text-xs text-text-muted mb-2">Alternatives:</p>
          <div className="flex gap-2 text-xs">
            <button
              className={`flex-1 py-1 px-2 rounded ${
                recommended === result.lower
                  ? 'bg-primary text-white'
                  : 'bg-surface-elevated text-text-secondary'
              }`}
            >
              {result.lower.achievedWeight} lbs
            </button>
            <button
              className={`flex-1 py-1 px-2 rounded ${
                recommended === result.upper
                  ? 'bg-primary text-white'
                  : 'bg-surface-elevated text-text-secondary'
              }`}
            >
              {result.upper.achievedWeight} lbs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
