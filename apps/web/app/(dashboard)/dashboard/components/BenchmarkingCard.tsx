'use client';

import { TrendingUp, Target, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui';

interface BenchmarkingCardProps {
  percentile: number;
  categoryAverage: number;
  top25Threshold: number;
  totalComparable: number;
  performanceLabel: 'excellent' | 'good' | 'average' | 'needs_improvement';
  currentViews: number;
}

export function BenchmarkingCard({
  percentile,
  categoryAverage,
  top25Threshold,
  totalComparable,
  performanceLabel,
  currentViews,
}: BenchmarkingCardProps) {
  // Don't show if no comparable data
  if (totalComparable === 0 || currentViews < 10) {
    return null;
  }

  const performanceConfig = {
    excellent: {
      label: 'Excellent Performance',
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    good: {
      label: 'Above Average',
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    average: {
      label: 'Average Performance',
      color: 'text-tastelanc-text-secondary',
      bgColor: 'bg-tastelanc-surface-light',
      borderColor: 'border-tastelanc-border',
    },
    needs_improvement: {
      label: 'Room for Growth',
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
  };

  const config = performanceConfig[performanceLabel];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-tastelanc-text-secondary" />
          <h3 className="font-semibold text-tastelanc-text-primary">Performance Benchmark</h3>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
          {config.label}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-3xl font-bold text-tastelanc-text-primary">{percentile}%</div>
          <div className="text-sm text-tastelanc-text-secondary mt-1">
            Better than {percentile}% of similar restaurants
          </div>
        </div>

        <div>
          <div className="text-3xl font-bold text-tastelanc-text-primary">{currentViews.toLocaleString()}</div>
          <div className="text-sm text-tastelanc-text-secondary mt-1">
            Your profile views (30 days)
          </div>
        </div>
      </div>

      <div className={`border-t pt-4 ${config.borderColor}`}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center gap-1.5 text-tastelanc-text-secondary mb-1">
              <Target className="w-3.5 h-3.5" />
              <span>Category Average</span>
            </div>
            <div className="font-semibold text-tastelanc-text-primary">{categoryAverage.toLocaleString()} views</div>
            <div className={`text-xs mt-0.5 ${currentViews >= categoryAverage ? 'text-green-600' : 'text-amber-600'}`}>
              {currentViews >= categoryAverage
                ? `+${currentViews - categoryAverage} above average`
                : `${categoryAverage - currentViews} below average`}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-tastelanc-text-secondary mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Top 25% Threshold</span>
            </div>
            <div className="font-semibold text-tastelanc-text-primary">{top25Threshold.toLocaleString()} views</div>
            <div className={`text-xs mt-0.5 ${currentViews >= top25Threshold ? 'text-green-600' : 'text-tastelanc-text-secondary'}`}>
              {currentViews >= top25Threshold
                ? 'You\'re in the top tier'
                : `Need ${top25Threshold - currentViews} more to reach top 25%`}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-tastelanc-text-muted border-t border-tastelanc-border pt-3">
          Compared against {totalComparable.toLocaleString()} similar restaurants in your market
        </div>
      </div>
    </Card>
  );
}
