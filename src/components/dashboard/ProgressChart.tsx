import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  ComposedChart,
} from 'recharts';
import type { DataPoint } from '@/lib/calculations';
import { generateChartData } from '@/lib/calculations';

interface ProgressChartProps {
  dataPoints: DataPoint[];
  windowSize?: number;
}

export function ProgressChart({ dataPoints, windowSize = 5 }: ProgressChartProps) {
  if (dataPoints.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted">
        <p>No data to display. Log some workouts to see progress.</p>
      </div>
    );
  }

  if (dataPoints.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted">
        <p>Need at least 2 data points to show a chart.</p>
      </div>
    );
  }

  const chartData = generateChartData(dataPoints, windowSize);

  // Format date for display
  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string }>;
    label?: string;
  }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0];
    const rollingAvg = payload.find((p) => p.dataKey === 'rollingAvg');

    return (
      <div className="bg-surface-elevated rounded-lg p-3 shadow-lg border border-border">
        <p className="text-sm text-text-secondary mb-1">{label}</p>
        <p className="text-sm font-medium">
          1RM: <span className="text-primary">{data.value} lbs</span>
        </p>
        {rollingAvg && (
          <p className="text-sm text-text-muted">
            Avg: {rollingAvg.value} lbs
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="h-64" data-testid="progress-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {/* Confidence band (area between upper and lower) */}
          <defs>
            <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <Area
            type="monotone"
            dataKey="upperBand"
            stroke="none"
            fill="url(#bandGradient)"
            fillOpacity={1}
          />
          <Area
            type="monotone"
            dataKey="lowerBand"
            stroke="none"
            fill="var(--color-background)"
            fillOpacity={1}
          />

          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            stroke="var(--color-border)"
            tickLine={false}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            stroke="var(--color-border)"
            tickLine={false}
            axisLine={false}
            width={45}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Rolling average line */}
          <Line
            type="monotone"
            dataKey="rollingAvg"
            stroke="rgb(59, 130, 246)"
            strokeWidth={2}
            dot={false}
            activeDot={false}
          />

          {/* Actual data points */}
          <Line
            type="monotone"
            dataKey="value"
            stroke="rgb(147, 197, 253)"
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={{ fill: 'rgb(147, 197, 253)', strokeWidth: 0, r: 3 }}
            activeDot={{ fill: 'rgb(59, 130, 246)', strokeWidth: 0, r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
