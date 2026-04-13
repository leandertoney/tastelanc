'use client';

import { useState, useEffect } from 'react';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  Calendar,
  Layers,
  X,
  Target,
  BarChart3,
  Activity,
  HelpCircle,
  Badge as BadgeIcon,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { Card, Badge, Tooltip } from '@/components/ui';

interface DashboardOverviewProps {
  restaurantId: string;
  buildApiUrl: (path: string) => string;
  hasElite: boolean;
  hasPremium: boolean;
  // Stats
  profileViews: number;
  profileViewsChange: string;
  impressions30d: number;
  impressionsChange: string;
  favorites: number;
  activeEvents: number;
  // Analytics data
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
  profileCompletion?: {
    percentage: number;
    band: string;
    updatedAt: string | null;
    items: { label: string; completed: boolean; action?: string; maxPoints: number }[];
  } | null;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  message: string;
  action: string;
  actionLabel: string;
}

export function DashboardOverview({
  restaurantId,
  buildApiUrl,
  hasElite,
  hasPremium,
  profileViews,
  profileViewsChange,
  impressions30d,
  impressionsChange,
  favorites,
  activeEvents,
  benchmarking,
  predictions,
  quickWins,
  profileCompletion,
}: DashboardOverviewProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(hasElite);
  const [dismissedTips, setDismissedTips] = useState<number[]>([]);

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

  // Combine quick wins and recommendations
  const allTips = [...(quickWins || []).slice(0, 3), ...(recommendations || []).slice(0, 3)].slice(0, 5);
  const visibleTips = allTips.filter((_, index) => !dismissedTips.includes(index));

  const dismissTip = (index: number) => {
    setDismissedTips([...dismissedTips, index]);
  };

  // Determine performance
  const trendConfig = predictions?.trend ? {
    growing: { icon: <TrendingUp className="w-4 h-4" />, label: 'Growing', color: 'text-green-600', bgColor: 'bg-green-500/10' },
    declining: { icon: <TrendingDown className="w-4 h-4" />, label: 'Declining', color: 'text-red-600', bgColor: 'bg-red-500/10' },
    stable: { icon: <Activity className="w-4 h-4" />, label: 'Stable', color: 'text-tastelanc-text-secondary', bgColor: 'bg-tastelanc-surface-light' },
  }[predictions.trend] : null;

  const performanceConfig = benchmarking?.performanceLabel ? {
    excellent: { label: 'Excellent', color: 'text-green-600' },
    good: { label: 'Above Average', color: 'text-blue-600' },
    average: { label: 'Average', color: 'text-tastelanc-text-secondary' },
    needs_improvement: { label: 'Growing', color: 'text-amber-600' },
  }[benchmarking.performanceLabel] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT: Stats & Visibility Score */}
      <div className="lg:col-span-2 space-y-6">
        {/* Stats Grid - Compact */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-tastelanc-accent" />
              <span className="text-xs text-tastelanc-text-muted">Views</span>
            </div>
            <p className="text-2xl font-bold text-tastelanc-text-primary">{profileViews.toLocaleString()}</p>
            <p className={`text-xs mt-1 ${profileViewsChange.startsWith('+') ? 'text-green-400' : 'text-tastelanc-text-faint'}`}>
              {profileViewsChange}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-tastelanc-accent" />
              <span className="text-xs text-tastelanc-text-muted">Impressions</span>
            </div>
            <p className="text-2xl font-bold text-tastelanc-text-primary">{impressions30d.toLocaleString()}</p>
            <p className={`text-xs mt-1 ${impressionsChange.startsWith('+') ? 'text-green-400' : 'text-tastelanc-text-faint'}`}>
              {impressionsChange}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-tastelanc-accent" />
              <span className="text-xs text-tastelanc-text-muted">Favorites</span>
            </div>
            <p className="text-2xl font-bold text-tastelanc-text-primary">{favorites}</p>
            <p className="text-xs mt-1 text-tastelanc-text-faint">All time</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-tastelanc-accent" />
              <span className="text-xs text-tastelanc-text-muted">Events</span>
            </div>
            <p className="text-2xl font-bold text-tastelanc-text-primary">{activeEvents}</p>
            <p className="text-xs mt-1 text-tastelanc-text-faint">Active</p>
          </Card>
        </div>

        {/* Visibility Score */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-tastelanc-text-primary flex items-center gap-2">
              Visibility Score
              <Tooltip content="Your Visibility Score determines how prominently your restaurant appears in the app. Add deals, videos, menus, and more to boost your score." position="top">
                <HelpCircle className="w-3.5 h-3.5 text-tastelanc-text-faint hover:text-tastelanc-text-muted cursor-help" />
              </Tooltip>
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant="accent">{profileCompletion?.percentage || 0}/100</Badge>
              {profileCompletion?.band && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  profileCompletion.band === 'Optimized' ? 'bg-green-500/20 text-green-400' :
                  profileCompletion.band === 'Great' ? 'bg-blue-500/20 text-blue-400' :
                  profileCompletion.band === 'Good' ? 'bg-yellow-500/20 text-yellow-400' :
                  profileCompletion.band === 'Getting Started' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {profileCompletion.band}
                </span>
              )}
            </div>
          </div>
          <div className="w-full bg-tastelanc-surface rounded-full h-2 mb-4">
            <div
              className="bg-tastelanc-accent h-2 rounded-full transition-all"
              style={{ width: `${profileCompletion?.percentage || 0}%` }}
            />
          </div>
          <ul className="space-y-2">
            {profileCompletion?.items.slice(0, 4).map((item, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${item.completed ? 'bg-green-500' : 'bg-tastelanc-surface-light'}`}>
                  <span className={`text-xs ${item.completed ? 'text-white' : 'text-tastelanc-text-muted'}`}>
                    {item.completed ? '✓' : '○'}
                  </span>
                </span>
                <span className={item.completed ? 'text-tastelanc-text-secondary' : 'text-tastelanc-text-faint'}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-1 text-tastelanc-accent hover:underline mt-4 text-sm"
          >
            Boost your visibility <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>
      </div>

      {/* RIGHT: Performance & Tips Stack */}
      <div className="lg:col-span-1 space-y-4">
        {/* Performance Summary - Premium+ */}
        {hasPremium && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-tastelanc-accent" />
                <h3 className="text-base font-bold text-tastelanc-text-primary">Performance</h3>
              </div>
              {hasElite && (
                <Link
                  href="/dashboard/insights"
                  className="text-tastelanc-accent hover:text-tastelanc-accent-hover text-xs font-medium"
                >
                  Full →
                </Link>
              )}
            </div>

            <div className="space-y-4">
              {/* Ranking */}
              {benchmarking && benchmarking.totalComparable > 0 && profileViews >= 10 ? (
                <div>
                  <div className="text-xs text-tastelanc-text-muted mb-1">Ranking</div>
                  <div className="text-2xl font-bold text-tastelanc-text-primary">{benchmarking.percentile}%</div>
                  <div className={`text-xs mt-0.5 font-medium ${performanceConfig?.color}`}>
                    {performanceConfig?.label}
                  </div>
                </div>
              ) : null}

              {/* Trend */}
              {predictions && trendConfig && predictions.dailyAverage >= 10 ? (
                <div>
                  <div className="text-xs text-tastelanc-text-muted mb-1">Trend</div>
                  <div className={`flex items-center gap-2 ${trendConfig.color}`}>
                    {trendConfig.icon}
                    <span className="text-xl font-bold">{trendConfig.label}</span>
                  </div>
                  <div className="text-xs mt-0.5 text-tastelanc-text-muted">
                    {Math.round(predictions.dailyAverage)} / day
                  </div>
                </div>
              ) : null}

              {/* Forecast */}
              {predictions && predictions.dailyAverage >= 10 ? (
                <div>
                  <div className="text-xs text-tastelanc-text-muted mb-1">Next 30 Days</div>
                  <div className="text-2xl font-bold text-tastelanc-text-primary">
                    {predictions.next30Days.toLocaleString()}
                  </div>
                  <div className="text-xs mt-0.5 text-tastelanc-text-muted">Projected</div>
                </div>
              ) : null}

              {/* Show message if no performance data */}
              {(!benchmarking || benchmarking.totalComparable === 0 || profileViews < 10) &&
               (!predictions || predictions.dailyAverage < 10) && (
                <div className="text-center py-4 text-tastelanc-text-muted text-sm">
                  Performance data will appear once you reach 10+ daily views
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Stackable Tips */}
        {visibleTips.length > 0 && (
          <div className="space-y-2">
            {visibleTips.map((tip, index) => {
              const isQuickWin = 'estimate' in tip;
              const priority = isQuickWin ? 'high' : (tip as Recommendation).priority;
              const priorityColors = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-500' };

              return (
                <Card key={index} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full ${priorityColors[priority]} flex-shrink-0 mt-1.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-tastelanc-text-primary font-medium text-sm mb-1">
                        {isQuickWin ? tip.action : (tip as Recommendation).message}
                      </p>
                      <Link
                        href={isQuickWin ? '/dashboard/photos' : (tip as Recommendation).action}
                        className="inline-flex items-center gap-1 text-tastelanc-accent hover:text-tastelanc-accent-hover text-xs font-medium"
                      >
                        {isQuickWin ? 'Start' : (tip as Recommendation).actionLabel} →
                      </Link>
                    </div>
                    <button
                      onClick={() => dismissTip(allTips.indexOf(tip))}
                      className="p-1 hover:bg-tastelanc-surface rounded transition-colors flex-shrink-0"
                      title="Dismiss"
                    >
                      <X className="w-3 h-3 text-tastelanc-text-muted" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
