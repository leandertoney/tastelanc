'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Phone,
  Globe,
  MapPin,
  Share2,
  Layers,
  Crown,
  Lightbulb,
  RefreshCw,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { Card, Badge, Tooltip } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useTierAccess } from '@/components/TierGate';

interface DashboardStats {
  impressions30d: number;
  impressionsChange: string;
  profileViews: number;
  profileViews30d: number;
  profileViewsChange: string;
  viewsChange: string;
  conversionRate: number;
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

const DASHBOARD_REFRESH_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const buildNavHref = (href: string) => {
    if (adminMode && adminRestaurantId) {
      return `${href}?admin_mode=true&restaurant_id=${adminRestaurantId}`;
    }
    return href;
  };

  const fetchAll = useCallback(async (silent = false) => {
    if (!restaurantId || !restaurant) return;

    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setFetchError(false);

    let statsOk = false;
    try {
      const response = await fetch(buildApiUrl('/api/dashboard/overview-stats'));
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setProfileCompletion(data.profileCompletion);
        statsOk = true;
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
    if (!statsOk && !silent) setFetchError(true);
    if (!silent) setIsLoading(false);

    if (hasPremium) {
      if (!silent) setAnalyticsLoading(true);
      try {
        const response = await fetch(buildApiUrl('/api/dashboard/analytics'));
        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
      if (!silent) setAnalyticsLoading(false);
    } else {
      setAnalyticsLoading(false);
    }

    setIsRefreshing(false);
  }, [restaurantId, restaurant, buildApiUrl, hasPremium]);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(() => fetchAll(true), DASHBOARD_REFRESH_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchAll]);

  if (contextLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  if (fetchError && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Couldn&apos;t load dashboard</h2>
          <p className="text-gray-400 text-sm mb-6">
            We had trouble fetching your dashboard data. Please check your connection and try again.
          </p>
          <button
            onClick={() => fetchAll()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statsDisplay = [
    {
      label: 'Impressions',
      value: (stats?.impressions30d ?? 0).toLocaleString(),
      change: stats?.impressionsChange || '+0%',
      changePeriod: 'from last week',
      subtitle: 'Last 30 days',
      icon: Layers,
    },
    {
      label: 'Profile Views',
      value: (stats?.profileViews30d ?? 0).toLocaleString(),
      change: stats?.profileViewsChange || '+0%',
      changePeriod: 'vs prev 30 days',
      subtitle: stats?.conversionRate ? `${stats.conversionRate}% from impressions` : undefined,
      icon: Eye,
    },
    {
      label: 'Happy Hour Views',
      value: (stats?.happyHourViews ?? 0).toLocaleString(),
      change: stats?.happyHourChange || '+0%',
      changePeriod: 'from last week',
      subtitle: undefined,
      icon: Clock,
    },
    {
      label: 'Favorites',
      value: (stats?.favorites ?? 0).toLocaleString(),
      change: stats?.favoritesChange || '+0%',
      changePeriod: 'from last week',
      subtitle: undefined,
      icon: Heart,
    },
  ];

  // Analytics chart data
  const dailyImpressions = analyticsData?.dailyImpressions || [];
  const maxImpressions = Math.max(...dailyImpressions.map((d) => d.impressions), 1);
  const clickTypes = analyticsData ? [
    { type: 'Phone Calls', count: analyticsData.clicksByType.phone, icon: Phone },
    { type: 'Website Visits', count: analyticsData.clicksByType.website, icon: Globe },
    { type: 'Get Directions', count: analyticsData.clicksByType.directions, icon: MapPin },
    { type: 'Shares', count: analyticsData.clicksByType.share, icon: Share2 },
  ] : [];
  const totalClicksForPercentage = clickTypes.reduce((sum, c) => sum + c.count, 1);

  return (
    <div className="space-y-8">
      {/* Stats Header with Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Overview</h2>
        <button
          onClick={() => fetchAll(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-tastelanc-surface-light transition-colors disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

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
                  {stat.change} {stat.changePeriod}
                </p>
              )}
              {stat.subtitle && (
                <p className="text-sm text-tastelanc-accent">{stat.subtitle}</p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Market Insights Teaser */}
      {!hasElite ? (
        <Card className="relative" style={{ minHeight: '280px' }}>
          <div className="blur-md pointer-events-none select-none p-6" aria-hidden="true">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full border-4 border-tastelanc-surface-light flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">73</span>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Menu Items</span>
                  <div className="flex gap-4">
                    <span className="text-white font-medium">5</span>
                    <span className="text-gray-500">28 avg</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Happy Hours</span>
                  <div className="flex gap-4">
                    <span className="text-white font-medium">1</span>
                    <span className="text-gray-500">4 avg</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Events</span>
                  <div className="flex gap-4">
                    <span className="text-white font-medium">0</span>
                    <span className="text-gray-500">3 avg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-tastelanc-bg/60 backdrop-blur-sm rounded-lg">
            <div className="text-center px-6 py-6">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Market Insights</h3>
              <p className="text-gray-400 text-sm mb-4 max-w-xs mx-auto">
                See how you compare to competitors and get AI-powered growth recommendations.
              </p>
              <Link
                href={buildNavHref('/dashboard/subscription')}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm transition-colors bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-black"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Elite
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-tastelanc-accent" />
              Market Insights
            </h3>
            <Link
              href={buildNavHref('/dashboard/insights')}
              className="text-tastelanc-accent hover:underline text-sm flex items-center gap-1"
            >
              View Full Insights <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Check your visibility score, see how you compare to top performers, and get growth recommendations.
          </p>
        </Card>
      )}

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
              {/* Conversion Funnel - Top of Analytics */}
              {analyticsData.conversionFunnel && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    Conversion Funnel (30d)
                    <Tooltip content="How users discover your restaurant: Impressions (seen in listings) → Detail Views (clicked your page) → Actions (called, visited website, etc.)" position="right">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-600 hover:text-gray-400 cursor-help" />
                    </Tooltip>
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white">{analyticsData.conversionFunnel.impressions.toLocaleString()}</p>
                      <p className="text-gray-400 text-sm mt-1">Seen in App</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white">{analyticsData.conversionFunnel.detailViews.toLocaleString()}</p>
                      <p className="text-gray-400 text-sm mt-1">Viewed Profile</p>
                      <p className="text-tastelanc-accent text-xs mt-0.5">
                        {analyticsData.conversionFunnel.impressions > 0
                          ? `${Math.round((analyticsData.conversionFunnel.detailViews / analyticsData.conversionFunnel.impressions) * 1000) / 10}%`
                          : '0%'} of impressions
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white">{analyticsData.conversionFunnel.clicks.toLocaleString()}</p>
                      <p className="text-gray-400 text-sm mt-1">Took Action</p>
                      <p className="text-green-400 text-xs mt-0.5">
                        {analyticsData.conversionFunnel.detailViews > 0
                          ? `${Math.round((analyticsData.conversionFunnel.clicks / analyticsData.conversionFunnel.detailViews) * 1000) / 10}%`
                          : '0%'} of views
                      </p>
                    </div>
                  </div>
                  {analyticsData.conversionFunnel.impressions > 0 && (
                    <>
                      <div className="mt-4 flex gap-1 h-3 rounded-full overflow-hidden">
                        <div className="bg-blue-500 flex-1 rounded-l-full" />
                        <div className="bg-tastelanc-accent" style={{ flex: Math.max(analyticsData.conversionFunnel.clickRate / 100, 0.05) }} />
                        <div className="bg-green-500 rounded-r-full" style={{ flex: Math.max((analyticsData.conversionFunnel.viewRate * analyticsData.conversionFunnel.clickRate) / 10000, 0.02) }} />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>Impressions</span>
                        <span>Profile Views</span>
                        <span>Actions</span>
                      </div>
                    </>
                  )}
                </Card>
              )}

              {/* Charts Row */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Weekly Impressions Chart */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-6">Weekly Impressions</h3>
                  {dailyImpressions.every(d => d.impressions === 0) ? (
                    <div className="h-48 flex items-center justify-center text-gray-500">
                      No impressions data yet. Impressions will appear as your restaurant shows up in the app.
                    </div>
                  ) : (
                    <div className="flex items-stretch justify-between h-48 gap-2">
                      {dailyImpressions.map((dayData) => (
                        <div key={dayData.day} className="flex flex-col items-center flex-1 justify-end">
                          <div
                            className="w-full bg-tastelanc-accent rounded-t transition-all hover:bg-tastelanc-accent-hover"
                            style={{ height: `${Math.max((dayData.impressions / maxImpressions) * 100, 4)}%` }}
                            title={`${dayData.impressions} impressions`}
                          />
                          <span className="text-xs text-gray-400 mt-2 flex-shrink-0">{dayData.day}</span>
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
            </>
          )}
        </>
      )}

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Profile Completion */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              Profile Completion
              <Tooltip content="Complete every item to maximize your visibility in the app. Restaurants with full profiles get more views and favorites from users." position="top">
                <HelpCircle className="w-3.5 h-3.5 text-gray-600 hover:text-gray-400 cursor-help" />
              </Tooltip>
            </h3>
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
