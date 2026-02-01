import { describe, it, expect } from 'vitest';
import {
  convertWeight,
  calculateTotalWeight,
  calculatePlatesPerSide,
  generateDeviceId,
  createDefaultConfig,
} from './config';

describe('convertWeight', () => {
  it('returns same weight for same unit', () => {
    expect(convertWeight(100, 'lbs', 'lbs')).toBe(100);
    expect(convertWeight(50, 'kg', 'kg')).toBe(50);
  });

  it('converts lbs to kg', () => {
    // 100 lbs = 45.36 kg
    expect(convertWeight(100, 'lbs', 'kg')).toBeCloseTo(45.4, 1);
  });

  it('converts kg to lbs', () => {
    // 50 kg = 110.23 lbs
    expect(convertWeight(50, 'kg', 'lbs')).toBeCloseTo(110.2, 1);
  });

  it('rounds to one decimal place', () => {
    const result = convertWeight(45, 'lbs', 'kg');
    const decimalPlaces = (result.toString().split('.')[1] || '').length;
    expect(decimalPlaces).toBeLessThanOrEqual(1);
  });
});

describe('calculateTotalWeight', () => {
  it('calculates total from plates per side', () => {
    // 45 per side + 45 bar = 135 total
    expect(calculateTotalWeight(45, 45)).toBe(135);
  });

  it('handles different bar weights', () => {
    // 45 per side + 55 trap bar = 145 total
    expect(calculateTotalWeight(45, 55)).toBe(145);
  });

  it('handles zero plates', () => {
    expect(calculateTotalWeight(0, 45)).toBe(45);
  });

  it('handles heavy plates', () => {
    // 135 per side (45+45+45) + 45 bar = 315
    expect(calculateTotalWeight(135, 45)).toBe(315);
  });
});

describe('calculatePlatesPerSide', () => {
  it('calculates plates per side from target', () => {
    // 135 total - 45 bar = 90 / 2 = 45 per side
    expect(calculatePlatesPerSide(135, 45)).toBe(45);
  });

  it('handles odd weights', () => {
    // 185 - 45 = 140 / 2 = 70 per side
    expect(calculatePlatesPerSide(185, 45)).toBe(70);
  });

  it('returns 0 for bar-only weight', () => {
    expect(calculatePlatesPerSide(45, 45)).toBe(0);
  });

  it('returns 0 for weight less than bar', () => {
    expect(calculatePlatesPerSide(30, 45)).toBe(0);
  });
});

describe('generateDeviceId', () => {
  it('generates a string', () => {
    const id = generateDeviceId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('includes timestamp component', () => {
    const id = generateDeviceId();
    // Should contain underscore separating user agent and timestamp
    expect(id).toContain('_');
  });
});

describe('createDefaultConfig', () => {
  it('creates config with lbs default', () => {
    const config = createDefaultConfig();
    expect(config.units).toBe('lbs');
  });

  it('creates config with standard equipment', () => {
    const config = createDefaultConfig();
    expect(config.equipment.standard_bar_weight_lbs).toBe(45);
    expect(config.equipment.trap_bar_weight_lbs).toBe(55);
  });

  it('enables timer audio by default', () => {
    const config = createDefaultConfig();
    expect(config.timer_audio_enabled).toBe(true);
  });

  it('generates device ID', () => {
    const config = createDefaultConfig();
    expect(config.device_id).toBeDefined();
    expect(config.device_id.length).toBeGreaterThan(0);
  });

  it('sets timestamps', () => {
    const config = createDefaultConfig();
    expect(config.created_at).toBeDefined();
    expect(config.updated_at).toBeDefined();
  });
});
