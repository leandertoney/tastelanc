'use client';

import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { Card } from '@/components/ui';

interface PredictionsCardProps {
  next30Days: number;
  endOfMonth: number;
  dailyAverage: number;
  trend: 'growing' | 'declining' | 'stable';
}

export function PredictionsCard({ next30Days, endOfMonth, dailyAverage, trend }: PredictionsCardProps) {
  // Don't show predictions if numbers are very low (demotivating)
  if (dailyAverage < 10) {
    return null;
  }

  const trendConfig = {
    growing: {
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'Growing',
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    declining: {
      icon: <TrendingDown className="w-4 h-4" />,
      label: 'Declining',
      color: 'text-red-600',
      bgColor: 'bg-red-500/10',
    },
    stable: {
      icon: <Minus className="w-4 h-4" />,
      label: 'Stable',
      color: 'text-tastelanc-text-secondary',
      bgColor: 'bg-tastelanc-surface-light',
    },
  };

  const config = trendConfig[trend];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-tastelanc-text-secondary" />
          <h3 className="font-semibold text-tastelanc-text-primary">Performance Forecast</h3>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
          {config.icon}
          <span>{config.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border-r border-tastelanc-border pr-4">
          <div className="text-sm text-tastelanc-text-secondary mb-1">Daily Average</div>
          <div className="text-2xl font-bold text-tastelanc-text-primary">{Math.round(dailyAverage)}</div>
          <div className="text-xs text-tastelanc-text-muted mt-1">views per day</div>
        </div>

        <div className="border-r border-tastelanc-border pr-4">
          <div className="text-sm text-tastelanc-text-secondary mb-1">Next 30 Days</div>
          <div className="text-2xl font-bold text-tastelanc-text-primary">{next30Days.toLocaleString()}</div>
          <div className="text-xs text-tastelanc-text-muted mt-1">projected views</div>
        </div>

        <div>
          <div className="text-sm text-tastelanc-text-secondary mb-1">End of Month</div>
          <div className="text-2xl font-bold text-tastelanc-text-primary">{endOfMonth.toLocaleString()}</div>
          <div className="text-xs text-tastelanc-text-muted mt-1">projected total</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-tastelanc-border">
        <p className="text-xs text-tastelanc-text-muted">
          Based on your current trajectory and historical performance
        </p>
      </div>
    </Card>
  );
}
