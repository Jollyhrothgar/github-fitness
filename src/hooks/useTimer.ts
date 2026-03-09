import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerReturn {
  timeRemaining: number; // seconds
  isRunning: boolean;
  isPaused: boolean;
  start: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  addTime: (seconds: number) => void;
  skip: () => void;
}

interface UseTimerOptions {
  onComplete?: () => void;
  onTick?: (remaining: number) => void;
  warningThresholds?: number[]; // seconds at which to trigger warnings (e.g., [30, 10])
  onWarning?: (remaining: number) => void;
}

export function useTimer(options: UseTimerOptions = {}): UseTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Absolute end time in ms. Null when paused or stopped.
  const targetEndTime = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const warningsTriggered = useRef<Set<number>>(new Set());

  // Keep stable refs for callbacks so effects don't re-run on every render.
  const onCompleteRef = useRef(options.onComplete);
  const onTickRef = useRef(options.onTick);
  const onWarningRef = useRef(options.onWarning);
  const warningThresholdsRef = useRef(options.warningThresholds ?? [30, 10]);

  useEffect(() => { onCompleteRef.current = options.onComplete; });
  useEffect(() => { onTickRef.current = options.onTick; });
  useEffect(() => { onWarningRef.current = options.onWarning; });
  useEffect(() => { warningThresholdsRef.current = options.warningThresholds ?? [30, 10]; });

  // Core tick: compute remaining from the absolute end time and update state.
  // Returns the computed remaining value (≥ 0).
  const tick = useCallback((): number => {
    if (targetEndTime.current === null) return 0;

    const remaining = Math.max(0, Math.ceil((targetEndTime.current - Date.now()) / 1000));

    setTimeRemaining(remaining);
    onTickRef.current?.(remaining);

    // Fire warnings
    for (const threshold of warningThresholdsRef.current) {
      if (remaining <= threshold && !warningsTriggered.current.has(threshold)) {
        warningsTriggered.current.add(threshold);
        onWarningRef.current?.(remaining);
      }
    }

    return remaining;
  }, []);

  // Complete the timer: clear all timers, reset state, fire onComplete.
  const complete = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    targetEndTime.current = null;
    setTimeRemaining(0);
    setIsRunning(false);
    setIsPaused(false);
    onCompleteRef.current?.();
  }, []);

  // Visibility change handler — fires immediately when the page comes back to
  // the foreground so the UI is corrected even before the next interval tick.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (targetEndTime.current === null) return; // paused or stopped

      const remaining = tick();
      if (remaining <= 0) {
        complete();
      } else {
        // Schedule a single rAF to repaint immediately.
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (targetEndTime.current !== null) {
            tick();
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tick, complete]);

  // Interval tick effect — runs once per second for UI updates.
  useEffect(() => {
    if (!isRunning || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      if (targetEndTime.current === null) return;
      const remaining = tick();
      if (remaining <= 0) {
        complete();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused, tick, complete]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const start = useCallback((seconds: number) => {
    warningsTriggered.current.clear();
    targetEndTime.current = Date.now() + seconds * 1000;
    setTimeRemaining(seconds);
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    if (targetEndTime.current !== null) {
      // Capture remaining time before clearing the end time.
      const remaining = Math.max(0, Math.ceil((targetEndTime.current - Date.now()) / 1000));
      targetEndTime.current = null;
      setTimeRemaining(remaining);
    }
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    // Recompute targetEndTime from whatever timeRemaining is at resume moment.
    setTimeRemaining((prev) => {
      targetEndTime.current = Date.now() + prev * 1000;
      return prev;
    });
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    targetEndTime.current = null;
    warningsTriggered.current.clear();
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(0);
  }, []);

  const addTime = useCallback((seconds: number) => {
    if (targetEndTime.current !== null) {
      // Timer is running: extend the absolute end time.
      targetEndTime.current += seconds * 1000;
      // Reflect immediately in state.
      setTimeRemaining((prev) => Math.max(0, prev + seconds));
    } else {
      // Timer is paused or stopped: just extend the displayed time.
      setTimeRemaining((prev) => Math.max(0, prev + seconds));
    }
  }, []);

  const skip = useCallback(() => {
    targetEndTime.current = null;
    warningsTriggered.current.clear();
    setTimeRemaining(0);
    setIsRunning(false);
    setIsPaused(false);
    onCompleteRef.current?.();
  }, []);

  return {
    timeRemaining,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    stop,
    addTime,
    skip,
  };
}

// Format seconds to mm:ss
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
