'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  Heart,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  Phone,
  Globe,
  MapPin,
  Share2,
  ArrowUp,
  ArrowDown,
  Crown,
  Award,
  Layers,
  Crosshair,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useTierAccess } from '@/components/TierGate';

interface DashboardStats {
  profileViews: number;
  viewsChange: string;
  favorites: number;
  favoritesChange: string;
  upcomingEvents: number;
  weeklyViews: number;
  weeklyChange: string;
  happyHourViews: number;
  happyHourChange: string;
  menuViews: number;
  menuChange: string;
}

interface ProfileCompletion {
  percentage: number;
  items: { label: string; completed: boolean }[];
}

interface AnalyticsData {
  stats: {
    totalViews: number;
    totalViewsPrevious: number;
    viewsTrend: number;
    uniqueVisitors: number;
    favorites: number;
    totalClicks: number;
    lifetimeViews: number;
    todayViews: number;
    thisWeekViews: number;
    upcomingEvents: number;
    happyHourViews: number;
    menuViews: number;
    tierName: string;
    impressionsThisWeek: number;
    avgPosition: number | null;
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
  dailyImpressions: Array<{ day: string; impressions: number }>;
  impressionsBySection: Array<{ section: string; count: number }>;
  conversionFunnel: {
    impressions: number;
    clicks: number;
    detailViews: number;
    clickRate: number;
    viewRate: number;
  };
}

export default function DashboardPage() {
  const { restaurant, restaurantId, isLoading: contextLoading, buildApiUrl } = useRestaurant();
  const searchParams = useSearchParams();
  const adminMode = searchParams.get('admin_mode') === 'true';
  const adminRestaurantId = searchParams.get('restaurant_id');
  const hasPremium = useTierAccess('premium');
  const hasElite = useTierAccess('elite');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profileCompletion, setProfileCompletion] = useState<ProfileCompletion | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const buildNavHref = (href: string) => {
    if (adminMode && adminRestaurantId) {
      return `${href}?admin_mode=true&restaurant_id=${adminRestaurantId}`;
    }
    return href;
  };

  useEffect(() => {
    if (!restaurantId || !restaurant) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(buildApiUrl('/api/dashboard/overview-stats'));
        if (!response.ok) throw new Error('Failed to fetch overview stats');
        const data = await response.json();
        setStats(data.stats);
        setProfileCompletion(data.profileCompletion);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
      setIsLoading(false);
    };

    const fetchAnalytics = async () => {
      if (!hasPremium) {
        setAnalyticsLoading(false);
        return;
      }
      setAnalyticsLoading(true);
      try {
        const response = await fetch(buildApiUrl(`/api/dashboard/analytics?restaurant_id=${restaurant.id}`));
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        setAnalyticsData(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
      setAnalyticsLoading(false);
    };

    fetchStats();
    fetchAnalytics();
  }, [restaurantId, restaurant, buildApiUrl, hasPremium]);

  const quickActions = [
    { label: 'Add Happy Hour', href: buildNavHref('/dashboard/happy-hours'), icon: Clock },
    { label: 'Create Event', href: buildNavHref('/dashboard/events'), icon: Calendar },
    { label: 'Add Special', href: buildNavHref('/dashboard/specials'), icon: Sparkles },
  ];

  if (contextLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-tastelanc-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statsDisplay = [
    { label: 'Profile Views', value: stats?.profileViews.toLocaleString() || '0', change: stats?.viewsChange || '0%', icon: Eye },
    { label: 'Favorites', value: stats?.favorites.toLocaleString() || '0', change: stats?.favoritesChange || '0%', icon: Heart },
    { label: 'Happy Hour Views', value: stats?.happyHourViews.toLocaleString() || '0', change: stats?.happyHourChange || '0%', icon: Clock },
    { label: 'Menu Views', value: stats?.menuViews.toLocaleString() || '0', change: stats?.menuChange || '0%', icon: Sparkles },
  ];

  // Analytics chart data
  const weeklyViews = analyticsData?.weeklyViews || [];
  const maxViews = Math.max(...weeklyViews.map((d) => d.views), 1);
  const clickTypes = analyticsData ? [
    { type: 'Phone Calls', count: analyticsData.clicksByType.phone, icon: Phone },
    { type: 'Website Visits', count: analyticsData.clicksByType.website, icon: Globe },
    { type: 'Get Directions', count: analyticsData.clicksByType.directions, icon: MapPin },
    { type: 'Shares', count: analyticsData.clicksByType.share, icon: Share2 },
  ] : [];
  const totalClicksForPercentage = clickTypes.reduce((sum, c) => sum + c.count, 1);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-tastelanc-accent to-tastelanc-accent-hover p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome back!</h2>
        <p className="text-white/80">
          Here&apos;s what&apos;s happening with {restaurant?.name || 'your restaurant'} today.
        </p>
      </Card>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsDisplay.map((stat) => {
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
                <p className={`text-sm mt-2 ${stat.change.startsWith('+') && stat.change !== '+0%' ? 'text-green-400' : 'text-gray-500'}`}>
                  {stat.change} from last week
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Analytics Section - Premium+ */}
      {hasPremium && (
        <>
          {analyticsLoading ? (
            <div className="grid lg:grid-cols-2 gap-8">
              {[1, 2].map((i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-4 bg-tastelanc-surface rounded w-40 mb-6" />
                  <div className="h-48 bg-tastelanc-surface rounded" />
                </Card>
              ))}
            </div>
          ) : analyticsData && (
            <>
              {/* Charts Row */}
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
                  {analyticsData.stats.totalClicks === 0 ? (
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

              {/* Conversion Funnel */}
              {analyticsData.conversionFunnel && analyticsData.conversionFunnel.impressions > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-6">Conversion Funnel (30d)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white">{analyticsData.conversionFunnel.impressions.toLocaleString()}</p>
                      <p className="text-gray-400 text-sm mt-1">Impressions</p>
                    </div>
                    <div className="text-center relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-600 text-xs">
                        {analyticsData.conversionFunnel.clickRate}%
                      </div>
                      <p className="text-3xl font-bold text-white">{analyticsData.conversionFunnel.clicks.toLocaleString()}</p>
                      <p className="text-gray-400 text-sm mt-1">Clicks</p>
                    </div>
                    <div className="text-center relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-600 text-xs">
                        {analyticsData.conversionFunnel.viewRate}%
                      </div>
                      <p className="text-3xl font-bold text-white">{analyticsData.conversionFunnel.detailViews.toLocaleString()}</p>
                      <p className="text-gray-400 text-sm mt-1">Detail Views</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-1 h-3 rounded-full overflow-hidden">
                    <div className="bg-blue-500 flex-1 rounded-l-full" />
                    <div className="bg-tastelanc-accent" style={{ flex: Math.max(analyticsData.conversionFunnel.clickRate / 100, 0.05) }} />
                    <div className="bg-green-500 rounded-r-full" style={{ flex: Math.max((analyticsData.conversionFunnel.viewRate * analyticsData.conversionFunnel.clickRate) / 10000, 0.02) }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>Seen in app</span>
                    <span>Clicked</span>
                    <span>Viewed profile</span>
                  </div>
                </Card>
              )}

              {/* Recent Activity */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                {analyticsData.recentActivity && analyticsData.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {analyticsData.recentActivity.map((activity, i) => (
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
        </>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-4 bg-tastelanc-card rounded-lg hover:bg-tastelanc-surface-light transition-colors group"
              >
                <div className="p-2 bg-tastelanc-surface rounded-lg">
                  <Icon className="w-5 h-5 text-tastelanc-accent" />
                </div>
                <span className="text-white">{action.label}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-white transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Profile Completion */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Profile Completion</h3>
            <Badge variant="accent">{profileCompletion?.percentage || 0}%</Badge>
          </div>
          <div className="w-full bg-tastelanc-surface rounded-full h-2 mb-4">
            <div
              className="bg-tastelanc-accent h-2 rounded-full transition-all"
              style={{ width: `${profileCompletion?.percentage || 0}%` }}
            />
          </div>
          <ul className="space-y-2">
            {profileCompletion?.items.map((item, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${item.completed ? 'bg-green-500' : 'bg-gray-600'}`}>
                  <span className={`text-xs ${item.completed ? 'text-white' : 'text-gray-400'}`}>
                    {item.completed ? '✓' : '○'}
                  </span>
                </span>
                <span className={item.completed ? 'text-gray-300' : 'text-gray-500'}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={buildNavHref('/dashboard/profile')}
            className="inline-flex items-center gap-1 text-tastelanc-accent hover:underline mt-4 text-sm"
          >
            Complete your profile <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>

        {/* Alerts & Tips */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Tips & Alerts</h3>
          <div className="space-y-4">
            {stats?.upcomingEvents === 0 && (
              <div className="flex gap-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-200 text-sm font-medium">Add some events!</p>
                  <p className="text-yellow-200/70 text-xs mt-1">
                    Restaurants with events get more engagement from visitors.
                  </p>
                </div>
              </div>
            )}
            <div className="flex gap-3 p-3 bg-tastelanc-surface rounded-lg">
              <Sparkles className="w-5 h-5 text-tastelanc-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-200 text-sm font-medium">Pro tip: Add happy hour specials</p>
                <p className="text-gray-400 text-xs mt-1">
                  Restaurants with happy hours get 3x more engagement.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-tastelanc-surface rounded-lg">
              <Calendar className="w-5 h-5 text-tastelanc-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-200 text-sm font-medium">Schedule recurring events</p>
                <p className="text-gray-400 text-xs mt-1">
                  Weekly trivia nights and live music attract regulars.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Subscription CTA */}
      {!restaurant?.stripe_subscription_id && (
        <Card className="p-6 border border-lancaster-gold/30">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Badge variant="gold" className="mb-2">Upgrade Available</Badge>
              <h3 className="text-lg font-semibold text-white">Unlock Premium Features</h3>
              <p className="text-gray-400 text-sm mt-1">
                Get analytics, priority placement, and more with a premium subscription.
              </p>
            </div>
            <Link
              href={buildNavHref('/dashboard/subscription')}
              className="inline-flex items-center justify-center bg-lancaster-gold hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              View Plans
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
