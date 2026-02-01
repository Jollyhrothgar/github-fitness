import type { TrendAnalysis } from '@/lib/calculations';

interface TrendIndicatorProps {
  trend: TrendAnalysis | null;
}

export function TrendIndicator({ trend }: TrendIndicatorProps) {
  if (!trend) {
    return null;
  }

  const getDirectionInfo = () => {
    switch (trend.direction) {
      case 'improving':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          ),
          color: 'text-success',
          bgColor: 'bg-success/10',
          label: 'Improving',
          description: 'Your strength is trending up',
        };
      case 'declining':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
              />
            </svg>
          ),
          color: 'text-error',
          bgColor: 'bg-error/10',
          label: 'Declining',
          description: 'Consider reviewing your recovery',
        };
      case 'plateau':
      default:
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14"
              />
            </svg>
          ),
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          label: 'Plateau',
          description: 'Strength is stable',
        };
    }
  };

  const info = getDirectionInfo();

  return (
    <div className={`rounded-lg p-3 ${info.bgColor}`}>
      <div className="flex items-center gap-3">
        <div className={info.color}>{info.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${info.color}`}>{info.label}</span>
            {trend.percentChange !== 0 && (
              <span className="text-sm text-text-muted">
                {trend.percentChange > 0 ? '+' : ''}
                {trend.percentChange}%
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted">{info.description}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{Math.round(trend.currentMean)}</p>
          <p className="text-xs text-text-muted">Est. 1RM</p>
        </div>
      </div>
    </div>
  );
}
