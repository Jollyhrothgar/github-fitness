import { useState, useEffect, useCallback } from 'react';
import type { UserSchedule, WorkoutPlan } from '@/types';
import {
  createScheduleForPlan,
  getNextWorkoutDayId,
  advanceQueue,
  isNewWeek,
  getWeekStart,
} from '@/types/schedule';
import * as storage from '@/lib/storage';

interface UseScheduleReturn {
  schedule: UserSchedule | null;
  loading: boolean;
  nextWorkoutDayId: string | null;
  weeklyProgress: { completed: number; goal: number };
  activateplan: (plan: WorkoutPlan, weeklyGoal?: number) => void;
  advanceToNext: () => void;
  resetWeekIfNeeded: () => void;
  clearSchedule: () => void;
}

export function useSchedule(): UseScheduleReturn {
  const [schedule, setSchedule] = useState<UserSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSchedule = useCallback(() => {
    const stored = storage.getSchedule();
    setSchedule(stored);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Check and reset week counter if we're in a new week
  const resetWeekIfNeeded = useCallback(() => {
    if (!schedule) return;

    if (isNewWeek(schedule.current_week_start, schedule.week_start_day)) {
      const newWeekStart = getWeekStart(new Date(), schedule.week_start_day);
      const updated: UserSchedule = {
        ...schedule,
        current_week_start: newWeekStart.toISOString(),
        completed_this_week: 0,
      };
      storage.saveSchedule(updated);
      setSchedule(updated);
    }
  }, [schedule]);

  // Run week reset check on mount and schedule change
  useEffect(() => {
    if (schedule) {
      resetWeekIfNeeded();
    }
  }, [schedule?.current_week_start, resetWeekIfNeeded]);

  const activatePlan = useCallback(
    (plan: WorkoutPlan, weeklyGoal?: number) => {
      const planId = plan.plan_meta.plan_id!;
      const dayIds = plan.schedule.map((day) => day.id);
      const goal = weeklyGoal ?? plan.plan_meta.days_per_week;

      const newSchedule = createScheduleForPlan(planId, dayIds, goal);
      storage.saveSchedule(newSchedule);
      setSchedule(newSchedule);
    },
    []
  );

  const advanceToNext = useCallback(() => {
    if (!schedule) return;

    const updated = advanceQueue(schedule);
    storage.saveSchedule(updated);
    setSchedule(updated);
  }, [schedule]);

  const clearSchedule = useCallback(() => {
    storage.clearSchedule();
    setSchedule(null);
  }, []);

  const nextWorkoutDayId = schedule ? getNextWorkoutDayId(schedule) : null;

  const weeklyProgress = schedule
    ? { completed: schedule.completed_this_week, goal: schedule.weekly_goal }
    : { completed: 0, goal: 0 };

  return {
    schedule,
    loading,
    nextWorkoutDayId,
    weeklyProgress,
    activateplan: activatePlan,
    advanceToNext,
    resetWeekIfNeeded,
    clearSchedule,
  };
}
