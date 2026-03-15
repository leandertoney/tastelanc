'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Play,
  Eye,
  Heart,
  TrendingUp,
  Clock,
  Film,
  Users,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import Image from 'next/image';

interface RecommendationItem {
  id: string;
  thumbnailUrl: string | null;
  caption: string | null;
  captionTag: string | null;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  isPinned: boolean;
  createdAt: string;
  author: {
    displayName: string;
    avatarUrl: string | null;
  };
}

interface TopItem {
  id: string;
  caption: string | null;
  captionTag: string | null;
  viewCount: number;
  likeCount: number;
  author: string;
}

interface RecommendationsData {
  stats: {
    totalVideos: number;
    totalViews: number;
    totalLikes: number;
    totalDuration: number;
    avgViews: number;
    avgLikes: number;
    thisWeekRecs: number;
    recsChange: string;
  };
  recommendations: RecommendationItem[];
  topByViews: TopItem[];
  topByLikes: TopItem[];
}

const TAG_LABELS: Record<string, string> = {
  must_try_dish: 'Must-Try Dish',
  best_vibes: 'Best Vibes',
  hidden_gem: 'Hidden Gem',
  date_night: 'Date Night',
  great_value: 'Great Value',
  best_drinks: 'Best Drinks',
  family_friendly: 'Family Friendly',
  late_night: 'Late Night Spot',
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

export default function RecommendationsPage() {
  const { restaurant, restaurantId, isLoading: contextLoading, buildApiUrl } = useRestaurant();
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!restaurantId || !restaurant) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        buildApiUrl(`/api/dashboard/recommendations?restaurant_id=${restaurantId}`)
      );
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('Failed to load recommendation analytics');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, restaurant, buildApiUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (contextLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-tastelanc-text-muted">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-tastelanc-surface rounded-lg text-tastelanc-text-primary hover:bg-tastelanc-surface-light transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { stats } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-tastelanc-text-primary">Community Recommendations</h1>
        <p className="text-tastelanc-text-muted mt-1">
          Video recommendations from your community on the Pulse feed
        </p>
      </div>

      {/* Ownership disclaimer */}
      <div className="flex items-start gap-3 bg-tastelanc-surface/50 border border-tastelanc-surface-light rounded-lg px-4 py-3">
        <Info className="w-5 h-5 text-tastelanc-accent shrink-0 mt-0.5" />
        <p className="text-sm text-tastelanc-text-muted">
          Community recommendations are user-generated content owned and moderated by{' '}
          <span className="text-tastelanc-text-primary font-medium">{restaurant?.name ? 'TasteLanc' : 'TasteLanc'}</span>.
          Videos cannot be edited or removed by business owners.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Film className="w-5 h-5" />}
          label="Total Videos"
          value={stats.totalVideos}
          subtext={stats.thisWeekRecs > 0 ? `${stats.thisWeekRecs} this week` : undefined}
        />
        <StatCard
          icon={<Eye className="w-5 h-5" />}
          label="Total Views"
          value={stats.totalViews.toLocaleString()}
          subtext={`${stats.avgViews} avg per video`}
        />
        <StatCard
          icon={<Heart className="w-5 h-5" />}
          label="Total Likes"
          value={stats.totalLikes.toLocaleString()}
          subtext={`${stats.avgLikes} avg per video`}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Total Watch Time"
          value={formatDuration(stats.totalDuration)}
          subtext={`Across ${stats.totalVideos} videos`}
        />
      </div>

      {/* Top Performing */}
      {(data.topByViews.length > 0 || data.topByLikes.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.topByViews.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-tastelanc-accent" />
                Most Viewed
              </h3>
              <div className="space-y-3">
                {data.topByViews.map((item, idx) => (
                  <TopItemRow key={item.id} item={item} rank={idx + 1} metric="views" />
                ))}
              </div>
            </Card>
          )}
          {data.topByLikes.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-400" />
                Most Liked
              </h3>
              <div className="space-y-3">
                {data.topByLikes.map((item, idx) => (
                  <TopItemRow key={item.id} item={item} rank={idx + 1} metric="likes" />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* All Recommendations Grid */}
      {data.recommendations.length > 0 ? (
        <div>
          <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-tastelanc-accent" />
            All Recommendations ({data.recommendations.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {data.recommendations.map((rec) => (
              <RecCard key={rec.id} rec={rec} />
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Film className="w-12 h-12 text-tastelanc-text-faint mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-2">No recommendations yet</h3>
          <p className="text-tastelanc-text-muted text-sm max-w-md mx-auto">
            When community members post video recommendations for your restaurant on the Pulse feed,
            they&apos;ll appear here with view and like analytics.
          </p>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-tastelanc-text-muted mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-tastelanc-text-primary">{value}</div>
      {subtext && <p className="text-xs text-tastelanc-text-faint mt-1">{subtext}</p>}
    </Card>
  );
}

function TopItemRow({
  item,
  rank,
  metric,
}: {
  item: TopItem;
  rank: number;
  metric: 'views' | 'likes';
}) {
  const tagLabel = item.captionTag ? TAG_LABELS[item.captionTag] : null;
  const metricValue = metric === 'views' ? item.viewCount : item.likeCount;
  const metricIcon = metric === 'views'
    ? <Eye className="w-3.5 h-3.5 text-tastelanc-text-faint" />
    : <Heart className="w-3.5 h-3.5 text-red-400" />;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-tastelanc-surface-light last:border-0">
      <span className="text-sm font-bold text-tastelanc-text-faint w-6 text-center">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-tastelanc-text-primary truncate">
          {tagLabel || item.caption || 'No caption'}
        </p>
        <p className="text-xs text-tastelanc-text-faint">by {item.author}</p>
      </div>
      <div className="flex items-center gap-1 text-sm text-tastelanc-text-muted">
        {metricIcon}
        <span>{metricValue.toLocaleString()}</span>
      </div>
    </div>
  );
}

function RecCard({ rec }: { rec: RecommendationItem }) {
  const tagLabel = rec.captionTag ? TAG_LABELS[rec.captionTag] : null;

  return (
    <Card className="overflow-hidden group">
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] bg-black">
        {rec.thumbnailUrl ? (
          <Image
            src={rec.thumbnailUrl}
            alt={rec.caption || 'Video recommendation'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-tastelanc-surface">
            <Play className="w-8 h-8 text-tastelanc-text-faint" />
          </div>
        )}
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white">
          {formatDuration(rec.durationSeconds)}
        </div>
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <Play className="w-8 h-8 text-white" />
        </div>
      </div>
      {/* Info */}
      <div className="p-3 space-y-1.5">
        {tagLabel && (
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-tastelanc-accent bg-tastelanc-accent/10 px-2 py-0.5 rounded-full">
            {tagLabel}
          </span>
        )}
        {rec.caption && (
          <p className="text-xs text-tastelanc-text-secondary line-clamp-2">{rec.caption}</p>
        )}
        <div className="flex items-center justify-between text-[10px] text-tastelanc-text-faint">
          <span>{rec.author.displayName}</span>
          <span>{timeAgo(rec.createdAt)}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-tastelanc-text-faint pt-1">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {rec.viewCount}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" /> {rec.likeCount}
          </span>
        </div>
      </div>
    </Card>
  );
}
