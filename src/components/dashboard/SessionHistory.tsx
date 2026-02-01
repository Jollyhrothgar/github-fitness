import { useState } from 'react';
import type { WorkoutLog } from '@/types';
import { formatDuration, calculateSessionVolume } from '@/types/log';
import { SessionDetail } from './SessionDetail';

interface SessionHistoryProps {
  logs: WorkoutLog[];
  onSelectExercise?: (exerciseId: string) => void;
}

export function SessionHistory({ logs, onSelectExercise }: SessionHistoryProps) {
  const [selectedSession, setSelectedSession] = useState<WorkoutLog | null>(null);

  // Sort by date, most recent first
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.timestamp_start).getTime() - new Date(a.timestamp_start).getTime()
  );

  if (logs.length === 0) {
    return <p className="text-text-muted text-sm">No sessions logged yet.</p>;
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="space-y-2">
        {sortedLogs.map((log) => {
          const volume = calculateSessionVolume(log);
          const exerciseCount = log.performed_exercises.length;
          const setCount = log.performed_exercises.reduce(
            (sum, ex) => sum + ex.sets.filter((s) => !s.is_warmup).length,
            0
          );

          return (
            <button
              key={log.session_id}
              onClick={() => setSelectedSession(log)}
              className="w-full text-left bg-surface-elevated hover:bg-surface-elevated/80 rounded-lg p-3 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{log.day_id.replace(/_/g, ' ')}</span>
                <span className="text-sm text-text-secondary">
                  {formatDate(log.timestamp_start)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-text-muted">
                <span>{exerciseCount} exercises</span>
                <span>{setCount} sets</span>
                <span>{volume.toLocaleString()} lbs</span>
                {log.timestamp_end && (
                  <span>{formatDuration(log.timestamp_start, log.timestamp_end)}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedSession && (
        <SessionDetail
          log={selectedSession}
          onClose={() => setSelectedSession(null)}
          onSelectExercise={onSelectExercise}
        />
      )}
    </>
  );
}
