import { useEffect, useRef } from 'react';
import { useTimer, formatTime } from '@/hooks/useTimer';
import { useNotifications, isDocumentHidden } from '@/hooks/useNotifications';

interface RestTimerProps {
  duration: number; // seconds
  isActive: boolean;
  onComplete: () => void;
  audioEnabled?: boolean;
  notificationsEnabled?: boolean;
}

export function RestTimer({
  duration,
  isActive,
  onComplete,
  audioEnabled = true,
  notificationsEnabled = true,
}: RestTimerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const { showNotification, permission } = useNotifications();

  // Play a beep sound using Web Audio API
  const playBeep = (frequency: number = 800, duration: number = 150) => {
    if (!audioEnabled) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch {
      // Audio not supported or blocked
    }
  };

  const handleWarning = (remaining: number) => {
    if (remaining === 10) {
      playBeep(600, 100);
    } else if (remaining === 30) {
      playBeep(500, 100);
    }
  };

  const handleComplete = () => {
    // Triple beep on complete
    playBeep(800, 150);
    setTimeout(() => playBeep(800, 150), 200);
    setTimeout(() => playBeep(1000, 200), 400);

    // Show notification if app is backgrounded and notifications are enabled
    if (notificationsEnabled && permission === 'granted' && isDocumentHidden()) {
      showNotification('Rest Complete!', {
        body: 'Time to start your next set.',
        tag: 'rest-timer', // Prevents duplicate notifications
        requireInteraction: false,
      });
    }

    onComplete();
  };

  const {
    timeRemaining,
    isRunning,
    start,
    addTime,
    skip,
  } = useTimer({
    onComplete: handleComplete,
    onWarning: handleWarning,
    warningThresholds: [30, 10],
  });

  // Start timer when activated
  useEffect(() => {
    if (isActive && !isRunning && duration > 0) {
      start(duration);
    }
  }, [isActive, duration, start, isRunning]);

  // Calculate progress percentage
  const progress = duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0;

  if (!isActive) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 p-4 z-40">
      <div className="max-w-lg mx-auto bg-surface border border-surface-elevated rounded-xl p-4 shadow-lg">
        <div className="text-center mb-3">
          <p className="text-sm text-text-secondary mb-1">Rest Timer</p>
          <p className="text-4xl font-bold font-mono" data-testid="timer">
            {formatTime(timeRemaining)}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-surface-elevated rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => addTime(30)}
            className="flex-1 px-4 py-2 bg-surface-elevated hover:bg-surface rounded-lg text-sm font-medium transition-colors"
          >
            +30s
          </button>
          <button
            onClick={skip}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
