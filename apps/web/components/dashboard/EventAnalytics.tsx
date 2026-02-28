'use client';

import { useState, useEffect } from 'react';
import { Eye, MousePointerClick, Layers, TrendingUp, TrendingDown, BarChart3, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';

interface EventAnalyticsData {
  stats: {
    eventViews: number;
    viewsTrend: number;
    eventClicks: number;
    clicksTrend: number;
    eventImpressions: number;
    impressionsTrend: number;
    activeEvents: number;
    engagementRate: number;
  };
  weeklyViews: Array<{ day: string; views: number }>;
  eventsByType: Array<{ type: string; count: number }>;
}

const TYPE_LABELS: Record<string, string> = {
  live_music: 'Live Music',
  dj: 'DJ Night',
  trivia: 'Trivia',
  karaoke: 'Karaoke',
  comedy: 'Comedy',
  sports: 'Sports',
  bingo: 'Bingo',
  other: 'Special Event',
};

export default function EventAnalytics() {
  const { buildApiUrl } = useRestaurant();
  const [data, setData] = useState<EventAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/dashboard/event-analytics'));
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Error fetching event analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [buildApiUrl]);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5">
            <div className="h-4 bg-tastelanc-surface rounded w-24 mb-3" />
            <div className="h-8 bg-tastelanc-surface rounded w-16" />
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { stats, weeklyViews } = data;
  const maxViews = Math.max(...weeklyViews.map((d) => d.views), 1);

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
    if (value < 0) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
    return null;
  };

  const trendColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-500';
  };

  const statCards = [
    {
      label: 'Event Impressions',
      value: stats.eventImpressions,
      trend: stats.impressionsTrend,
      icon: Layers,
      subtitle: 'Shown in app (30d)',
    },
    {
      label: 'Event Views',
      value: stats.eventViews,
      trend: stats.viewsTrend,
      icon: Eye,
      subtitle: 'Detail page views (30d)',
    },
    {
      label: 'Event Clicks',
      value: stats.eventClicks,
      trend: stats.clicksTrend,
      icon: MousePointerClick,
      subtitle: 'User interactions (30d)',
    },
    {
      label: 'Engagement Rate',
      value: stats.engagementRate,
      trend: 0,
      icon: BarChart3,
      subtitle: 'Clicks / Views',
      isPercentage: true,
    },
  ];

  // Don't show analytics if there's no data at all
  const hasAnyData = stats.eventViews > 0 || stats.eventClicks > 0 || stats.eventImpressions > 0;

  if (!hasAnyData && stats.activeEvents === 0) return null;

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-xs">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stat.isPercentage ? `${stat.value}%` : stat.value.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-tastelanc-surface rounded-lg">
                  <Icon className="w-4 h-4 text-tastelanc-accent" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {stat.trend !== 0 && (
                  <>
                    <TrendIcon value={stat.trend} />
                    <span className={`text-xs ${trendColor(stat.trend)}`}>
                      {stat.trend > 0 ? '+' : ''}{stat.trend}%
                    </span>
                  </>
                )}
                <span className="text-xs text-gray-500">{stat.subtitle}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Mini Chart */}
      {hasAnyData && (
        <Card className="p-5">
          <h4 className="text-sm font-medium text-gray-400 mb-4">Event Views This Week</h4>
          {weeklyViews.every((d) => d.views === 0) ? (
            <p className="text-gray-500 text-sm py-4 text-center">
              No event views this week yet
            </p>
          ) : (
            <div className="flex items-end justify-between h-24 gap-2">
              {weeklyViews.map((dayData) => (
                <div key={dayData.day} className="flex flex-col items-center flex-1 justify-end h-full">
                  <div
                    className="w-full bg-tastelanc-accent/80 rounded-t transition-all hover:bg-tastelanc-accent"
                    style={{ height: `${Math.max((dayData.views / maxViews) * 100, 4)}%` }}
                    title={`${dayData.views} views`}
                  />
                  <span className="text-xs text-gray-500 mt-1.5">{dayData.day}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
