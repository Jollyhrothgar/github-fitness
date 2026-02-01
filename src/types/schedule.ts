export type WeekStartDay = 'Monday' | 'Sunday';

export interface UserSchedule {
  active_plan_id: string | null;
  workout_queue: string[]; // ["day_a", "day_b", "day_a", ...] - the order of workouts
  current_queue_index: number; // Which workout is next
  weekly_goal: number; // Target sessions per week
  week_start_day: WeekStartDay;
  current_week_start: string; // ISO date string for current week start
  completed_this_week: number; // Sessions completed in current week
}

// Get the start of the current week
export function getWeekStart(date: Date, weekStartDay: WeekStartDay): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const targetDay = weekStartDay === 'Monday' ? 1 : 0;

  let diff = dayOfWeek - targetDay;
  if (diff < 0) diff += 7;

  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Check if we're in a new week and need to reset counter
export function isNewWeek(
  lastWeekStart: string,
  weekStartDay: WeekStartDay
): boolean {
  const currentWeekStart = getWeekStart(new Date(), weekStartDay);
  const lastStart = new Date(lastWeekStart);
  return currentWeekStart > lastStart;
}

// Create initial schedule for a plan
export function createScheduleForPlan(
  planId: string,
  workoutDayIds: string[],
  weeklyGoal: number,
  weekStartDay: WeekStartDay = 'Monday'
): UserSchedule {
  return {
    active_plan_id: planId,
    workout_queue: workoutDayIds,
    current_queue_index: 0,
    weekly_goal: weeklyGoal,
    week_start_day: weekStartDay,
    current_week_start: getWeekStart(new Date(), weekStartDay).toISOString(),
    completed_this_week: 0,
  };
}

// Get next workout day ID from queue
export function getNextWorkoutDayId(schedule: UserSchedule): string | null {
  if (!schedule.workout_queue.length) return null;
  return schedule.workout_queue[schedule.current_queue_index % schedule.workout_queue.length];
}

// Advance to next workout in queue
export function advanceQueue(schedule: UserSchedule): UserSchedule {
  return {
    ...schedule,
    current_queue_index:
      (schedule.current_queue_index + 1) % schedule.workout_queue.length,
    completed_this_week: schedule.completed_this_week + 1,
  };
}
