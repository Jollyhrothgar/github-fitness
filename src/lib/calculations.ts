import type { WeightEntryMode, EquipmentType } from '@/types';

// Calculate total weight from user entry based on equipment type
export function calculateTotalWeight(
  enteredWeight: number,
  entryMode: WeightEntryMode,
  barWeight: number = 45
): number {
  switch (entryMode) {
    case 'plates_per_side':
      // User enters weight per side, total = bar + (2 * entered)
      return barWeight + enteredWeight * 2;
    case 'per_hand':
      // User enters weight per hand, total = 2 * entered (for bilateral display)
      return enteredWeight * 2;
    case 'stack':
    case 'total_weight':
    case 'bodyweight_plus':
      // User enters total weight directly
      return enteredWeight;
    case 'duration':
    case 'distance':
      // Not weight-based
      return 0;
    default:
      return enteredWeight;
  }
}

// Get helper text for weight entry mode
export function getWeightEntryLabel(entryMode: WeightEntryMode): string {
  switch (entryMode) {
    case 'plates_per_side':
      return 'Plates per side';
    case 'per_hand':
      return 'Per hand';
    case 'stack':
      return 'Stack weight';
    case 'total_weight':
      return 'Total weight';
    case 'bodyweight_plus':
      return 'Added weight';
    case 'duration':
      return 'Duration (sec)';
    case 'distance':
      return 'Distance';
    default:
      return 'Weight';
  }
}

// Get weight increment based on equipment type
export function getWeightIncrement(equipmentType: EquipmentType): number {
  switch (equipmentType) {
    case 'barbell':
    case 'trap_bar':
      return 5; // 2.5lb plates per side = 5lb total
    case 'dumbbell':
    case 'kettlebell':
      return 5;
    case 'cable':
    case 'machine':
      return 5;
    default:
      return 5;
  }
}

// Parse rep target string to get min/max (e.g., "8-10" -> [8, 10])
export function parseRepTarget(target: string): { min: number; max: number } {
  const match = target.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!match) return { min: 0, max: 0 };

  const min = parseInt(match[1], 10);
  const max = match[2] ? parseInt(match[2], 10) : min;
  return { min, max };
}

// Check if reps are in target range
export function isInRepRange(reps: number, target: string): boolean {
  const { min, max } = parseRepTarget(target);
  return reps >= min && reps <= max;
}

// Suggest next weight based on performance
export function suggestNextWeight(
  currentWeight: number,
  targetReps: string,
  actualReps: number,
  rpe: number | undefined,
  increment: number
): { weight: number; reason: string } {
  const { min, max } = parseRepTarget(targetReps);

  // Hit top of range with room to spare (RPE < 8)
  if (actualReps >= max && rpe !== undefined && rpe < 8) {
    return {
      weight: currentWeight + increment,
      reason: 'Increase weight - you had reps in reserve',
    };
  }

  // Below target range
  if (actualReps < min) {
    return {
      weight: currentWeight - increment,
      reason: 'Reduce weight to hit target reps',
    };
  }

  // In range, keep weight
  return {
    weight: currentWeight,
    reason: 'Weight is appropriate for target',
  };
}

// --- Statistical Functions for Progress Tracking ---

export interface DataPoint {
  date: Date;
  value: number;
}

export type TrendDirection = 'improving' | 'plateau' | 'declining';

export interface TrendAnalysis {
  currentMean: number;
  currentStd: number;
  trendSlope: number;
  direction: TrendDirection;
  percentChange: number; // Percentage change over the data window
}

// Calculate moving average with given window size
export function movingAverage(values: number[], windowSize: number): number[] {
  if (values.length === 0) return [];
  if (windowSize <= 0) return values;

  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    const avg = window.reduce((sum, v) => sum + v, 0) / window.length;
    result.push(Math.round(avg * 10) / 10);
  }
  return result;
}

// Calculate moving standard deviation with given window size
export function movingStdDev(values: number[], windowSize: number): number[] {
  if (values.length === 0) return [];
  if (windowSize <= 1) return values.map(() => 0);

  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);

    if (window.length < 2) {
      result.push(0);
      continue;
    }

    const mean = window.reduce((sum, v) => sum + v, 0) / window.length;
    const squaredDiffs = window.map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / (window.length - 1);
    result.push(Math.round(Math.sqrt(variance) * 10) / 10);
  }
  return result;
}

// Simple linear regression: returns slope and intercept
// Input: array of [x, y] pairs
export function linearRegression(points: [number, number][]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  if (points.length < 2) {
    return { slope: 0, intercept: points[0]?.[1] ?? 0, rSquared: 0 };
  }

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  let ssTotal = 0;
  let ssResidual = 0;

  for (const [x, y] of points) {
    ssTotal += Math.pow(y - yMean, 2);
    const predicted = slope * x + intercept;
    ssResidual += Math.pow(y - predicted, 2);
  }

  const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

  return {
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 10) / 10,
    rSquared: Math.round(rSquared * 1000) / 1000,
  };
}

// Calculate trend analysis for a set of data points
export function calculateTrend(
  dataPoints: DataPoint[],
  windowSize: number = 5
): TrendAnalysis | null {
  if (dataPoints.length < 2) return null;

  // Sort by date
  const sorted = [...dataPoints].sort((a, b) => a.date.getTime() - b.date.getTime());
  const values = sorted.map((d) => d.value);

  // Calculate rolling stats
  const rollingMean = movingAverage(values, windowSize);
  const rollingStd = movingStdDev(values, windowSize);

  // Current values (latest)
  const currentMean = rollingMean[rollingMean.length - 1];
  const currentStd = rollingStd[rollingStd.length - 1];

  // Linear regression for trend
  const points: [number, number][] = sorted.map((d, i) => [i, d.value]);
  const regression = linearRegression(points);

  // Calculate percent change from first to last rolling mean
  const firstMean = rollingMean[Math.min(windowSize - 1, rollingMean.length - 1)];
  const percentChange =
    firstMean === 0 ? 0 : Math.round(((currentMean - firstMean) / firstMean) * 1000) / 10;

  // Determine trend direction
  // Threshold: slope needs to represent at least 1% change per data point to be significant
  const slopeThreshold = currentMean * 0.005; // 0.5% per point
  let direction: TrendDirection;

  if (regression.slope > slopeThreshold && regression.rSquared > 0.3) {
    direction = 'improving';
  } else if (regression.slope < -slopeThreshold && regression.rSquared > 0.3) {
    direction = 'declining';
  } else {
    direction = 'plateau';
  }

  return {
    currentMean,
    currentStd,
    trendSlope: regression.slope,
    direction,
    percentChange,
  };
}

// Generate chart data with rolling averages and confidence bands
export function generateChartData(
  dataPoints: DataPoint[],
  windowSize: number = 5
): Array<{
  date: string;
  value: number;
  rollingAvg: number;
  upperBand: number;
  lowerBand: number;
}> {
  if (dataPoints.length === 0) return [];

  const sorted = [...dataPoints].sort((a, b) => a.date.getTime() - b.date.getTime());
  const values = sorted.map((d) => d.value);

  const rollingAvg = movingAverage(values, windowSize);
  const rollingStd = movingStdDev(values, windowSize);

  return sorted.map((point, i) => ({
    date: point.date.toISOString().split('T')[0],
    value: point.value,
    rollingAvg: rollingAvg[i],
    upperBand: Math.round((rollingAvg[i] + rollingStd[i]) * 10) / 10,
    lowerBand: Math.round(Math.max(0, rollingAvg[i] - rollingStd[i]) * 10) / 10,
  }));
}

// --- Plate Math Calculator ---

export interface PlateLoadingResult {
  targetWeight: number;
  achievedWeight: number;
  barWeight: number;
  platesPerSide: { weight: number; count: number }[];
  isExact: boolean;
  difference: number;
}

// Standard plate weights in lbs (most gyms)
export const STANDARD_PLATES_LBS = [45, 35, 25, 10, 5, 2.5];

// Calculate optimal plate loading using greedy algorithm
export function calculatePlateLoading(
  targetWeight: number,
  barWeight: number = 45,
  availablePlates: number[] = STANDARD_PLATES_LBS
): PlateLoadingResult {
  // Weight needed per side (subtract bar, divide by 2)
  const weightPerSide = (targetWeight - barWeight) / 2;

  if (weightPerSide < 0) {
    // Target is less than bar weight alone
    return {
      targetWeight,
      achievedWeight: barWeight,
      barWeight,
      platesPerSide: [],
      isExact: targetWeight === barWeight,
      difference: barWeight - targetWeight,
    };
  }

  // Sort plates descending
  const sortedPlates = [...availablePlates].sort((a, b) => b - a);

  // Greedy algorithm: use largest plates first
  const platesPerSide: { weight: number; count: number }[] = [];
  let remainingWeight = weightPerSide;

  for (const plateWeight of sortedPlates) {
    if (plateWeight <= remainingWeight) {
      const count = Math.floor(remainingWeight / plateWeight);
      if (count > 0) {
        platesPerSide.push({ weight: plateWeight, count });
        remainingWeight -= count * plateWeight;
      }
    }
  }

  // Calculate achieved weight
  const platesTotal = platesPerSide.reduce((sum, p) => sum + p.weight * p.count, 0);
  const achievedWeight = barWeight + platesTotal * 2;

  return {
    targetWeight,
    achievedWeight,
    barWeight,
    platesPerSide,
    isExact: Math.abs(remainingWeight) < 0.001,
    difference: targetWeight - achievedWeight,
  };
}

// Find closest achievable weight (rounds to nearest achievable)
export function findClosestAchievableWeight(
  targetWeight: number,
  barWeight: number = 45,
  availablePlates: number[] = STANDARD_PLATES_LBS
): { lower: PlateLoadingResult; upper: PlateLoadingResult; recommended: PlateLoadingResult } {
  const exact = calculatePlateLoading(targetWeight, barWeight, availablePlates);

  if (exact.isExact) {
    return { lower: exact, upper: exact, recommended: exact };
  }

  // Find lower achievable weight (what we got from greedy)
  const lower = exact;

  // Find upper achievable weight by adding smallest plate
  const smallestPlate = Math.min(...availablePlates);
  const upperTarget = exact.achievedWeight + smallestPlate * 2;
  const upper = calculatePlateLoading(upperTarget, barWeight, availablePlates);

  // Recommend the closer one
  const lowerDiff = Math.abs(targetWeight - lower.achievedWeight);
  const upperDiff = Math.abs(targetWeight - upper.achievedWeight);
  const recommended = lowerDiff <= upperDiff ? lower : upper;

  return { lower, upper, recommended };
}

// Format plate loading for display (e.g., "45 + 25 + 10")
export function formatPlateLoading(result: PlateLoadingResult): string {
  if (result.platesPerSide.length === 0) {
    return 'Bar only';
  }

  const parts: string[] = [];
  for (const plate of result.platesPerSide) {
    for (let i = 0; i < plate.count; i++) {
      parts.push(plate.weight.toString());
    }
  }
  return parts.join(' + ');
}
