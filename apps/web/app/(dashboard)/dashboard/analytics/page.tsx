'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Eye, Heart, TrendingUp, Users, Phone, Globe, MapPin, Share2, ArrowUp, ArrowDown, Crown, MousePointer } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import Link from 'next/link';
import TierGate, { useTierAccess } from '@/components/TierGate';
import { useRestaurant } from '@/contexts/RestaurantContext';

interface AnalyticsData {
  stats: {
    totalViews: number;
    totalViewsPrevious: number;
    viewsTrend: number;
    uniqueVisitors: number;
    favorites: number;
    totalClicks: number;
  };
  weeklyViews: Array<{ day: string; views: number }>;
  clicksByType: {
    phone: number;
    website: number;
    directions: number;
    menu: number;
    share: number;
    favorite: number;
    happy_hour: number;
    event: number;
  };
  recentActivity: Array<{ action: string; time: string; count: number }>;
}

export default function AnalyticsPage() {
  const hasElite = useTierAccess('elite');
  const { restaurant, buildApiUrl } = useRestaurant();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!restaurant?.id) return;

      try {
        setLoading(true);
        const response = await fetch(buildApiUrl(`/api/dashboard/analytics?restaurant_id=${restaurant.id}`));

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [restaurant?.id, buildApiUrl]);

  const stats = data ? [
    {
      label: 'Profile Views',
      value: data.stats.totalViews.toLocaleString(),
      change: `${data.stats.viewsTrend >= 0 ? '+' : ''}${data.stats.viewsTrend}%`,
      trend: data.stats.viewsTrend >= 0 ? 'up' : 'down',
      icon: Eye,
    },
    {
      label: 'Favorites',
      value: data.stats.favorites.toLocaleString(),
      change: null,
      trend: 'up',
      icon: Heart,
    },
    {
      label: 'Total Clicks',
      value: data.stats.totalClicks.toLocaleString(),
      change: null,
      trend: 'up',
      icon: MousePointer,
    },
    {
      label: 'Unique Visitors',
      value: data.stats.uniqueVisitors.toLocaleString(),
      change: null,
      trend: 'up',
      icon: Users,
    },
  ] : [];

  const weeklyViews = data?.weeklyViews || [];
  const maxViews = Math.max(...weeklyViews.map((d) => d.views), 1);

  const clickTypes = data ? [
    { type: 'Phone Calls', count: data.clicksByType.phone, icon: Phone },
    { type: 'Website Visits', count: data.clicksByType.website, icon: Globe },
    { type: 'Get Directions', count: data.clicksByType.directions, icon: MapPin },
    { type: 'Shares', count: data.clicksByType.share, icon: Share2 },
  ] : [];

  const totalClicksForPercentage = clickTypes.reduce((sum, c) => sum + c.count, 1);

  return (
    <TierGate
      requiredTier="premium"
      feature="Analytics"
      description="Upgrade to Premium to access analytics and track your restaurant's performance on TasteLanc."
    >
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Analytics
          </h2>
          <p className="text-gray-400 mt-1">Track your restaurant&apos;s performance</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Last 30 days</span>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-tastelanc-surface rounded w-24 mb-2" />
              <div className="h-8 bg-tastelanc-surface rounded w-16" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <p className="text-red-400">{error}</p>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">{stat.label}</p>
                      <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                    </div>
                    <div className="p-2 bg-tastelanc-surface rounded-lg">
                      <Icon className="w-5 h-5 text-tastelanc-accent" />
                    </div>
                  </div>
                  {stat.change && (
                    <div className={`flex items-center gap-1 mt-2 text-sm ${
                      stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {stat.trend === 'up' ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )}
                      {stat.change} vs last month
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Charts Section */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Weekly Views Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Weekly Profile Views</h3>
              {weeklyViews.every(d => d.views === 0) ? (
                <div className="h-48 flex items-center justify-center text-gray-500">
                  No views data yet. Views will appear as users interact with your profile.
                </div>
              ) : (
                <div className="flex items-end justify-between h-48 gap-2">
                  {weeklyViews.map((dayData) => (
                    <div key={dayData.day} className="flex flex-col items-center flex-1">
                      <div
                        className="w-full bg-tastelanc-accent rounded-t transition-all hover:bg-tastelanc-accent-hover"
                        style={{ height: `${Math.max((dayData.views / maxViews) * 100, 4)}%` }}
                        title={`${dayData.views} views`}
                      />
                      <span className="text-xs text-gray-400 mt-2">{dayData.day}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Click Breakdown */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6">User Interactions</h3>
              {data?.stats.totalClicks === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-500">
                  No interaction data yet. Clicks will appear as users engage with your listing.
                </div>
              ) : (
                <div className="space-y-4">
                  {clickTypes.map((click) => {
                    const Icon = click.icon;
                    const percentage = Math.round((click.count / totalClicksForPercentage) * 100);
                    return (
                      <div key={click.type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300 flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {click.type}
                          </span>
                          <span className="text-gray-400">{click.count.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-tastelanc-surface rounded-full h-2">
                          <div
                            className="bg-tastelanc-accent h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Elite Features - Show upsell for Premium users who don't have Elite */}
          {!hasElite && (
            <Card className="p-6 border border-yellow-500/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <Badge variant="gold">Elite Feature</Badge>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Unlock Advanced Analytics</h3>
                <p className="text-gray-400 mb-4">
                  Get detailed insights with Elite analytics including:
                </p>
                <ul className="grid sm:grid-cols-2 gap-2 mb-6 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-yellow-500" />
                    Customer demographics
                  </li>
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-yellow-500" />
                    Peak visit times
                  </li>
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-yellow-500" />
                    Comparison with competitors
                  </li>
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-yellow-500" />
                    Conversion tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-yellow-500" />
                    Custom date ranges
                  </li>
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-yellow-500" />
                    Export reports
                  </li>
                </ul>
                <Link
                  href="/dashboard/subscription"
                  className="inline-flex items-center justify-center bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-black font-semibold px-6 py-2 rounded-lg transition-colors"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Elite
                </Link>
              </div>
            </Card>
          )}

          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            {data?.recentActivity && data.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {data.recentActivity.map((activity, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 border-b border-tastelanc-surface-light last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-tastelanc-accent" />
                      <span className="text-gray-300">{activity.action}</span>
                      {activity.count > 1 && (
                        <Badge variant="default">x{activity.count}</Badge>
                      )}
                    </div>
                    <span className="text-gray-500 text-sm">{activity.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No recent activity yet. Activity will appear as users interact with your listing.
              </div>
            )}
          </Card>
        </>
      )}
    </div>
    </TierGate>
  );
}
