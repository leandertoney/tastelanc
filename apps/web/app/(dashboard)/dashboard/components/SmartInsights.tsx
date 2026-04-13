'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Minus, ChevronRight, Target, Activity, Loader2, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui';

interface SmartInsightsProps {
  restaurantId: string;
  buildApiUrl: (path: string) => string;
  hasElite: boolean;
  hasPremium: boolean;
  // Pass in analytics data from parent
  benchmarking?: {
    percentile: number;
    categoryAverage: number;
    top25Threshold: number;
    totalComparable: number;
    performanceLabel: 'excellent' | 'good' | 'average' | 'needs_improvement';
  } | null;
  predictions?: {
    next30Days: number;
    endOfMonth: number;
    dailyAverage: number;
    trend: 'growing' | 'declining' | 'stable';
  } | null;
  quickWins?: Array<{
    action: string;
    impact: string;
    estimate: string;
    priority: number;
  }> | null;
  currentViews: number;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  message: string;
  action: string;
  actionLabel: string;
}

function PriorityDot({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const colors = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-500' };
  return <div className={`w-2 h-2 rounded-full ${colors[priority]} flex-shrink-0 mt-1.5`} />;
}

export function SmartInsights({
  restaurantId,
  buildApiUrl,
  hasElite,
  hasPremium,
  benchmarking,
  predictions,
  quickWins,
  currentViews,
}: SmartInsightsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(hasElite);

  useEffect(() => {
    async function fetchRecommendations() {
      if (!restaurantId || !hasElite) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(buildApiUrl(`/api/dashboard/insights?restaurant_id=${restaurantId}`));
        if (!response.ok) throw new Error('Failed to fetch insights');

        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error('Error fetching insights:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [restaurantId, buildApiUrl, hasElite]);

  // Don't show anything if not Premium+
  if (!hasPremium && !hasElite) return null;

  // Show loading state
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-tastelanc-accent" />
          <h2 className="text-xl font-bold text-tastelanc-text-primary">Performance Overview</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-tastelanc-text-muted animate-spin" />
        </div>
      </Card>
    );
  }

  // Determine trend config
  const trendConfig = predictions?.trend ? {
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
  }[predictions.trend] : null;

  const performanceConfig = benchmarking?.performanceLabel ? {
    excellent: { label: 'Excellent Performance', color: 'text-green-600', bgColor: 'bg-green-500/10' },
    good: { label: 'Above Average', color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
    average: { label: 'Average Performance', color: 'text-tastelanc-text-secondary', bgColor: 'bg-tastelanc-surface-light' },
    needs_improvement: { label: 'Room for Growth', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  }[benchmarking.performanceLabel] : null;

  // Get top actions (prioritize quick wins, then recommendations)
  const topActions = [...(quickWins || []).slice(0, 2), ...(recommendations || []).slice(0, 2)].slice(0, 3);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-tastelanc-accent" />
          <h2 className="text-xl font-bold text-tastelanc-text-primary">Performance Overview</h2>
        </div>
        {hasElite && (
          <Link
            href="/dashboard/insights"
            className="text-tastelanc-accent hover:text-tastelanc-accent-hover text-sm font-medium flex items-center gap-1"
          >
            Full Insights
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Visibility Score / Percentile */}
        {benchmarking && benchmarking.totalComparable > 0 && currentViews >= 10 && (
          <div className="bg-tastelanc-surface rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-tastelanc-text-secondary" />
              <span className="text-xs text-tastelanc-text-secondary">Ranking</span>
            </div>
            <div className="text-2xl font-bold text-tastelanc-text-primary">{benchmarking.percentile}%</div>
            <div className="text-xs text-tastelanc-text-muted mt-1">Top {100 - benchmarking.percentile}%</div>
          </div>
        )}

        {/* Current Views */}
        <div className="bg-tastelanc-surface rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-tastelanc-text-secondary" />
            <span className="text-xs text-tastelanc-text-secondary">Profile Views</span>
          </div>
          <div className="text-2xl font-bold text-tastelanc-text-primary">{currentViews.toLocaleString()}</div>
          <div className="text-xs text-tastelanc-text-muted mt-1">Last 30 days</div>
        </div>

        {/* Trend */}
        {predictions && trendConfig && predictions.dailyAverage >= 10 && (
          <div className="bg-tastelanc-surface rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-tastelanc-text-secondary" />
              <span className="text-xs text-tastelanc-text-secondary">Trend</span>
            </div>
            <div className={`flex items-center gap-2 text-2xl font-bold ${trendConfig.color}`}>
              {trendConfig.icon}
              <span>{trendConfig.label}</span>
            </div>
            <div className="text-xs text-tastelanc-text-muted mt-1">{Math.round(predictions.dailyAverage)} / day</div>
          </div>
        )}

        {/* Next 30 Days Forecast */}
        {predictions && predictions.dailyAverage >= 10 && (
          <div className="bg-tastelanc-surface rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-tastelanc-text-secondary" />
              <span className="text-xs text-tastelanc-text-secondary">Forecast</span>
            </div>
            <div className="text-2xl font-bold text-tastelanc-text-primary">{predictions.next30Days.toLocaleString()}</div>
            <div className="text-xs text-tastelanc-text-muted mt-1">Next 30 days</div>
          </div>
        )}
      </div>

      {/* Performance Badge */}
      {performanceConfig && benchmarking && benchmarking.totalComparable > 0 && currentViews >= 10 && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 ${performanceConfig.bgColor}`}>
          <div className={`text-sm font-medium ${performanceConfig.color}`}>
            {performanceConfig.label}
          </div>
          <span className="text-xs text-tastelanc-text-muted">
            vs. {benchmarking.totalComparable} similar restaurants
          </span>
        </div>
      )}

      {/* Top Actions */}
      {topActions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-tastelanc-text-primary mb-3">Highest-Impact Actions</h3>
          <div className="space-y-2">
            {topActions.map((action, i) => {
              const isQuickWin = 'estimate' in action;
              const priority = isQuickWin ? 'high' : (action as Recommendation).priority;

              return (
                <Link
                  key={i}
                  href={isQuickWin ? `/dashboard/photos` : (action as Recommendation).action}
                  className="flex items-start gap-3 p-3 bg-tastelanc-surface rounded-lg hover:bg-tastelanc-surface-light transition-colors group"
                >
                  <PriorityDot priority={priority} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-tastelanc-text-secondary">
                      {isQuickWin ? action.action : (action as Recommendation).message}
                    </p>
                    {isQuickWin && (
                      <p className="text-xs text-tastelanc-text-muted mt-0.5">{action.impact}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-tastelanc-text-secondary group-hover:text-tastelanc-accent flex-shrink-0 mt-0.5" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* No actions = doing great */}
      {topActions.length === 0 && (
        <div className="text-center py-6 border border-green-500/20 rounded-lg bg-green-500/5">
          <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-tastelanc-text-primary">You're performing well</p>
          <p className="text-xs text-tastelanc-text-secondary mt-1">Keep up the great work!</p>
        </div>
      )}
    </Card>
  );
}
