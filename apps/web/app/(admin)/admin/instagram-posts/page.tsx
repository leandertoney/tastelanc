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
  Sun,
  Moon,
  RefreshCw,
  Zap,
  Loader2,
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
}

interface Stats {
  total: number;
  published: number;
  drafts: number;
  failed: number;
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  tonight_today: 'Happy Hours & Specials',
  upcoming_events: 'Events',
  weekend_preview: 'Weekend Preview',
  category_roundup: 'Category Roundup',
};

const CONTENT_TYPE_COLORS: Record<string, string> = {
  tonight_today: 'bg-blue-500/20 text-blue-400',
  upcoming_events: 'bg-purple-500/20 text-purple-400',
  weekend_preview: 'bg-orange-500/20 text-orange-400',
  category_roundup: 'bg-green-500/20 text-green-400',
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
  const [marketSlug, setMarketSlug] = useState('lancaster-pa');

  // Show 2 weeks: 14 days
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

  const prevPeriod = () => setWeekStart(addDays(weekStart, -14));
  const nextPeriod = () => setWeekStart(addDays(weekStart, 14));
  const goToday = () => setWeekStart(getSunday(new Date()));

  const generateForDate = async (dateKey: string, slot: 'am' | 'pm') => {
    const contentType = slot === 'am' ? 'tonight_today' : 'upcoming_events';
    setGeneratingDay(`${dateKey}-${slot}`);
    try {
      const res = await fetch('/api/instagram/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_slug: marketSlug,
          force_type: contentType,
          post_slot: slot,
          preview_only: true,
          target_date: dateKey,
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
      alert('Failed to generate preview');
    } finally {
      setGeneratingDay(null);
    }
  };

  const generateWeek = async (startDate: Date) => {
    setGeneratingWeek(true);
    const days = Array.from({ length: 7 }, (_, i) => formatDateKey(addDays(startDate, i)));

    for (const dateKey of days) {
      // Check if posts already exist for this day
      const existing = posts.filter(p => p.post_date === dateKey);
      const hasAm = existing.some(p => p.post_slot === 'am');
      const hasPm = existing.some(p => p.post_slot === 'pm');

      try {
        if (!hasAm) {
          await fetch('/api/instagram/cron', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              market_slug: marketSlug,
              force_type: 'tonight_today',
              post_slot: 'am',
              preview_only: true,
              target_date: dateKey,
            }),
          });
        }
        if (!hasPm) {
          await fetch('/api/instagram/cron', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              market_slug: marketSlug,
              force_type: 'upcoming_events',
              post_slot: 'pm',
              preview_only: true,
              target_date: dateKey,
            }),
          });
        }
      } catch (error) {
        console.error(`Error generating for ${dateKey}:`, error);
      }
    }

    await fetchPosts();
    setGeneratingWeek(false);
  };

  const approveAll = async (postIds: string[]) => {
    await Promise.all(
      postIds.map(id =>
        fetch(`/api/admin/instagram-posts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' }),
        })
      )
    );
    fetchPosts();
  };

  // Group posts by date
  const postsByDate: Record<string, Post[]> = {};
  for (const post of posts) {
    const key = post.post_date;
    if (!postsByDate[key]) postsByDate[key] = [];
    postsByDate[key].push(post);
  }

  // Two weeks of days
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
      {/* Header + Stats + Nav — compact single row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
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
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {stats?.published || 0} published</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> {stats?.drafts || 0} drafts</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {stats?.failed || 0} failed</span>
          </div>
        </div>

        {/* Period Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevPeriod}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-white min-w-[220px] text-center">
            {week1Label} – {week2Label}
          </h2>
          <button
            onClick={nextPeriod}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => { setIsLoading(true); fetchPosts(); }}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
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
        onApproveAll={approveAll}
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
        onApproveAll={approveAll}
      />

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
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
            // Approve first if still draft
            if (post.status === 'draft') {
              await fetch(`/api/admin/instagram-posts/${post.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' }),
              });
            }
            // Trigger publish immediately
            await fetch('/api/instagram/publish-approved', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                source: 'pg_cron',
                market_slug: marketSlug,
                post_slot: post.post_slot,
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
  onApproveAll,
}: {
  label: string;
  days: Date[];
  today: string;
  postsByDate: Record<string, Post[]>;
  generatingDay: string | null;
  generatingWeek: boolean;
  onGenerateDay: (dateKey: string, slot: 'am' | 'pm') => void;
  onGenerateWeek: () => void;
  onSelectPost: (post: Post) => void;
  onApproveAll: (postIds: string[]) => void;
}) {
  // Count empty and draft slots
  const emptySlots = days.reduce((count, day) => {
    const dateKey = formatDateKey(day);
    const dayPosts = postsByDate[dateKey] || [];
    if (!dayPosts.some(p => p.post_slot === 'am')) count++;
    if (!dayPosts.some(p => p.post_slot === 'pm')) count++;
    return count;
  }, 0);

  const draftPosts = days.flatMap(day => {
    const dateKey = formatDateKey(day);
    return (postsByDate[dateKey] || []).filter(p => p.status === 'draft');
  });

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-xs font-semibold text-gray-400">{label}</h3>
        <div className="flex items-center gap-2">
          {draftPosts.length > 0 && (
            <button
              onClick={() => onApproveAll(draftPosts.map(p => p.id))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Approve All ({draftPosts.length})
            </button>
          )}
          {emptySlots > 0 && (
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
              {generatingWeek ? 'Generating...' : `Generate Week (${emptySlots} empty)`}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const dateKey = formatDateKey(day);
          const isToday = dateKey === today;
          const dayPosts = postsByDate[dateKey] || [];
          const amPost = dayPosts.find(p => p.post_slot === 'am');
          const pmPost = dayPosts.find(p => p.post_slot === 'pm');

          return (
            <div
              key={dateKey}
              className={`rounded-lg border flex flex-col ${
                isToday
                  ? 'border-tastelanc-accent bg-tastelanc-accent/5'
                  : 'border-tastelanc-surface-light bg-tastelanc-surface'
              }`}
            >
              {/* Day header */}
              <div className={`px-2 py-1 border-b ${isToday ? 'border-tastelanc-accent/30' : 'border-tastelanc-surface-light'}`}>
                <div className="flex items-baseline gap-1.5">
                  <p className={`text-sm font-bold ${isToday ? 'text-tastelanc-accent' : 'text-white'}`}>
                    {day.getDate()}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-gray-500">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                </div>
              </div>

              {/* Slots */}
              <div className="flex-1 p-1.5 space-y-1.5">
                <PostSlotCard
                  post={amPost}
                  slot="am"
                  dateKey={dateKey}
                  generating={generatingDay === `${dateKey}-am`}
                  onClick={() => amPost ? onSelectPost(amPost) : onGenerateDay(dateKey, 'am')}
                />
                <PostSlotCard
                  post={pmPost}
                  slot="pm"
                  dateKey={dateKey}
                  generating={generatingDay === `${dateKey}-pm`}
                  onClick={() => pmPost ? onSelectPost(pmPost) : onGenerateDay(dateKey, 'pm')}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostSlotCard({ post, slot, dateKey, generating, onClick }: {
  post?: Post;
  slot: string;
  dateKey: string;
  generating: boolean;
  onClick: () => void;
}) {
  if (!post) {
    return (
      <button
        onClick={onClick}
        disabled={generating}
        className="w-full rounded-lg border border-dashed border-tastelanc-surface-light hover:border-tastelanc-accent/40 p-1.5 text-center transition-colors disabled:opacity-50"
      >
        {generating ? (
          <Loader2 className="w-4 h-4 animate-spin text-tastelanc-accent mx-auto" />
        ) : (
          <>
            <p className="text-[10px] uppercase text-gray-600 flex items-center justify-center gap-1">
              {slot === 'am' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
              {slot === 'am' ? '11:30 AM' : '5:30 PM'}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to generate</p>
          </>
        )}
      </button>
    );
  }

  const statusBadgeConfig =
    post.status === 'published' ? { label: 'Published', className: 'bg-green-500/20 text-green-400', Icon: CheckCircle }
    : post.status === 'approved' ? { label: 'Queued', className: 'bg-blue-500/20 text-blue-400', Icon: Clock }
    : post.status === 'failed' ? { label: 'Failed', className: 'bg-red-500/20 text-red-400', Icon: AlertTriangle }
    : { label: 'Draft', className: 'bg-yellow-500/20 text-yellow-400', Icon: null };

  const typeColor = CONTENT_TYPE_COLORS[post.content_type] || 'bg-gray-500/20 text-gray-400';

  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-tastelanc-surface-light hover:border-tastelanc-accent/50 p-1.5 text-left transition-colors group"
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] uppercase text-gray-500 flex items-center gap-1">
          {slot === 'am' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          {slot.toUpperCase()}
        </span>
        <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full ${statusBadgeConfig.className}`}>
          {statusBadgeConfig.Icon && <statusBadgeConfig.Icon className="w-2.5 h-2.5" />}
          {statusBadgeConfig.label}
        </span>
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

      <span className={`inline-block text-[9px] font-medium px-1.5 py-0.5 rounded ${typeColor}`}>
        {post.content_type === 'tonight_today' ? 'HH/Specials' : post.content_type === 'upcoming_events' ? 'Events' : post.content_type}
      </span>
    </button>
  );
}

function PostDetailModal({ post, onClose, onStatusChange, onPublishNow }: {
  post: Post;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onPublishNow: (post: Post) => void;
}) {
  const statusBadge =
    post.status === 'published'
      ? <Badge variant="accent" className="bg-green-500/20 text-green-400">Published</Badge>
      : post.status === 'approved'
      ? <Badge variant="accent" className="bg-blue-500/20 text-blue-400">Approved</Badge>
      : post.status === 'failed'
      ? <Badge variant="accent" className="bg-red-500/20 text-red-400">Failed</Badge>
      : <Badge variant="default">Draft</Badge>;

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
              <h2 className="text-xl font-bold text-white">
                {CONTENT_TYPE_LABELS[post.content_type] || post.content_type}
              </h2>
              {statusBadge}
            </div>
            <p className="text-sm text-gray-400">
              {new Date(post.post_date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              {' '}&middot;{' '}
              {post.post_slot === 'am' ? '11:30 AM' : '5:30 PM'} ET
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none px-2"
          >
            &times;
          </button>
        </div>

        {/* Slide Previews */}
        {post.media_urls?.length > 0 && (
          <div className="p-6 border-b border-tastelanc-surface-light">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
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
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Caption</h3>
          <div className="bg-tastelanc-surface-light rounded-lg p-4">
            <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">
              {post.caption || 'No caption generated'}
            </p>
          </div>
        </div>

        {/* Meta + Actions */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-gray-500 space-y-1">
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
                  <span className="text-white font-semibold">{post.engagement_metrics.likes} likes</span>
                )}
                {post.engagement_metrics.comments != null && (
                  <span className="text-white font-semibold">{post.engagement_metrics.comments} comments</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(post.status === 'draft' || post.status === 'approved') && (
              <button
                onClick={() => onPublishNow(post)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                <Zap className="w-4 h-4" />
                Publish Now
              </button>
            )}
            {post.status === 'draft' && (
              <button
                onClick={() => onStatusChange(post.id, 'approved')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
            )}
            {post.status === 'approved' && (
              <button
                onClick={() => onStatusChange(post.id, 'draft')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                Unapprove
              </button>
            )}
            {(post.status === 'draft' || post.status === 'approved') && (
              <button
                onClick={() => onStatusChange(post.id, 'draft')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-tastelanc-surface-light hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
              >
                Regenerate
              </button>
            )}
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
