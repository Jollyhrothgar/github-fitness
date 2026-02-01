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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningsTriggered = useRef<Set<number>>(new Set());

  const {
    onComplete,
    onTick,
    warningThresholds = [30, 10],
    onWarning,
  } = options;

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer tick effect
  useEffect(() => {
    if (!isRunning || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;

        // Call onTick
        onTick?.(newTime);

        // Check warning thresholds
        if (onWarning) {
          for (const threshold of warningThresholds) {
            if (newTime === threshold && !warningsTriggered.current.has(threshold)) {
              warningsTriggered.current.add(threshold);
              onWarning(newTime);
            }
          }
        }

        // Timer complete
        if (newTime <= 0) {
          setIsRunning(false);
          onComplete?.();
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused, onComplete, onTick, onWarning, warningThresholds]);

  const start = useCallback((seconds: number) => {
    warningsTriggered.current.clear();
    setTimeRemaining(seconds);
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(0);
    warningsTriggered.current.clear();
  }, []);

  const addTime = useCallback((seconds: number) => {
    setTimeRemaining((prev) => Math.max(0, prev + seconds));
  }, []);

  const skip = useCallback(() => {
    setTimeRemaining(0);
    setIsRunning(false);
    setIsPaused(false);
    warningsTriggered.current.clear();
    onComplete?.();
  }, [onComplete]);

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
