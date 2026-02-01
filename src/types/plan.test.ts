import { describe, it, expect } from 'vitest';
import { parseRepTarget, generatePlanId } from './plan';

describe('parseRepTarget', () => {
  it('parses rep range', () => {
    const result = parseRepTarget('8-10');
    expect(result).toEqual({ min: 8, max: 10, unit: 'reps' });
  });

  it('parses single rep value', () => {
    const result = parseRepTarget('5');
    expect(result).toEqual({ min: 5, max: 5, unit: 'reps' });
  });

  it('parses seconds', () => {
    const result = parseRepTarget('30 seconds');
    expect(result).toEqual({ min: 30, max: 30, unit: 'seconds' });
  });

  it('parses meters', () => {
    const result = parseRepTarget('20 meters');
    expect(result).toEqual({ min: 20, max: 20, unit: 'meters' });
  });

  it('handles case insensitive', () => {
    expect(parseRepTarget('30 SECONDS').unit).toBe('seconds');
    expect(parseRepTarget('20 Meters').unit).toBe('meters');
  });

  it('handles spaces in range', () => {
    const result = parseRepTarget('8 - 12');
    expect(result).toEqual({ min: 8, max: 12, unit: 'reps' });
  });
});

describe('generatePlanId', () => {
  it('converts name to lowercase with underscores', () => {
    expect(generatePlanId('Protocol Zero')).toBe('protocol_zero');
  });

  it('handles special characters', () => {
    expect(generatePlanId('Plan: Phase 1!')).toBe('plan_phase_1');
  });

  it('removes leading/trailing underscores', () => {
    expect(generatePlanId('  Test Plan  ')).toBe('test_plan');
  });

  it('handles multiple spaces', () => {
    expect(generatePlanId('My   Workout   Plan')).toBe('my_workout_plan');
  });

  it('handles hyphens', () => {
    expect(generatePlanId('Full-Body Workout')).toBe('full_body_workout');
  });
});
