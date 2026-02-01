import { describe, it, expect } from 'vitest';
import {
  calculateTotalWeight,
  getWeightEntryLabel,
  getWeightIncrement,
  parseRepTarget,
  isInRepRange,
  suggestNextWeight,
  movingAverage,
  movingStdDev,
  linearRegression,
  calculateTrend,
  generateChartData,
  calculatePlateLoading,
  findClosestAchievableWeight,
  formatPlateLoading,
  type DataPoint,
} from './calculations';

describe('calculateTotalWeight', () => {
  it('calculates plates per side correctly', () => {
    // 45lb bar + 45lb per side = 45 + (45 * 2) = 135
    expect(calculateTotalWeight(45, 'plates_per_side', 45)).toBe(135);
  });

  it('calculates plates per side with custom bar weight', () => {
    // 65lb trap bar + 45lb per side = 65 + (45 * 2) = 155
    expect(calculateTotalWeight(45, 'plates_per_side', 65)).toBe(155);
  });

  it('calculates per hand weight (bilateral total)', () => {
    // 30lb per hand = 60lb total
    expect(calculateTotalWeight(30, 'per_hand')).toBe(60);
  });

  it('returns total weight directly for stack', () => {
    expect(calculateTotalWeight(100, 'stack')).toBe(100);
  });

  it('returns total weight directly for total_weight', () => {
    expect(calculateTotalWeight(185, 'total_weight')).toBe(185);
  });

  it('returns total weight directly for bodyweight_plus', () => {
    expect(calculateTotalWeight(25, 'bodyweight_plus')).toBe(25);
  });

  it('returns 0 for duration-based exercises', () => {
    expect(calculateTotalWeight(30, 'duration')).toBe(0);
  });

  it('returns 0 for distance-based exercises', () => {
    expect(calculateTotalWeight(100, 'distance')).toBe(0);
  });
});

describe('getWeightEntryLabel', () => {
  it('returns correct label for plates_per_side', () => {
    expect(getWeightEntryLabel('plates_per_side')).toBe('Plates per side');
  });

  it('returns correct label for per_hand', () => {
    expect(getWeightEntryLabel('per_hand')).toBe('Per hand');
  });

  it('returns correct label for stack', () => {
    expect(getWeightEntryLabel('stack')).toBe('Stack weight');
  });

  it('returns correct label for total_weight', () => {
    expect(getWeightEntryLabel('total_weight')).toBe('Total weight');
  });

  it('returns correct label for bodyweight_plus', () => {
    expect(getWeightEntryLabel('bodyweight_plus')).toBe('Added weight');
  });

  it('returns correct label for duration', () => {
    expect(getWeightEntryLabel('duration')).toBe('Duration (sec)');
  });
});

describe('getWeightIncrement', () => {
  it('returns 5 for barbell', () => {
    expect(getWeightIncrement('barbell')).toBe(5);
  });

  it('returns 5 for dumbbell', () => {
    expect(getWeightIncrement('dumbbell')).toBe(5);
  });

  it('returns 5 for machine', () => {
    expect(getWeightIncrement('machine')).toBe(5);
  });

  it('returns 5 for cable', () => {
    expect(getWeightIncrement('cable')).toBe(5);
  });
});

describe('parseRepTarget', () => {
  it('parses range like "8-10"', () => {
    expect(parseRepTarget('8-10')).toEqual({ min: 8, max: 10 });
  });

  it('parses single number', () => {
    expect(parseRepTarget('5')).toEqual({ min: 5, max: 5 });
  });

  it('parses range with spaces "8 - 10"', () => {
    expect(parseRepTarget('8 - 10')).toEqual({ min: 8, max: 10 });
  });

  it('parses range with text "8-10 reps"', () => {
    expect(parseRepTarget('8-10 reps')).toEqual({ min: 8, max: 10 });
  });

  it('returns 0,0 for invalid input', () => {
    expect(parseRepTarget('invalid')).toEqual({ min: 0, max: 0 });
  });

  it('handles high rep ranges', () => {
    expect(parseRepTarget('15-20')).toEqual({ min: 15, max: 20 });
  });
});

describe('isInRepRange', () => {
  it('returns true when reps are in range', () => {
    expect(isInRepRange(9, '8-10')).toBe(true);
  });

  it('returns true when reps equal min', () => {
    expect(isInRepRange(8, '8-10')).toBe(true);
  });

  it('returns true when reps equal max', () => {
    expect(isInRepRange(10, '8-10')).toBe(true);
  });

  it('returns false when reps below range', () => {
    expect(isInRepRange(7, '8-10')).toBe(false);
  });

  it('returns false when reps above range', () => {
    expect(isInRepRange(11, '8-10')).toBe(false);
  });

  it('returns true for exact match single number', () => {
    expect(isInRepRange(5, '5')).toBe(true);
  });
});

describe('suggestNextWeight', () => {
  it('suggests increase when at top of range with low RPE', () => {
    const result = suggestNextWeight(135, '8-10', 10, 7, 5);
    expect(result.weight).toBe(140);
    expect(result.reason).toContain('Increase');
  });

  it('suggests decrease when below rep range', () => {
    const result = suggestNextWeight(155, '8-10', 6, 9, 5);
    expect(result.weight).toBe(150);
    expect(result.reason).toContain('Reduce');
  });

  it('suggests same weight when in range', () => {
    const result = suggestNextWeight(135, '8-10', 9, 8, 5);
    expect(result.weight).toBe(135);
    expect(result.reason).toContain('appropriate');
  });

  it('does not suggest increase when RPE is high', () => {
    const result = suggestNextWeight(135, '8-10', 10, 9, 5);
    expect(result.weight).toBe(135);
  });

  it('suggests same when no RPE provided and in range', () => {
    const result = suggestNextWeight(135, '8-10', 9, undefined, 5);
    expect(result.weight).toBe(135);
  });
});

// --- Statistical Functions Tests ---

describe('movingAverage', () => {
  it('returns empty array for empty input', () => {
    expect(movingAverage([], 3)).toEqual([]);
  });

  it('returns original values for window size of 1', () => {
    expect(movingAverage([1, 2, 3, 4, 5], 1)).toEqual([1, 2, 3, 4, 5]);
  });

  it('calculates moving average correctly', () => {
    const values = [10, 20, 30, 40, 50];
    const result = movingAverage(values, 3);
    // First element: avg of [10] = 10
    // Second: avg of [10, 20] = 15
    // Third: avg of [10, 20, 30] = 20
    // Fourth: avg of [20, 30, 40] = 30
    // Fifth: avg of [30, 40, 50] = 40
    expect(result).toEqual([10, 15, 20, 30, 40]);
  });

  it('handles window larger than data', () => {
    const values = [100, 200, 300];
    const result = movingAverage(values, 10);
    expect(result[2]).toBe(200); // Average of all three
  });
});

describe('movingStdDev', () => {
  it('returns empty array for empty input', () => {
    expect(movingStdDev([], 3)).toEqual([]);
  });

  it('returns zeros for window size of 1', () => {
    expect(movingStdDev([1, 2, 3], 1)).toEqual([0, 0, 0]);
  });

  it('calculates standard deviation correctly', () => {
    const values = [10, 10, 10, 10];
    const result = movingStdDev(values, 3);
    // All same values = std dev of 0
    expect(result[3]).toBe(0);
  });

  it('handles varying values', () => {
    const values = [100, 200, 300];
    const result = movingStdDev(values, 3);
    // Last element uses all three values
    // Mean = 200, variance = ((100-200)^2 + (200-200)^2 + (300-200)^2) / 2 = 10000
    // Std = sqrt(10000) = 100
    expect(result[2]).toBe(100);
  });
});

describe('linearRegression', () => {
  it('handles single point', () => {
    const result = linearRegression([[0, 100]]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(100);
  });

  it('handles two points', () => {
    const result = linearRegression([[0, 0], [1, 1]]);
    expect(result.slope).toBe(1);
    expect(result.intercept).toBe(0);
  });

  it('calculates positive trend', () => {
    // Perfect upward line: y = 10x + 100
    const points: [number, number][] = [
      [0, 100],
      [1, 110],
      [2, 120],
      [3, 130],
      [4, 140],
    ];
    const result = linearRegression(points);
    expect(result.slope).toBe(10);
    expect(result.intercept).toBe(100);
    expect(result.rSquared).toBe(1);
  });

  it('calculates negative trend', () => {
    const points: [number, number][] = [
      [0, 200],
      [1, 180],
      [2, 160],
    ];
    const result = linearRegression(points);
    expect(result.slope).toBe(-20);
    expect(result.intercept).toBe(200);
  });

  it('handles flat line', () => {
    const points: [number, number][] = [
      [0, 100],
      [1, 100],
      [2, 100],
    ];
    const result = linearRegression(points);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(100);
  });
});

describe('calculateTrend', () => {
  it('returns null for insufficient data', () => {
    const points: DataPoint[] = [{ date: new Date(), value: 100 }];
    expect(calculateTrend(points)).toBeNull();
  });

  it('identifies improving trend', () => {
    const baseDate = new Date('2024-01-01');
    const points: DataPoint[] = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(baseDate.getTime() + i * 86400000),
      value: 100 + i * 10, // Steadily increasing
    }));
    const result = calculateTrend(points, 5);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe('improving');
    expect(result!.trendSlope).toBeGreaterThan(0);
  });

  it('identifies declining trend', () => {
    const baseDate = new Date('2024-01-01');
    const points: DataPoint[] = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(baseDate.getTime() + i * 86400000),
      value: 200 - i * 10, // Steadily decreasing
    }));
    const result = calculateTrend(points, 5);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe('declining');
    expect(result!.trendSlope).toBeLessThan(0);
  });

  it('identifies plateau', () => {
    const baseDate = new Date('2024-01-01');
    const points: DataPoint[] = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(baseDate.getTime() + i * 86400000),
      value: 150 + (i % 2 === 0 ? 1 : -1), // Minor fluctuation around 150
    }));
    const result = calculateTrend(points, 5);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe('plateau');
  });

  it('calculates percent change', () => {
    const baseDate = new Date('2024-01-01');
    const points: DataPoint[] = [
      { date: new Date(baseDate.getTime()), value: 100 },
      { date: new Date(baseDate.getTime() + 86400000), value: 105 },
      { date: new Date(baseDate.getTime() + 86400000 * 2), value: 110 },
      { date: new Date(baseDate.getTime() + 86400000 * 3), value: 115 },
      { date: new Date(baseDate.getTime() + 86400000 * 4), value: 120 },
      { date: new Date(baseDate.getTime() + 86400000 * 5), value: 125 },
    ];
    const result = calculateTrend(points, 5);
    expect(result).not.toBeNull();
    expect(result!.percentChange).toBeGreaterThan(0);
  });
});

describe('generateChartData', () => {
  it('returns empty array for empty input', () => {
    expect(generateChartData([])).toEqual([]);
  });

  it('generates chart data with rolling averages', () => {
    const baseDate = new Date('2024-01-01');
    const points: DataPoint[] = [
      { date: new Date(baseDate.getTime()), value: 100 },
      { date: new Date(baseDate.getTime() + 86400000), value: 110 },
      { date: new Date(baseDate.getTime() + 86400000 * 2), value: 120 },
    ];
    const result = generateChartData(points, 3);

    expect(result.length).toBe(3);
    expect(result[0].value).toBe(100);
    expect(result[1].value).toBe(110);
    expect(result[2].value).toBe(120);
    // Rolling average at point 3 should be (100+110+120)/3 = 110
    expect(result[2].rollingAvg).toBe(110);
  });

  it('includes upper and lower bands', () => {
    const baseDate = new Date('2024-01-01');
    const points: DataPoint[] = Array.from({ length: 5 }, (_, i) => ({
      date: new Date(baseDate.getTime() + i * 86400000),
      value: 100 + i * 10,
    }));
    const result = generateChartData(points, 3);

    // Each point should have all required fields
    for (const point of result) {
      expect(point).toHaveProperty('date');
      expect(point).toHaveProperty('value');
      expect(point).toHaveProperty('rollingAvg');
      expect(point).toHaveProperty('upperBand');
      expect(point).toHaveProperty('lowerBand');
      expect(point.lowerBand).toBeGreaterThanOrEqual(0);
    }
  });

  it('sorts data by date', () => {
    const baseDate = new Date('2024-01-01');
    // Provide out-of-order data
    const points: DataPoint[] = [
      { date: new Date(baseDate.getTime() + 86400000 * 2), value: 120 },
      { date: new Date(baseDate.getTime()), value: 100 },
      { date: new Date(baseDate.getTime() + 86400000), value: 110 },
    ];
    const result = generateChartData(points, 3);

    expect(result[0].value).toBe(100);
    expect(result[1].value).toBe(110);
    expect(result[2].value).toBe(120);
  });
});

// --- Plate Math Calculator Tests ---

describe('calculatePlateLoading', () => {
  it('calculates 135 lbs correctly (one 45 per side)', () => {
    const result = calculatePlateLoading(135, 45);
    expect(result.achievedWeight).toBe(135);
    expect(result.isExact).toBe(true);
    expect(result.platesPerSide).toEqual([{ weight: 45, count: 1 }]);
  });

  it('calculates 225 lbs correctly (two 45s per side)', () => {
    const result = calculatePlateLoading(225, 45);
    expect(result.achievedWeight).toBe(225);
    expect(result.isExact).toBe(true);
    expect(result.platesPerSide).toEqual([{ weight: 45, count: 2 }]);
  });

  it('calculates 185 lbs correctly (45 + 25 per side)', () => {
    const result = calculatePlateLoading(185, 45);
    expect(result.achievedWeight).toBe(185);
    expect(result.isExact).toBe(true);
    expect(result.platesPerSide).toEqual([
      { weight: 45, count: 1 },
      { weight: 25, count: 1 },
    ]);
  });

  it('returns bar only when target equals bar weight', () => {
    const result = calculatePlateLoading(45, 45);
    expect(result.achievedWeight).toBe(45);
    expect(result.isExact).toBe(true);
    expect(result.platesPerSide).toEqual([]);
  });

  it('returns bar weight when target is less than bar', () => {
    const result = calculatePlateLoading(30, 45);
    expect(result.achievedWeight).toBe(45);
    expect(result.isExact).toBe(false);
    // difference = target - achieved = 30 - 45 = -15
    // But our implementation returns bar - target for this case
    expect(result.difference).toBe(15);
  });

  it('handles complex plate combinations', () => {
    // 315 = 45 bar + (3 × 45) × 2 = 45 + 270
    const result = calculatePlateLoading(315, 45);
    expect(result.achievedWeight).toBe(315);
    expect(result.platesPerSide).toEqual([{ weight: 45, count: 3 }]);
  });

  it('handles impossible weight (rounds down)', () => {
    // 137 lbs is not achievable with standard plates
    // Closest lower is 135 (one 45 per side)
    const result = calculatePlateLoading(137, 45);
    expect(result.achievedWeight).toBe(135);
    expect(result.isExact).toBe(false);
    expect(result.difference).toBe(2);
  });

  it('works with custom bar weight', () => {
    // Trap bar at 65 lbs + 45 per side = 155
    const result = calculatePlateLoading(155, 65);
    expect(result.achievedWeight).toBe(155);
    expect(result.barWeight).toBe(65);
    expect(result.platesPerSide).toEqual([{ weight: 45, count: 1 }]);
  });
});

describe('findClosestAchievableWeight', () => {
  it('returns exact match for achievable weight', () => {
    const result = findClosestAchievableWeight(135, 45);
    expect(result.recommended.achievedWeight).toBe(135);
    expect(result.lower.achievedWeight).toBe(135);
    expect(result.upper.achievedWeight).toBe(135);
  });

  it('finds lower and upper bounds for impossible weight', () => {
    // 137 is between 135 and 140
    const result = findClosestAchievableWeight(137, 45);
    expect(result.lower.achievedWeight).toBe(135);
    expect(result.upper.achievedWeight).toBe(140);
    // 137 is closer to 135 (diff 2) than 140 (diff 3)
    expect(result.recommended.achievedWeight).toBe(135);
  });

  it('recommends upper when closer', () => {
    // 138 is closer to 140 (diff 2) than 135 (diff 3)
    const result = findClosestAchievableWeight(138, 45);
    expect(result.recommended.achievedWeight).toBe(140);
  });
});

describe('formatPlateLoading', () => {
  it('formats single plate type', () => {
    const result = calculatePlateLoading(135, 45);
    expect(formatPlateLoading(result)).toBe('45');
  });

  it('formats multiple plate types', () => {
    const result = calculatePlateLoading(185, 45);
    expect(formatPlateLoading(result)).toBe('45 + 25');
  });

  it('formats multiple of same plate', () => {
    const result = calculatePlateLoading(225, 45);
    expect(formatPlateLoading(result)).toBe('45 + 45');
  });

  it('returns bar only message when no plates', () => {
    const result = calculatePlateLoading(45, 45);
    expect(formatPlateLoading(result)).toBe('Bar only');
  });
});
