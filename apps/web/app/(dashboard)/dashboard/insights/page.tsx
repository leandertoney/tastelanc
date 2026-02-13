'use client';

import { useEffect, useState } from 'react';
import {
  Lightbulb,
  TrendingUp,
  Flame,
  Heart,
  ArrowRight,
  Crown,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Card, Badge } from '@/components/ui';
import { useTierAccess } from '@/components/TierGate';
import { useRestaurant } from '@/contexts/RestaurantContext';

interface InsightsData {
  visibilityScore: number;
  percentile: number;
  comparisonText: string;
  competitiveSet: {
    category: string;
    city: string;
    totalCount: number;
  };
  benchmarks: {
    you: {
      menuItemCount: number;
      happyHourCount: number;
      activeSpecialsCount: number;
      upcomingEventsCount: number;
      photoCount: number;
      hasDescription: boolean;
      rating: number | null;
    };
    topTenAvg: {
      menuItemCount: number;
      happyHourCount: number;
      activeSpecialsCount: number;
      upcomingEventsCount: number;
      photoCount: number;
      descriptionRate: number;
      rating: number | null;
    };
  } | null;
  trending: Array<{
    name: string;
    badge: 'trending' | 'rising' | 'most_favorited';
    badgeLabel: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    message: string;
    action: string;
    actionLabel: string;
  }>;
}

// --- Circular Score Gauge ---
function ScoreGauge({ score, size = 160 }: { score: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-tastelanc-surface-light"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{score}</span>
        <span className="text-xs text-gray-400 mt-1">/ 100</span>
      </div>
    </div>
  );
}

// --- Benchmark Row ---
function BenchmarkRow({
  label,
  yours,
  topAvg,
  isBoolean,
}: {
  label: string;
  yours: number | boolean;
  topAvg: number;
  isBoolean?: boolean;
}) {
  const yoursNum = typeof yours === 'boolean' ? (yours ? 1 : 0) : yours;
  const maxVal = Math.max(yoursNum, topAvg, 1);
  const meetsOrExceeds = isBoolean ? yours === true : yoursNum >= topAvg;

  return (
    <div className="py-3 border-b border-tastelanc-surface-light last:border-0">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-300">{label}</span>
        <div className="flex items-center gap-4 text-right">
          <span className="text-white font-medium w-16 text-right">
            {isBoolean ? (yours ? 'Yes' : 'No') : yours}
          </span>
          <span className="text-gray-500 w-16 text-right">
            {isBoolean ? `${Math.round(topAvg * 100)}%` : Math.round(topAvg)}
          </span>
        </div>
      </div>
      {!isBoolean && (
        <div className="flex gap-1 h-2">
          <div
            className={`rounded-l-full transition-all ${meetsOrExceeds ? 'bg-green-500' : 'bg-amber-500'}`}
            style={{ width: `${(yoursNum / maxVal) * 50}%` }}
          />
          <div
            className="bg-gray-600 rounded-r-full"
            style={{ width: `${(topAvg / maxVal) * 50}%` }}
          />
        </div>
      )}
      {meetsOrExceeds && !isBoolean && (
        <div className="flex items-center gap-1 mt-1">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span className="text-xs text-green-500">Meeting or exceeding top performers</span>
        </div>
      )}
    </div>
  );
}

// --- Badge component for trending ---
function TrendBadge({ badge }: { badge: 'trending' | 'rising' | 'most_favorited' }) {
  const config = {
    trending: { icon: Flame, label: 'Trending', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    rising: { icon: TrendingUp, label: 'Rising', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    most_favorited: { icon: Heart, label: 'Most Favorited', className: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  };
  const { icon: Icon, label, className } = config[badge];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// --- Priority dot ---
function PriorityDot({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const colors = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-500' };
  return <div className={`w-2 h-2 rounded-full ${colors[priority]} flex-shrink-0 mt-1.5`} />;
}

// --- Blurred Preview (for non-Elite) ---
function BlurredPreview() {
  return (
    <div className="relative">
      {/* Fake content behind blur */}
      <div className="blur-md pointer-events-none select-none space-y-8" aria-hidden="true">
        {/* Fake visibility score */}
        <Card className="p-8">
          <div className="flex items-center gap-8">
            <div className="w-40 h-40 rounded-full border-8 border-tastelanc-surface-light flex items-center justify-center">
              <span className="text-4xl font-bold text-white">73</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Your Visibility Score</h3>
              <p className="text-gray-400 mt-1">Performing better than 68% of Bars in Lancaster</p>
              <p className="text-gray-500 text-sm mt-2">Compared to 14 Bars in Lancaster</p>
            </div>
          </div>
        </Card>

        {/* Fake benchmarks */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">You vs. Top Performers</h3>
          <div className="space-y-3">
            {['Menu Items', 'Happy Hours', 'Specials', 'Events', 'Photos'].map(label => (
              <div key={label} className="flex justify-between py-2">
                <span className="text-gray-300">{label}</span>
                <div className="flex gap-4">
                  <span className="text-white">12</span>
                  <span className="text-gray-500">28</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fake trending */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Trending in Your Category</h3>
          <div className="space-y-3">
            {['Restaurant A', 'Restaurant B', 'Restaurant C'].map(name => (
              <div key={name} className="flex items-center justify-between py-2">
                <span className="text-gray-300">{name}</span>
                <span className="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-400">Trending</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Upsell overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-tastelanc-bg/60 backdrop-blur-sm rounded-lg">
        <div className="max-w-md text-center px-8 py-10">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Unlock Market Insights</h2>
          <p className="text-gray-400 mb-6 leading-relaxed">
            Restaurants using Elite average 2x more visibility. See how you compare, discover what top performers are doing, and get AI-powered growth recommendations.
          </p>
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-colors bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-black"
          >
            <Crown className="w-5 h-5" />
            Upgrade to Elite
          </Link>
          <p className="mt-4 text-gray-500 text-sm">
            Starting at $350 for 3 months
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function MarketInsightsPage() {
  const hasElite = useTierAccess('elite');
  const { restaurant, buildApiUrl } = useRestaurant();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      if (!restaurant?.id || !hasElite) return;

      try {
        setLoading(true);
        const response = await fetch(
          buildApiUrl(`/api/dashboard/insights?restaurant_id=${restaurant.id}`)
        );

        if (!response.ok) {
          throw new Error('Failed to fetch insights');
        }

        const insightsData = await response.json();
        setData(insightsData);
      } catch (err) {
        console.error('Error fetching insights:', err);
        setError('Failed to load market insights');
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [restaurant?.id, buildApiUrl, hasElite]);

  // Non-Elite: show blurred preview
  if (!hasElite) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-6 h-6" />
            Market Insights
          </h2>
          <p className="text-gray-400 mt-1">See how you compare and grow your visibility</p>
        </div>
        <BlurredPreview />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Lightbulb className="w-6 h-6" />
          Market Insights
        </h2>
        <p className="text-gray-400 mt-1">See how you compare and grow your visibility</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {/* Score skeleton */}
          <Card className="p-8 animate-pulse">
            <div className="flex items-center gap-8">
              <div className="w-40 h-40 rounded-full bg-tastelanc-surface" />
              <div className="space-y-3 flex-1">
                <div className="h-6 bg-tastelanc-surface rounded w-48" />
                <div className="h-4 bg-tastelanc-surface rounded w-72" />
                <div className="h-4 bg-tastelanc-surface rounded w-40" />
              </div>
            </div>
          </Card>
          {/* Table skeleton */}
          <Card className="p-6 animate-pulse">
            <div className="h-5 bg-tastelanc-surface rounded w-48 mb-6" />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex justify-between py-3">
                <div className="h-4 bg-tastelanc-surface rounded w-24" />
                <div className="h-4 bg-tastelanc-surface rounded w-32" />
              </div>
            ))}
          </Card>
          {/* More skeletons */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6 animate-pulse">
              <div className="h-5 bg-tastelanc-surface rounded w-48 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 bg-tastelanc-surface rounded" />
                ))}
              </div>
            </Card>
            <Card className="p-6 animate-pulse">
              <div className="h-5 bg-tastelanc-surface rounded w-48 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-tastelanc-surface rounded" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400">{error}</p>
        </Card>
      ) : data ? (
        <>
          {/* SECTION 1: Visibility Score */}
          <Card className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ScoreGauge score={data.visibilityScore} />
              <div className="text-center md:text-left">
                <h3 className="text-xl font-semibold text-white">Your Visibility Score</h3>
                <p className="text-gray-300 mt-2 text-lg">{data.comparisonText}</p>
                <p className="text-gray-500 text-sm mt-2">
                  Compared to {data.competitiveSet.totalCount} {data.competitiveSet.category} in {data.competitiveSet.city}
                </p>
              </div>
            </div>
          </Card>

          {/* SECTION 2 & 3: Benchmarks + Trending (side by side on desktop) */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Content Benchmarks */}
            {data.benchmarks && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">You vs. Top Performers</h3>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>You</span>
                    <span>Top 10 Avg</span>
                  </div>
                </div>
                <div>
                  <BenchmarkRow
                    label="Menu Items"
                    yours={data.benchmarks.you.menuItemCount}
                    topAvg={data.benchmarks.topTenAvg.menuItemCount}
                  />
                  <BenchmarkRow
                    label="Happy Hours"
                    yours={data.benchmarks.you.happyHourCount}
                    topAvg={data.benchmarks.topTenAvg.happyHourCount}
                  />
                  <BenchmarkRow
                    label="Active Specials"
                    yours={data.benchmarks.you.activeSpecialsCount}
                    topAvg={data.benchmarks.topTenAvg.activeSpecialsCount}
                  />
                  <BenchmarkRow
                    label="Upcoming Events"
                    yours={data.benchmarks.you.upcomingEventsCount}
                    topAvg={data.benchmarks.topTenAvg.upcomingEventsCount}
                  />
                  <BenchmarkRow
                    label="Photos"
                    yours={data.benchmarks.you.photoCount}
                    topAvg={data.benchmarks.topTenAvg.photoCount}
                  />
                  <BenchmarkRow
                    label="Description"
                    yours={data.benchmarks.you.hasDescription}
                    topAvg={data.benchmarks.topTenAvg.descriptionRate}
                    isBoolean
                  />
                  {data.benchmarks.you.rating !== null && data.benchmarks.topTenAvg.rating !== null && (
                    <BenchmarkRow
                      label="Rating"
                      yours={data.benchmarks.you.rating}
                      topAvg={data.benchmarks.topTenAvg.rating}
                    />
                  )}
                </div>
              </Card>
            )}

            {/* Trending Now */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Trending in {data.competitiveSet.category} This Week
              </h3>
              {data.trending.length > 0 ? (
                <div className="space-y-3">
                  {data.trending.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3 border-b border-tastelanc-surface-light last:border-0"
                    >
                      <span className="text-gray-300">{item.name}</span>
                      <TrendBadge badge={item.badge} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No trending activity in your category this week.</p>
                  <p className="text-sm mt-1">Check back next week for updates.</p>
                </div>
              )}
            </Card>
          </div>

          {/* SECTION 4: AI Growth Recommendations */}
          {data.recommendations.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-1">Growth Recommendations</h3>
              <p className="text-gray-500 text-sm mb-6">
                Based on what top performers in your category are doing
              </p>
              <div className="space-y-4">
                {data.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 bg-tastelanc-surface rounded-lg"
                  >
                    <PriorityDot priority={rec.priority} />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 text-sm">{rec.message}</p>
                    </div>
                    <Link
                      href={rec.action}
                      className="flex items-center gap-1 text-tastelanc-accent hover:text-tastelanc-accent-hover text-sm font-medium whitespace-nowrap flex-shrink-0"
                    >
                      {rec.actionLabel}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* No recommendations = you're doing great */}
          {data.recommendations.length === 0 && (
            <Card className="p-6 text-center border border-green-500/20">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-1">You&apos;re ahead of the game</h3>
              <p className="text-gray-400">
                Your content matches or exceeds top performers in your category. Keep it up!
              </p>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
