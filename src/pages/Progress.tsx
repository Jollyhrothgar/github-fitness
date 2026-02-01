import { useState, useEffect, useMemo } from 'react';
import { useStorage } from '@/lib/StorageContext';
import { SessionHistory, ProgressChart, TrendIndicator } from '@/components/dashboard';
import { estimate1RM, getBestSet } from '@/types/log';
import { calculateTrend, type DataPoint } from '@/lib/calculations';

export default function Progress() {
  const { logs, exercises } = useStorage();
  const [selectedExercise, setSelectedExercise] = useState<string>('');

  // Get all unique exercise IDs that have been performed
  const performedExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const log of logs.logs) {
      if (!log.timestamp_end) continue; // Only completed workouts
      for (const ex of log.performed_exercises) {
        ids.add(ex.exercise_id);
      }
    }
    return Array.from(ids).sort();
  }, [logs.logs]);

  // Auto-select first exercise if none selected
  useEffect(() => {
    if (!selectedExercise && performedExerciseIds.length > 0) {
      setSelectedExercise(performedExerciseIds[0]);
    }
  }, [selectedExercise, performedExerciseIds]);

  // Get exercise name for display
  const getExerciseName = (id: string) => {
    const exercise = exercises.exercises.find((e) => e.id === id);
    return exercise?.name ?? id.replace(/_/g, ' ');
  };

  // Extract 1RM data points for the selected exercise
  const dataPoints = useMemo((): DataPoint[] => {
    if (!selectedExercise) return [];

    const points: DataPoint[] = [];

    for (const log of logs.logs) {
      if (!log.timestamp_end) continue; // Only completed workouts

      const performed = log.performed_exercises.find(
        (ex) => ex.exercise_id === selectedExercise
      );
      if (!performed) continue;

      const bestSet = getBestSet(performed);
      if (bestSet && bestSet.reps) {
        const e1rm = bestSet.calculated_1rm ?? estimate1RM(bestSet.weight_calculated, bestSet.reps);
        points.push({
          date: new Date(log.timestamp_start),
          value: Math.round(e1rm),
        });
      }
    }

    // Sort by date
    return points.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [selectedExercise, logs.logs]);

  // Calculate trend for the selected exercise
  const trend = useMemo(() => {
    if (dataPoints.length < 3) return null;
    return calculateTrend(dataPoints, 5);
  }, [dataPoints]);

  // Get completed logs for history
  const completedLogs = useMemo(() => {
    return logs.logs.filter((log) => log.timestamp_end);
  }, [logs.logs]);

  // Handle exercise selection from session detail
  const handleSelectExercise = (exerciseId: string) => {
    if (performedExerciseIds.includes(exerciseId)) {
      setSelectedExercise(exerciseId);
      // Scroll to top to see the chart
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (logs.loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <p className="text-text-muted">Loading progress data...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Progress</h1>

      {/* Exercise Selector */}
      <section className="bg-surface rounded-lg p-4 mb-4">
        <h2 className="text-sm font-medium text-text-secondary mb-3">Track Exercise</h2>
        <select
          value={selectedExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
          className="w-full p-3 bg-surface-elevated rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="exercise-select"
        >
          <option value="">Select an exercise...</option>
          {performedExerciseIds.map((id) => (
            <option key={id} value={id}>
              {getExerciseName(id)}
            </option>
          ))}
        </select>
      </section>

      {/* Trend Indicator */}
      {selectedExercise && trend && (
        <section className="mb-4">
          <TrendIndicator trend={trend} />
        </section>
      )}

      {/* Chart */}
      <section className="bg-surface rounded-lg p-4 mb-4">
        <h2 className="text-sm font-medium text-text-secondary mb-3">
          Estimated 1RM Trend
          {selectedExercise && (
            <span className="text-text-muted ml-2">
              ({dataPoints.length} data point{dataPoints.length !== 1 ? 's' : ''})
            </span>
          )}
        </h2>
        {selectedExercise ? (
          <ProgressChart dataPoints={dataPoints} windowSize={5} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            <p>Select an exercise to view progress.</p>
          </div>
        )}
      </section>

      {/* Quick Stats */}
      {selectedExercise && dataPoints.length > 0 && (
        <section className="bg-surface rounded-lg p-4 mb-4">
          <h2 className="text-sm font-medium text-text-secondary mb-3">
            {getExerciseName(selectedExercise)} Stats
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {Math.max(...dataPoints.map((d) => d.value))}
              </p>
              <p className="text-xs text-text-muted">Best 1RM</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {dataPoints.length > 0
                  ? Math.round(dataPoints.reduce((s, d) => s + d.value, 0) / dataPoints.length)
                  : '-'}
              </p>
              <p className="text-xs text-text-muted">Avg 1RM</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{dataPoints.length}</p>
              <p className="text-xs text-text-muted">Sessions</p>
            </div>
          </div>
        </section>
      )}

      {/* Session History */}
      <section className="bg-surface rounded-lg p-4">
        <h2 className="text-sm font-medium text-text-secondary mb-3">Session History</h2>
        <SessionHistory logs={completedLogs} onSelectExercise={handleSelectExercise} />
      </section>
    </div>
  );
}
