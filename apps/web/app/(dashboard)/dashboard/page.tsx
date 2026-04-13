'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Phone,
  Globe,
  MapPin,
  Share2,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  Heart,
  Calendar,
  Layers,
  X,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  HelpCircle,
  ArrowRight,
  Mail
} from 'lucide-react';
import { Card, Badge, Tooltip } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useTierAccess } from '@/components/TierGate';
import { PartyInviteCard } from './components/PartyInviteCard';

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
  emailSubscribers: number;
}

interface ProfileCompletion {
  percentage: number;
  band: string;
  updatedAt: string | null;
  items: { label: string; completed: boolean; action?: string; maxPoints: number }[];
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
  const [showCharts, setShowCharts] = useState(false);
  const [dismissedTips, setDismissedTips] = useState<number[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
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

  // Fetch Elite recommendations
  useEffect(() => {
    async function fetchRecommendations() {
      if (!restaurantId || !hasElite) return;
      try {
        const response = await fetch(buildApiUrl(`/api/dashboard/insights?restaurant_id=${restaurantId}`));
        if (!response.ok) throw new Error('Failed to fetch insights');
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error('Error fetching insights:', err);
      }
    }
    fetchRecommendations();
  }, [restaurantId, buildApiUrl, hasElite]);

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
          <h2 className="text-lg font-semibold text-tastelanc-text-primary mb-2">Couldn&apos;t load dashboard</h2>
          <p className="text-tastelanc-text-muted text-sm mb-6">
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

  // Tips and recommendations
  const quickWins = analyticsData?.quickWins || [];
  const allTips = [...quickWins.slice(0, 3), ...recommendations.slice(0, 3)].slice(0, 5);
  const visibleTips = allTips.filter((_, index) => !dismissedTips.includes(index));

  const dismissTip = (index: number) => {
    setDismissedTips([...dismissedTips, index]);
  };

  // Performance config
  const trendConfig = analyticsData?.predictions?.trend ? {
    growing: { icon: <TrendingUp className="w-4 h-4" />, label: 'Growing', color: 'text-green-600' },
    declining: { icon: <TrendingDown className="w-4 h-4" />, label: 'Declining', color: 'text-red-600' },
    stable: { icon: <Activity className="w-4 h-4" />, label: 'Stable', color: 'text-tastelanc-text-secondary' },
  }[analyticsData.predictions.trend] : null;

  const performanceConfig = analyticsData?.benchmarking?.performanceLabel ? {
    excellent: { label: 'Excellent', color: 'text-green-600' },
    good: { label: 'Above Average', color: 'text-blue-600' },
    average: { label: 'Average', color: 'text-tastelanc-text-secondary' },
    needs_improvement: { label: 'Growing', color: 'text-amber-600' },
  }[analyticsData.benchmarking.performanceLabel] : null;

  // Shareable deep link to app
  const shareableLink = restaurant?.slug
    ? `tastelanc://restaurant/${restaurant.slug}`
    : null;

  const copyShareableLink = () => {
    if (shareableLink) {
      navigator.clipboard.writeText(shareableLink);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Party Invite Card - Collapsible (at top) */}
      {restaurantId && (
        <PartyInviteCard restaurantId={restaurantId} buildApiUrl={buildApiUrl} />
      )}

      {/* 2. Shareable Link - Compact */}
      {shareableLink && (
        <div className="flex items-center gap-3 px-2 py-1.5 bg-tastelanc-surface/50 rounded border border-tastelanc-border/50">
          <Tooltip content="Share this link to open your restaurant directly in the TasteLanc app. Perfect for social media, email signatures, and marketing materials." position="bottom">
            <span className="text-xs text-tastelanc-text-muted shrink-0 cursor-help flex items-center gap-1">
              App Link <HelpCircle className="w-3 h-3" />
            </span>
          </Tooltip>
          <code className="text-xs text-tastelanc-text-primary font-mono flex-1 truncate">{shareableLink}</code>
          <button
            onClick={copyShareableLink}
            className="px-3 py-1 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white text-xs font-medium rounded transition-colors shrink-0"
          >
            Copy
          </button>
        </div>
      )}

      {/* 3. Stats Header with Stacked Tips Cards and Refresh */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-tastelanc-text-primary shrink-0">Overview</h2>

        {/* Stacked Tips Cards - Deck Style with Square Edges */}
        {visibleTips.length > 0 && (
          <div className="relative flex-1 h-14 max-w-2xl">
            {visibleTips.map((tip, index) => {
              const isQuickWin = 'estimate' in tip;
              const priority = isQuickWin ? 'high' : tip.priority;
              const priorityColors = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-500' };
              const isTop = index === visibleTips.length - 1;

              return (
                <div
                  key={allTips.indexOf(tip)}
                  className="absolute inset-0 bg-tastelanc-surface border border-tastelanc-border p-3 flex items-center gap-3 transition-all duration-300"
                  style={{
                    zIndex: isTop ? 10 : visibleTips.length - index,
                    transform: `translateY(${(visibleTips.length - 1 - index) * 2}px)`,
                    opacity: isTop ? 1 : 0.7
                  }}
                >
                  <div className={`w-2 h-2 ${priorityColors[priority]} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-tastelanc-text-primary font-medium text-sm">
                      {isQuickWin ? tip.action : tip.message}
                    </p>
                  </div>
                  <Link
                    href={isQuickWin ? '/dashboard/photos' : tip.action}
                    className="text-tastelanc-accent hover:text-tastelanc-accent-hover text-sm font-medium shrink-0"
                  >
                    Start →
                  </Link>
                  <button
                    onClick={() => dismissTip(allTips.indexOf(tip))}
                    className="p-1 hover:bg-tastelanc-surface-light transition-colors shrink-0"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4 text-tastelanc-text-muted" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => fetchAll(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-tastelanc-text-muted hover:text-tastelanc-text-primary rounded-lg hover:bg-tastelanc-surface-light transition-colors disabled:opacity-50 shrink-0"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* 3. Main Grid: Stats (left 2/3) + Performance (right 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stats Grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-6">
              <Tooltip content="Total number of times users have viewed your restaurant profile in the last 30 days. This includes all page visits from the app." position="top">
                <div className="flex items-center gap-2 mb-2 cursor-help">
                  <Eye className="w-4 h-4 text-tastelanc-accent" />
                  <span className="text-xs text-tastelanc-text-muted">Views</span>
                  <HelpCircle className="w-3 h-3 text-tastelanc-text-faint" />
                </div>
              </Tooltip>
              <p className="text-2xl font-bold text-tastelanc-text-primary">{(stats?.profileViews30d ?? 0).toLocaleString()}</p>
              <p className={`text-xs mt-1 ${stats?.profileViewsChange?.startsWith('+') ? 'text-green-400' : 'text-tastelanc-text-faint'}`}>
                {stats?.profileViewsChange || '+0%'}
              </p>
            </Card>

            <Card className="p-6">
              <Tooltip content="Number of times your restaurant appeared in user feeds, search results, and browse sections in the last 30 days. Higher impressions = more visibility." position="top">
                <div className="flex items-center gap-2 mb-2 cursor-help">
                  <Layers className="w-4 h-4 text-tastelanc-accent" />
                  <span className="text-xs text-tastelanc-text-muted">Impressions</span>
                  <HelpCircle className="w-3 h-3 text-tastelanc-text-faint" />
                </div>
              </Tooltip>
              <p className="text-2xl font-bold text-tastelanc-text-primary">{(stats?.impressions30d ?? 0).toLocaleString()}</p>
              <p className={`text-xs mt-1 ${stats?.impressionsChange?.startsWith('+') ? 'text-green-400' : 'text-tastelanc-text-faint'}`}>
                {stats?.impressionsChange || '+0%'}
              </p>
            </Card>

            <Card className="p-6">
              <Tooltip content="Total number of users who have added your restaurant to their favorites list. Favorited restaurants appear at the top of users' feeds." position="top">
                <div className="flex items-center gap-2 mb-2 cursor-help">
                  <Heart className="w-4 h-4 text-tastelanc-accent" />
                  <span className="text-xs text-tastelanc-text-muted">Favorites</span>
                  <HelpCircle className="w-3 h-3 text-tastelanc-text-faint" />
                </div>
              </Tooltip>
              <p className="text-2xl font-bold text-tastelanc-text-primary">{stats?.favorites ?? 0}</p>
              <p className="text-xs mt-1 text-tastelanc-text-faint">All time</p>
            </Card>

            <Card className="p-6">
              <Tooltip content="Number of email subscribers you've uploaded. Use email campaigns to announce specials, events, and send exclusive deals directly to your customers." position="top">
                <div className="flex items-center gap-2 mb-2 cursor-help">
                  <Mail className="w-4 h-4 text-tastelanc-accent" />
                  <span className="text-xs text-tastelanc-text-muted">Email List</span>
                  <HelpCircle className="w-3 h-3 text-tastelanc-text-faint" />
                </div>
              </Tooltip>
              <p className="text-2xl font-bold text-tastelanc-text-primary">{stats?.emailSubscribers ?? 0}</p>
              <p className="text-xs mt-1 text-tastelanc-text-faint">Subscribers</p>
            </Card>
          </div>

          {/* Email List CTA - Show if no subscribers */}
          {(stats?.emailSubscribers ?? 0) === 0 && (
            <Card className="p-4 bg-tastelanc-surface-light border-tastelanc-accent/30 mt-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-tastelanc-accent shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-tastelanc-text-primary mb-1">
                    Build Your Email List
                  </h4>
                  <p className="text-xs text-tastelanc-text-muted mb-3">
                    Upload your existing customer emails to send targeted campaigns and announcements.
                  </p>
                  <Link
                    href={buildNavHref('/dashboard/marketing')}
                    className="inline-flex items-center gap-1 text-tastelanc-accent hover:text-tastelanc-accent-hover text-sm font-medium"
                  >
                    Upload Email List <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Performance Summary */}
        {hasPremium && (
          <div className="lg:col-span-1">
            <Card className="p-6 h-full">
              <Tooltip content="Track how your restaurant performs compared to similar venues. Includes ranking, trends, user actions, and forecasts based on your data." position="left">
                <div className="flex items-center gap-2 mb-4 cursor-help">
                  <BarChart3 className="w-5 h-5 text-tastelanc-accent" />
                  <h3 className="text-base font-bold text-tastelanc-text-primary">Performance</h3>
                  <HelpCircle className="w-3.5 h-3.5 text-tastelanc-text-faint" />
                </div>
              </Tooltip>

              <div className="space-y-4">
                {/* Key Metrics Grid */}
                {analyticsData?.benchmarking && analyticsData.benchmarking.totalComparable > 0 && (stats?.profileViews30d ?? 0) >= 10 ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Tooltip content={`You're in the top ${100 - analyticsData.benchmarking.percentile}% of restaurants in your category based on views and engagement.`} position="top">
                      <div className="bg-tastelanc-surface rounded p-3 cursor-help">
                        <div className="text-xs text-tastelanc-text-muted mb-1 flex items-center gap-1">
                          Ranking <HelpCircle className="w-2.5 h-2.5" />
                        </div>
                        <div className="text-xl font-bold text-tastelanc-text-primary">{analyticsData.benchmarking.percentile}%</div>
                        <div className={`text-xs mt-0.5 font-medium ${performanceConfig?.color}`}>
                          {performanceConfig?.label}
                        </div>
                      </div>
                    </Tooltip>

                    {analyticsData?.predictions && analyticsData.predictions.dailyAverage >= 10 && (
                      <Tooltip content={`Your views are ${analyticsData.predictions.trend === 'growing' ? 'increasing' : analyticsData.predictions.trend === 'declining' ? 'decreasing' : 'holding steady'} based on recent activity patterns.`} position="top">
                        <div className="bg-tastelanc-surface rounded p-3 cursor-help">
                          <div className="text-xs text-tastelanc-text-muted mb-1 flex items-center gap-1">
                            Trend <HelpCircle className="w-2.5 h-2.5" />
                          </div>
                          <div className={`flex items-center gap-1.5 ${trendConfig?.color || 'text-tastelanc-text-primary'}`}>
                            {trendConfig?.icon}
                            <span className="text-lg font-bold">{trendConfig?.label}</span>
                          </div>
                          <div className="text-xs mt-0.5 text-tastelanc-text-muted">
                            {Math.round(analyticsData.predictions.dailyAverage)} / day
                          </div>
                        </div>
                      </Tooltip>
                    )}
                  </div>
                ) : null}

                {/* 7-Day Impressions Chart */}
                {dailyImpressions.length > 0 && (
                  <div>
                    <Tooltip content="Visual chart showing how many times your restaurant appeared in the app over the last 7 days. Taller bars = more visibility." position="top">
                      <div className="text-xs text-tastelanc-text-muted mb-2 cursor-help flex items-center gap-1">
                        Last 7 Days Impressions <HelpCircle className="w-2.5 h-2.5" />
                      </div>
                    </Tooltip>
                    <div className="flex items-end justify-between gap-1 h-24">
                      {dailyImpressions.slice(-7).map((day, i) => {
                        const heightPercent = (day.impressions / maxImpressions) * 100;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex items-end justify-center h-20">
                              <div
                                className="w-full bg-tastelanc-accent rounded-t transition-all"
                                style={{ height: `${Math.max(heightPercent, 5)}%` }}
                                title={`${day.impressions} impressions`}
                              />
                            </div>
                            <span className="text-[9px] text-tastelanc-text-faint">
                              {day.day.slice(0, 3)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Click Breakdown */}
                {clickTypes.length > 0 && clickTypes.some(c => c.count > 0) && (
                  <div>
                    <Tooltip content="See what actions users take most often when viewing your profile. Phone calls, website visits, and directions show strong engagement." position="top">
                      <div className="text-xs text-tastelanc-text-muted mb-2 cursor-help flex items-center gap-1">
                        Top Actions <HelpCircle className="w-2.5 h-2.5" />
                      </div>
                    </Tooltip>
                    <div className="space-y-2">
                      {clickTypes
                        .filter(c => c.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 3)
                        .map((click, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <click.icon className="w-3.5 h-3.5 text-tastelanc-text-secondary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="w-full bg-tastelanc-surface rounded-full h-1.5">
                                <div
                                  className="bg-tastelanc-accent h-1.5 rounded-full transition-all"
                                  style={{ width: `${(click.count / totalClicksForPercentage) * 100}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-xs text-tastelanc-text-primary font-medium shrink-0">
                              {click.count}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Forecast */}
                {analyticsData?.predictions && analyticsData.predictions.dailyAverage >= 10 && (
                  <Tooltip content="AI-powered prediction of how many profile views you'll receive in the next 30 days based on your current trends and historical data." position="top">
                    <div className="pt-2 border-t border-tastelanc-border cursor-help">
                      <div className="text-xs text-tastelanc-text-muted mb-1 flex items-center gap-1">
                        Next 30 Days Forecast <HelpCircle className="w-2.5 h-2.5" />
                      </div>
                      <div className="text-2xl font-bold text-tastelanc-text-primary">
                        {analyticsData.predictions.next30Days.toLocaleString()}
                      </div>
                      <div className="text-xs mt-0.5 text-tastelanc-text-muted">Projected views</div>
                    </div>
                  </Tooltip>
                )}

                {/* Show message if no performance data */}
                {(!analyticsData?.benchmarking || analyticsData.benchmarking.totalComparable === 0 || (stats?.profileViews30d ?? 0) < 10) &&
                 (!analyticsData?.predictions || analyticsData.predictions.dailyAverage < 10) &&
                 dailyImpressions.length === 0 && (
                  <div className="text-center py-4 text-tastelanc-text-muted text-sm">
                    Performance data will appear once you reach 10+ daily views
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* 4. Visibility Score */}
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
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {profileCompletion?.items.map((item, index) => (
            <li key={index}>
              <Tooltip
                content={item.action || `You've completed: ${item.label}`}
                position="top"
              >
                <div className="flex items-center gap-2 text-sm cursor-help">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center ${item.completed ? 'bg-green-500' : 'bg-tastelanc-surface-light'}`}>
                    <span className={`text-xs ${item.completed ? 'text-white' : 'text-tastelanc-text-muted'}`}>
                      {item.completed ? '✓' : '○'}
                    </span>
                  </span>
                  <span className={item.completed ? 'text-tastelanc-text-secondary' : 'text-tastelanc-text-faint'}>
                    {item.label}
                  </span>
                </div>
              </Tooltip>
            </li>
          ))}
        </ul>
        <Link
          href={buildNavHref('/dashboard/profile')}
          className="inline-flex items-center gap-1 text-tastelanc-accent hover:underline mt-4 text-sm"
        >
          Boost your visibility <ArrowRight className="w-4 h-4" />
        </Link>
      </Card>

      {/* Charts Row - Collapsible */}
      {hasPremium && analyticsData && (
        <div>
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="flex items-center gap-2 text-tastelanc-text-secondary hover:text-tastelanc-text-primary mb-4 text-sm font-medium"
          >
            {showCharts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showCharts ? 'Hide' : 'Show'} Detailed Charts
          </button>

          {showCharts && (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Weekly Impressions Chart */}
              <Card className="p-6">
                  <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-6">Weekly Impressions</h3>
                  {dailyImpressions.every(d => d.impressions === 0) ? (
                    <div className="h-48 flex items-center justify-center text-tastelanc-text-faint">
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
                          <span className="text-xs text-tastelanc-text-muted mt-2 flex-shrink-0">{dayData.day}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Click Breakdown */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-6">User Interactions</h3>
                  {analyticsData.stats.totalClicks === 0 ? (
                    <div className="h-48 flex items-center justify-center text-tastelanc-text-faint">
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
                              <span className="text-tastelanc-text-secondary flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {click.type}
                              </span>
                              <span className="text-tastelanc-text-muted">{click.count.toLocaleString()}</span>
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
            )}
          </div>
        )}


      {/* Subscription CTA */}
      {!restaurant?.stripe_subscription_id && (
        <Card className="p-6 border border-lancaster-gold/30">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Badge variant="gold" className="mb-2">Upgrade Available</Badge>
              <h3 className="text-lg font-semibold text-tastelanc-text-primary">Unlock Premium Features</h3>
              <p className="text-tastelanc-text-muted text-sm mt-1">
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
