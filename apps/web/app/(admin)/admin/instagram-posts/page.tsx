'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Instagram,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  XCircle,
  RefreshCw,
  Zap,
  Loader2,
  Timer,
  Calendar,
  Eye,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';

interface Post {
  id: string;
  market_id: string;
  post_date: string;
  content_type: string;
  post_slot: string;
  caption: string;
  media_urls: string[];
  status: string;
  instagram_permalink: string | null;
  published_at: string | null;
  error_message: string | null;
  engagement_metrics: Record<string, number> | null;
  generation_metadata: Record<string, unknown> | null;
  created_at: string;
  scheduled_publish_at: string | null;
  day_theme: string | null;
}

interface Stats {
  total: number;
  published: number;
  drafts: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  failed: number;
}

const DAY_THEME_LABELS: Record<string, string> = {
  weekly_roundup: 'Weekly Roundup',
  happy_hour_spotlight: 'Happy Hour Spotlight',
  hidden_gems: 'Hidden Gems',
  weekend_preview: 'Weekend Preview',
  specials_deals: 'Specials & Deals',
};

const DAY_THEME_COLORS: Record<string, string> = {
  weekly_roundup: 'bg-indigo-500/20 text-indigo-400',
  happy_hour_spotlight: 'bg-amber-500/20 text-amber-400',
  hidden_gems: 'bg-emerald-500/20 text-emerald-400',
  weekend_preview: 'bg-orange-500/20 text-orange-400',
  specials_deals: 'bg-pink-500/20 text-pink-400',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  tonight_today: 'Happy Hours & Specials',
  upcoming_events: 'Events',
  weekend_preview: 'Weekend Preview',
  category_roundup: 'Category Roundup',
  party_teaser: '🎉 Party Teaser (Apr 20)',
};

// Day themes by weekday (0=Sun, 1=Mon, ..., 6=Sat)
const WEEKDAY_THEMES: Record<number, { theme: string; label: string }> = {
  1: { theme: 'weekly_roundup', label: 'Weekly Roundup' },
  2: { theme: 'happy_hour_spotlight', label: 'Happy Hour Spotlight' },
  3: { theme: 'hidden_gems', label: 'Hidden Gems' },
  4: { theme: 'weekend_preview', label: 'Weekend Preview' },
  5: { theme: 'specials_deals', label: 'Specials & Deals' },
};

function getSunday(d: Date) {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

function formatDateKey(d: Date) {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number) {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function getTimeUntil(isoString: string): string {
  const now = new Date();
  const target = new Date(isoString);
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) return 'now';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

const MARKETS = [
  { slug: 'lancaster-pa', label: 'Lancaster' },
  { slug: 'cumberland-pa', label: 'Cumberland' },
  { slug: 'fayetteville-nc', label: 'Fayetteville' },
];

export default function InstagramPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getSunday(new Date()));
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [generatingDay, setGeneratingDay] = useState<string | null>(null);
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [generatingPartyTeaser, setGeneratingPartyTeaser] = useState(false);
  const [marketSlug, setMarketSlug] = useState('lancaster-pa');

  const periodEnd = addDays(weekStart, 13);
  const weekStartKey = formatDateKey(weekStart);
  const periodEndKey = formatDateKey(periodEnd);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/instagram-posts?start=${weekStartKey}&end=${periodEndKey}&market=${marketSlug}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [weekStartKey, periodEndKey, marketSlug]);

  useEffect(() => {
    setIsLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  // Auto-refresh every 60s to update countdown timers
  useEffect(() => {
    const interval = setInterval(fetchPosts, 60000);
    return () => clearInterval(interval);
  }, [fetchPosts]);

  const prevPeriod = () => setWeekStart(addDays(weekStart, -14));
  const nextPeriod = () => setWeekStart(addDays(weekStart, 14));
  const goToday = () => setWeekStart(getSunday(new Date()));

  const generatePartyTeaserPost = async (targetDate: string) => {
    setGeneratingPartyTeaser(true);
    try {
      const res = await fetch('/api/instagram/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_slug: marketSlug,
          target_date: targetDate,
          force_type: 'party_teaser',
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        fetchPosts();
        alert(`Party teaser generated for ${targetDate}!`);
      }
    } catch (error) {
      console.error('Error generating party teaser:', error);
      alert('Failed to generate party teaser');
    } finally {
      setGeneratingPartyTeaser(false);
    }
  };

  const generateForDate = async (dateKey: string) => {
    setGeneratingDay(dateKey);
    try {
      const res = await fetch('/api/instagram/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_slug: marketSlug,
          target_date: dateKey,
          // Let the cron pick the right theme based on day of week
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        fetchPosts();
      }
    } catch (error) {
      console.error('Error generating:', error);
      alert('Failed to generate post');
    } finally {
      setGeneratingDay(null);
    }
  };

  const generateWeek = async (startDate: Date) => {
    setGeneratingWeek(true);
    // Only generate for weekdays (Mon-Fri)
    for (let i = 0; i < 7; i++) {
      const day = addDays(startDate, i);
      if (!isWeekday(day)) continue;

      const dateKey = formatDateKey(day);
      const existing = posts.find(p => p.post_date === dateKey);
      if (existing) continue; // Skip if post already exists

      try {
        await fetch('/api/instagram/cron', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            market_slug: marketSlug,
            target_date: dateKey,
          }),
        });
      } catch (error) {
        console.error(`Error generating for ${dateKey}:`, error);
      }
    }

    await fetchPosts();
    setGeneratingWeek(false);
  };

  // Group posts by date (take the first/primary post per day)
  const postsByDate: Record<string, Post> = {};
  for (const post of posts) {
    // If multiple posts exist for a day, prefer the most recent
    if (!postsByDate[post.post_date] || new Date(post.created_at) > new Date(postsByDate[post.post_date].created_at)) {
      postsByDate[post.post_date] = post;
    }
  }

  const week1Days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const week2Start = addDays(weekStart, 7);
  const week2Days = Array.from({ length: 7 }, (_, i) => addDays(week2Start, i));
  const today = formatDateKey(new Date());

  const week1Label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  const week2Label = `${week2Start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-tastelanc-accent/30 border-t-tastelanc-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto px-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-tastelanc-text-primary flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-400" />
            Instagram Posts
          </h1>
          <div className="flex items-center bg-tastelanc-surface-light rounded-lg p-0.5">
            {MARKETS.map((m) => (
              <button
                key={m.slug}
                onClick={() => { setMarketSlug(m.slug); setIsLoading(true); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  marketSlug === m.slug
                    ? 'bg-tastelanc-accent text-white'
                    : 'text-tastelanc-text-muted hover:text-tastelanc-text-primary'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-tastelanc-text-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {stats?.published || 0} published</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> {stats?.pendingReview || 0} pending</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> {stats?.approved || 0} approved</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {stats?.rejected || 0} rejected</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={prevPeriod} className="p-1.5 text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-tastelanc-text-primary min-w-[220px] text-center">
            {week1Label} – {week2Label}
          </h2>
          <button onClick={nextPeriod} className="p-1.5 text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-2 py-1 text-xs text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light rounded-lg transition-colors">
            Today
          </button>
          <button
            onClick={() => { setIsLoading(true); fetchPosts(); }}
            className="p-1.5 text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Party Teaser Quick-Generate — April 7–19, 2026 */}
      <div className="bg-gradient-to-r from-[#C84B31]/10 to-transparent border border-[#C84B31]/30 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              🎉 Party Teasers — April 20 Launch Party
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Generate FOMO posts for the Hemp Field Apothecary industry party. Pick a date below.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { date: '2026-04-07', label: 'Apr 7' },
              { date: '2026-04-10', label: 'Apr 10' },
              { date: '2026-04-14', label: 'Apr 14' },
              { date: '2026-04-16', label: 'Apr 16' },
              { date: '2026-04-18', label: 'Apr 18' },
              { date: '2026-04-19', label: 'Apr 19' },
            ].map(({ date: d, label }) => (
              <button
                key={d}
                onClick={() => generatePartyTeaserPost(d)}
                disabled={generatingPartyTeaser}
                className="px-3 py-1.5 bg-[#C84B31]/20 text-[#C84B31] border border-[#C84B31]/40 rounded-lg text-xs font-medium hover:bg-[#C84B31]/30 disabled:opacity-50 transition-colors"
              >
                {generatingPartyTeaser ? '...' : label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Week 1 */}
      <WeekRow
        label={week1Label}
        days={week1Days}
        today={today}
        postsByDate={postsByDate}
        generatingDay={generatingDay}
        generatingWeek={generatingWeek}
        onGenerateDay={generateForDate}
        onGenerateWeek={() => generateWeek(weekStart)}
        onSelectPost={setSelectedPost}
      />

      {/* Week 2 */}
      <WeekRow
        label={week2Label}
        days={week2Days}
        today={today}
        postsByDate={postsByDate}
        generatingDay={generatingDay}
        generatingWeek={generatingWeek}
        onGenerateDay={generateForDate}
        onGenerateWeek={() => generateWeek(week2Start)}
        onSelectPost={setSelectedPost}
      />

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          marketSlug={marketSlug}
          onClose={() => setSelectedPost(null)}
          onStatusChange={async (id, status) => {
            await fetch(`/api/admin/instagram-posts/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status }),
            });
            setSelectedPost(null);
            fetchPosts();
          }}
          onPublishNow={async (post) => {
            if (post.status !== 'approved') {
              await fetch(`/api/admin/instagram-posts/${post.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: 'approved',
                  scheduled_publish_at: new Date().toISOString(),
                }),
              });
            }
            await fetch('/api/instagram/publish-approved', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                source: 'pg_cron',
                market_slug: marketSlug,
              }),
            });
            setSelectedPost(null);
            fetchPosts();
          }}
        />
      )}
    </div>
  );
}

function WeekRow({
  label,
  days,
  today,
  postsByDate,
  generatingDay,
  generatingWeek,
  onGenerateDay,
  onGenerateWeek,
  onSelectPost,
}: {
  label: string;
  days: Date[];
  today: string;
  postsByDate: Record<string, Post>;
  generatingDay: string | null;
  generatingWeek: boolean;
  onGenerateDay: (dateKey: string) => void;
  onGenerateWeek: () => void;
  onSelectPost: (post: Post) => void;
}) {
  const weekdayDays = days.filter(isWeekday);
  const emptyWeekdays = weekdayDays.filter(day => !postsByDate[formatDateKey(day)]);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-xs font-semibold text-tastelanc-text-muted">{label}</h3>
        <div className="flex items-center gap-2">
          {emptyWeekdays.length > 0 && (
            <button
              onClick={onGenerateWeek}
              disabled={generatingWeek}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold rounded-lg transition-colors text-xs disabled:opacity-50"
            >
              {generatingWeek ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              {generatingWeek ? 'Generating...' : `Generate Week (${emptyWeekdays.length} empty)`}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const dateKey = formatDateKey(day);
          const isToday = dateKey === today;
          const weekday = isWeekday(day);
          const post = postsByDate[dateKey];
          const dayOfWeek = day.getDay();
          const themeInfo = WEEKDAY_THEMES[dayOfWeek];

          return (
            <div
              key={dateKey}
              className={`rounded-lg border flex flex-col ${
                !weekday
                  ? 'border-tastelanc-surface-light/50 bg-tastelanc-surface/50 opacity-40'
                  : isToday
                  ? 'border-tastelanc-accent bg-tastelanc-accent/5'
                  : 'border-tastelanc-surface-light bg-tastelanc-surface'
              }`}
            >
              {/* Day header */}
              <div className={`px-2 py-1 border-b ${isToday ? 'border-tastelanc-accent/30' : 'border-tastelanc-surface-light'}`}>
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <p className={`text-sm font-bold ${isToday ? 'text-tastelanc-accent' : 'text-tastelanc-text-primary'}`}>
                      {day.getDate()}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-tastelanc-text-faint">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                  </div>
                  {weekday && themeInfo && (
                    <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded ${DAY_THEME_COLORS[themeInfo.theme] || 'bg-tastelanc-surface-light/50 text-tastelanc-text-faint'}`}>
                      {themeInfo.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Post slot */}
              <div className="flex-1 p-1.5">
                {weekday ? (
                  <DayPostCard
                    post={post}
                    dateKey={dateKey}
                    generating={generatingDay === dateKey}
                    onClick={() => post ? onSelectPost(post) : onGenerateDay(dateKey)}
                  />
                ) : (
                  <div className="text-[9px] text-tastelanc-text-faint text-center py-3">
                    No posts
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayPostCard({ post, dateKey, generating, onClick }: {
  post?: Post;
  dateKey: string;
  generating: boolean;
  onClick: () => void;
}) {
  if (!post) {
    return (
      <button
        onClick={onClick}
        disabled={generating}
        className="w-full rounded-lg border border-dashed border-tastelanc-surface-light hover:border-tastelanc-accent/40 p-2 text-center transition-colors disabled:opacity-50"
      >
        {generating ? (
          <Loader2 className="w-4 h-4 animate-spin text-tastelanc-accent mx-auto" />
        ) : (
          <>
            <Calendar className="w-4 h-4 text-tastelanc-text-faint mx-auto mb-1" />
            <p className="text-[10px] text-tastelanc-text-faint">Click to generate</p>
          </>
        )}
      </button>
    );
  }

  const statusConfig = getStatusConfig(post.status);
  const themeLabel = post.day_theme ? DAY_THEME_LABELS[post.day_theme] : CONTENT_TYPE_LABELS[post.content_type] || post.content_type;
  const themeColor = post.day_theme ? DAY_THEME_COLORS[post.day_theme] : 'bg-tastelanc-surface-light/50 text-tastelanc-text-muted';

  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-tastelanc-surface-light hover:border-tastelanc-accent/50 p-1.5 text-left transition-colors group"
    >
      {/* Status + countdown */}
      <div className="flex items-center justify-between mb-1">
        <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full ${statusConfig.className}`}>
          {statusConfig.Icon && <statusConfig.Icon className="w-2.5 h-2.5" />}
          {statusConfig.label}
        </span>
        {post.scheduled_publish_at && ['pending_review', 'approved'].includes(post.status) && (
          <span className="text-[9px] text-tastelanc-text-faint flex items-center gap-0.5">
            <Timer className="w-2.5 h-2.5" />
            {getTimeUntil(post.scheduled_publish_at)}
          </span>
        )}
      </div>

      {/* Thumbnail */}
      {post.media_urls?.[0] && (
        <div className="relative w-full aspect-[4/3] rounded overflow-hidden mb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.media_urls[0]}
            alt=""
            className="w-full h-full object-cover"
          />
          {post.media_urls.length > 1 && (
            <span className="absolute top-1 right-1 px-1 py-0.5 text-[9px] font-bold bg-black/70 text-white rounded">
              1/{post.media_urls.length}
            </span>
          )}
        </div>
      )}

      <span className={`inline-block text-[9px] font-medium px-1.5 py-0.5 rounded ${themeColor}`}>
        {themeLabel}
      </span>
    </button>
  );
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'published':
      return { label: 'Published', className: 'bg-green-500/20 text-green-400', Icon: CheckCircle };
    case 'approved':
      return { label: 'Approved', className: 'bg-blue-500/20 text-blue-400', Icon: CheckCircle };
    case 'pending_review':
      return { label: 'Pending Review', className: 'bg-amber-500/20 text-amber-400', Icon: Eye };
    case 'rejected':
      return { label: 'Rejected', className: 'bg-red-500/20 text-red-400', Icon: XCircle };
    case 'failed':
      return { label: 'Failed', className: 'bg-red-500/20 text-red-400', Icon: AlertTriangle };
    default:
      return { label: 'Draft', className: 'bg-yellow-500/20 text-yellow-400', Icon: null };
  }
}

function PostDetailModal({ post, marketSlug, onClose, onStatusChange, onPublishNow }: {
  post: Post;
  marketSlug: string;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onPublishNow: (post: Post) => void;
}) {
  const statusConfig = getStatusConfig(post.status);
  const themeLabel = post.day_theme ? DAY_THEME_LABELS[post.day_theme] : null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-tastelanc-surface-light flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-tastelanc-text-primary">
                {themeLabel || CONTENT_TYPE_LABELS[post.content_type] || post.content_type}
              </h2>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusConfig.className}`}>
                {statusConfig.Icon && <statusConfig.Icon className="w-3 h-3" />}
                {statusConfig.label}
              </span>
            </div>
            <p className="text-sm text-tastelanc-text-muted">
              {new Date(post.post_date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              {post.scheduled_publish_at && (
                <>
                  {' '}&middot;{' '}
                  Scheduled: {new Date(post.scheduled_publish_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: 'America/New_York',
                    timeZoneName: 'short',
                  })}
                </>
              )}
            </p>
            {post.scheduled_publish_at && ['pending_review', 'approved'].includes(post.status) && (
              <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                <Timer className="w-3 h-3" />
                Auto-publishes in {getTimeUntil(post.scheduled_publish_at)}
                {post.status === 'pending_review' && ' (unless rejected)'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-tastelanc-text-muted hover:text-tastelanc-text-primary text-2xl leading-none px-2"
          >
            &times;
          </button>
        </div>

        {/* Slide Previews */}
        {post.media_urls?.length > 0 && (
          <div className="p-6 border-b border-tastelanc-surface-light">
            <h3 className="text-sm font-semibold text-tastelanc-text-muted mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Slides ({post.media_urls.length})
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {post.media_urls.map((url, i) => (
                <div key={i} className="flex-shrink-0 w-40 aspect-square rounded-lg overflow-hidden border border-tastelanc-surface-light">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Caption */}
        <div className="p-6 border-b border-tastelanc-surface-light">
          <h3 className="text-sm font-semibold text-tastelanc-text-muted mb-3">Caption</h3>
          <div className="bg-tastelanc-surface-light rounded-lg p-4">
            <p className="text-tastelanc-text-primary text-sm whitespace-pre-wrap leading-relaxed">
              {post.caption || 'No caption generated'}
            </p>
          </div>
        </div>

        {/* Meta + Actions */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-tastelanc-text-faint space-y-1">
            {post.published_at && (
              <p>Published: {new Date(post.published_at).toLocaleString()}</p>
            )}
            {post.error_message && (
              <p className="text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {post.error_message}
              </p>
            )}
            {post.engagement_metrics && Object.keys(post.engagement_metrics).length > 0 && (
              <div className="flex gap-4 mt-2">
                {post.engagement_metrics.likes != null && (
                  <span className="text-tastelanc-text-primary font-semibold">{post.engagement_metrics.likes} likes</span>
                )}
                {post.engagement_metrics.comments != null && (
                  <span className="text-tastelanc-text-primary font-semibold">{post.engagement_metrics.comments} comments</span>
                )}
                {post.engagement_metrics.reach != null && (
                  <span className="text-tastelanc-text-primary font-semibold">{post.engagement_metrics.reach} reach</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Reject / Cancel button — prevents auto-publish */}
            {['pending_review', 'approved', 'draft'].includes(post.status) && post.status !== 'published' && (
              <button
                onClick={() => onStatusChange(post.id, 'rejected')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg transition-colors text-sm font-semibold"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            )}

            {/* Approve button */}
            {['pending_review', 'draft'].includes(post.status) && (
              <button
                onClick={() => onStatusChange(post.id, 'approved')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
            )}

            {/* Publish Now */}
            {['pending_review', 'approved', 'draft'].includes(post.status) && (
              <button
                onClick={() => onPublishNow(post)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                <Zap className="w-4 h-4" />
                Publish Now
              </button>
            )}

            {/* Undo reject */}
            {post.status === 'rejected' && (
              <button
                onClick={() => onStatusChange(post.id, 'pending_review')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                <RefreshCw className="w-4 h-4" />
                Unreject
              </button>
            )}

            {/* View on Instagram */}
            {post.instagram_permalink && (
              <a
                href={post.instagram_permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                View on Instagram
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
