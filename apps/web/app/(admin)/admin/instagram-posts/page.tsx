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
  Eye,
  Calendar,
  Sun,
  Moon,
  RefreshCw,
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

function getMonday(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function formatDateKey(d: Date) {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number) {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

export default function InstagramPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [generating, setGenerating] = useState(false);

  const weekStartKey = formatDateKey(weekStart);
  const weekEnd = addDays(weekStart, 6);
  const weekEndKey = formatDateKey(weekEnd);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/instagram-posts?start=${weekStartKey}&end=${weekEndKey}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [weekStartKey, weekEndKey]);

  useEffect(() => {
    setIsLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToday = () => setWeekStart(getMonday(new Date()));

  const handleGenerate = async (contentType: string) => {
    setGenerating(true);
    try {
      const res = await fetch('/api/instagram/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          force_type: contentType,
          market: 'lancaster-pa',
          dry_run: true,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        alert('Preview generated! Refreshing...');
        fetchPosts();
      }
    } catch (error) {
      console.error('Error generating:', error);
      alert('Failed to generate preview');
    } finally {
      setGenerating(false);
    }
  };

  // Group posts by date
  const postsByDate: Record<string, Post[]> = {};
  for (const post of posts) {
    const key = post.post_date;
    if (!postsByDate[key]) postsByDate[key] = [];
    postsByDate[key].push(post);
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = formatDateKey(new Date());

  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-tastelanc-accent/30 border-t-tastelanc-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Instagram className="w-7 h-7 text-pink-400" />
            Instagram Posts
          </h1>
          <p className="text-gray-400 mt-1 text-sm md:text-base">
            Post calendar and preview for Lancaster
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleGenerate('tonight_today')}
            disabled={generating}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            <Sun className="w-4 h-4" />
            Generate AM
          </button>
          <button
            onClick={() => handleGenerate('upcoming_events')}
            disabled={generating}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            <Moon className="w-4 h-4" />
            Generate PM
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
              <Instagram className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.total || 0}</p>
              <p className="text-xs text-gray-500">Total Posts</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.published || 0}</p>
              <p className="text-xs text-gray-500">Published</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.drafts || 0}</p>
              <p className="text-xs text-gray-500">Drafts</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.failed || 0}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-2 text-gray-400 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-white min-w-[220px] text-center">
            {weekLabel}
          </h2>
          <button
            onClick={nextWeek}
            className="p-2 text-gray-400 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => { setIsLoading(true); fetchPosts(); }}
            className="p-2 text-gray-400 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {days.map((day) => {
          const dateKey = formatDateKey(day);
          const isToday = dateKey === today;
          const dayPosts = postsByDate[dateKey] || [];
          const amPost = dayPosts.find(p => p.post_slot === 'am');
          const pmPost = dayPosts.find(p => p.post_slot === 'pm');

          return (
            <div
              key={dateKey}
              className={`rounded-xl border min-h-[200px] flex flex-col ${
                isToday
                  ? 'border-tastelanc-accent bg-tastelanc-accent/5'
                  : 'border-tastelanc-surface-light bg-tastelanc-surface'
              }`}
            >
              {/* Day header */}
              <div className={`px-3 py-2 border-b ${isToday ? 'border-tastelanc-accent/30' : 'border-tastelanc-surface-light'}`}>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className={`text-lg font-bold ${isToday ? 'text-tastelanc-accent' : 'text-white'}`}>
                  {day.getDate()}
                </p>
              </div>

              {/* Slots */}
              <div className="flex-1 p-2 space-y-2">
                {/* AM Slot */}
                <PostSlotCard post={amPost} slot="am" onClick={() => amPost && setSelectedPost(amPost)} />
                {/* PM Slot */}
                <PostSlotCard post={pmPost} slot="pm" onClick={() => pmPost && setSelectedPost(pmPost)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}

function PostSlotCard({ post, slot, onClick }: { post?: Post; slot: string; onClick: () => void }) {
  if (!post) {
    return (
      <div className="rounded-lg border border-dashed border-tastelanc-surface-light p-2 text-center">
        <p className="text-[10px] uppercase text-gray-600 flex items-center justify-center gap-1">
          {slot === 'am' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          {slot === 'am' ? '11:30 AM' : '5:30 PM'}
        </p>
        <p className="text-[10px] text-gray-600 mt-0.5">Empty</p>
      </div>
    );
  }

  const statusColor =
    post.status === 'published' ? 'bg-green-500'
    : post.status === 'failed' ? 'bg-red-500'
    : 'bg-yellow-500';

  const typeColor = CONTENT_TYPE_COLORS[post.content_type] || 'bg-gray-500/20 text-gray-400';

  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-tastelanc-surface-light hover:border-tastelanc-accent/50 p-2 text-left transition-colors group"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase text-gray-500 flex items-center gap-1">
          {slot === 'am' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          {slot.toUpperCase()}
        </span>
        <span className={`w-2 h-2 rounded-full ${statusColor}`} />
      </div>

      {/* Thumbnail */}
      {post.media_urls?.[0] && (
        <div className="relative w-full aspect-square rounded overflow-hidden mb-1.5">
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

function PostDetailModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const statusBadge =
    post.status === 'published'
      ? <Badge variant="accent" className="bg-green-500/20 text-green-400">Published</Badge>
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
