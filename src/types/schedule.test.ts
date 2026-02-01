import { describe, it, expect, vi } from 'vitest';
import {
  getWeekStart,
  isNewWeek,
  createScheduleForPlan,
  getNextWorkoutDayId,
  advanceQueue,
} from './schedule';

describe('getWeekStart', () => {
  it('returns Monday for Monday week start', () => {
    // Wednesday Jan 22, 2026
    const date = new Date('2026-01-22T12:00:00Z');
    const weekStart = getWeekStart(date, 'Monday');

    expect(weekStart.getDay()).toBe(1); // Monday
    expect(weekStart.getDate()).toBe(19); // Jan 19
  });

  it('returns Sunday for Sunday week start', () => {
    // Wednesday Jan 22, 2026
    const date = new Date('2026-01-22T12:00:00Z');
    const weekStart = getWeekStart(date, 'Sunday');

    expect(weekStart.getDay()).toBe(0); // Sunday
    expect(weekStart.getDate()).toBe(18); // Jan 18
  });

  it('returns same day if already on week start', () => {
    // Monday Jan 19, 2026
    const date = new Date('2026-01-19T12:00:00Z');
    const weekStart = getWeekStart(date, 'Monday');

    expect(weekStart.getDate()).toBe(19);
  });
});

describe('isNewWeek', () => {
  it('returns true when in new week', () => {
    const lastWeekStart = '2026-01-12T00:00:00Z'; // Previous Monday
    // Mock current date to Jan 20 (next week)
    vi.setSystemTime(new Date('2026-01-20T12:00:00Z'));

    expect(isNewWeek(lastWeekStart, 'Monday')).toBe(true);

    vi.useRealTimers();
  });

  it('returns false when in same week', () => {
    // Set the current time to be Wednesday
    const mockDate = new Date('2026-01-21T12:00:00');
    vi.setSystemTime(mockDate);

    // Get the actual week start for this date
    const weekStart = getWeekStart(mockDate, 'Monday');

    // isNewWeek should return false when lastWeekStart matches current week
    expect(isNewWeek(weekStart.toISOString(), 'Monday')).toBe(false);

    vi.useRealTimers();
  });
});

describe('createScheduleForPlan', () => {
  it('creates schedule with correct properties', () => {
    const schedule = createScheduleForPlan(
      'test_plan',
      ['day_a', 'day_b'],
      2,
      'Monday'
    );

    expect(schedule.active_plan_id).toBe('test_plan');
    expect(schedule.workout_queue).toEqual(['day_a', 'day_b']);
    expect(schedule.weekly_goal).toBe(2);
    expect(schedule.week_start_day).toBe('Monday');
    expect(schedule.current_queue_index).toBe(0);
    expect(schedule.completed_this_week).toBe(0);
  });

  it('sets current week start', () => {
    const schedule = createScheduleForPlan('test', ['day_a'], 1);
    expect(schedule.current_week_start).toBeDefined();
  });
});

describe('getNextWorkoutDayId', () => {
  it('returns first day at index 0', () => {
    const schedule = createScheduleForPlan('test', ['day_a', 'day_b'], 2);
    expect(getNextWorkoutDayId(schedule)).toBe('day_a');
  });

  it('returns correct day at index 1', () => {
    const schedule = createScheduleForPlan('test', ['day_a', 'day_b'], 2);
    schedule.current_queue_index = 1;
    expect(getNextWorkoutDayId(schedule)).toBe('day_b');
  });

  it('wraps around to first day', () => {
    const schedule = createScheduleForPlan('test', ['day_a', 'day_b'], 2);
    schedule.current_queue_index = 2;
    expect(getNextWorkoutDayId(schedule)).toBe('day_a');
  });

  it('returns null for empty queue', () => {
    const schedule = createScheduleForPlan('test', [], 0);
    expect(getNextWorkoutDayId(schedule)).toBeNull();
  });
});

describe('advanceQueue', () => {
  it('increments queue index', () => {
    const schedule = createScheduleForPlan('test', ['day_a', 'day_b'], 2);
    const advanced = advanceQueue(schedule);
    expect(advanced.current_queue_index).toBe(1);
  });

  it('wraps queue index', () => {
    const schedule = createScheduleForPlan('test', ['day_a', 'day_b'], 2);
    schedule.current_queue_index = 1;
    const advanced = advanceQueue(schedule);
    expect(advanced.current_queue_index).toBe(0);
  });

  it('increments completed count', () => {
    const schedule = createScheduleForPlan('test', ['day_a', 'day_b'], 2);
    const advanced = advanceQueue(schedule);
    expect(advanced.completed_this_week).toBe(1);
  });

  it('does not mutate original', () => {
    const schedule = createScheduleForPlan('test', ['day_a', 'day_b'], 2);
    advanceQueue(schedule);
    expect(schedule.current_queue_index).toBe(0);
    expect(schedule.completed_this_week).toBe(0);
  });
});
