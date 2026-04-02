'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Instagram,
  Eye,
  EyeOff,
  Heart,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Send,
  Shield,
  Edit3,
  Trash2,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';

interface Recommendation {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  caption_tag: string | null;
  duration_seconds: number;
  view_count: number;
  like_count: number;
  is_visible: boolean;
  ig_status: string;
  ig_scheduled_at: string | null;
  ig_post_id: string | null;
  ai_review_notes: string | null;
  ig_caption_override: string | null;
  ig_reviewed_by: string | null;
  created_at: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
  restaurant: {
    name: string;
    slug: string;
    market: { slug: string; name: string };
  };
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  ai_approved: { label: 'AI Approved', color: 'bg-blue-500/20 text-blue-400', icon: Shield },
  app_approved: { label: 'Live in App', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  admin_approved: { label: 'Queued for IG', color: 'bg-pink-500/20 text-pink-400', icon: Instagram },
  posted: { label: 'Posted to IG', color: 'bg-purple-500/20 text-purple-400', icon: Instagram },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400', icon: XCircle },
};

export default function RecommendationQueuePage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ai_approved');
  const [marketFilter, setMarketFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set('status', filter);
    if (marketFilter) params.set('market', marketFilter);

    const res = await fetch(`/api/admin/recommendation-queue?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRecs(data.recommendations || []);
    }
    setLoading(false);
  }, [filter, marketFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleAction = async (recId: string, action: 'approve' | 'reject' | 'reset' | 'hide' | 'unhide' | 'delete' | 'post_to_instagram', captionOverride?: string) => {
    setActionLoading(recId);
    const body: Record<string, string> = { recommendation_id: recId, action };
    if (captionOverride) body.ig_caption_override = captionOverride;

    await fetch('/api/admin/recommendation-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setActionLoading(null);
    setEditingCaption(null);
    fetchQueue();
  };

  const getCountdown = (scheduledAt: string | null): string | null => {
    if (!scheduledAt) return null;
    const diff = new Date(scheduledAt).getTime() - Date.now();
    if (diff <= 0) return 'Posting soon...';
    const mins = Math.ceil(diff / 60000);
    return `${mins}m remaining`;
  };

  const filterTabs = [
    { key: 'ai_approved', label: 'AI Approved' },
    { key: 'pending', label: 'Pending' },
    { key: 'app_approved', label: 'Live in App' },
    { key: 'admin_approved', label: 'Queued for IG' },
    { key: 'posted', label: 'Posted' },
    { key: 'rejected', label: 'Rejected' },
    { key: '', label: 'All' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tastelanc-text-primary flex items-center gap-3">
            <Instagram className="w-7 h-7 text-pink-400" />
            Recommendation Queue
          </h1>
          <p className="text-tastelanc-text-muted mt-1">
            Review and approve community video recommendations before they post to Instagram
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="flex items-center gap-2 px-3 py-2 bg-tastelanc-surface rounded-lg text-tastelanc-text-secondary hover:text-tastelanc-text-primary transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-tastelanc-accent text-white'
                : 'bg-tastelanc-surface text-tastelanc-text-muted hover:text-tastelanc-text-primary'
            }`}
          >
            {tab.label}
            {tab.key === 'ai_approved' && recs.length > 0 && filter === 'ai_approved' && (
              <span className="ml-2 bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full text-xs">
                {recs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Market Filter */}
      <div className="flex gap-2">
        {['', 'lancaster-pa', 'cumberland-pa', 'fayetteville-nc'].map((slug) => (
          <button
            key={slug}
            onClick={() => setMarketFilter(slug)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              marketFilter === slug
                ? 'bg-tastelanc-surface-light text-tastelanc-text-primary'
                : 'bg-tastelanc-surface/50 text-tastelanc-text-faint hover:text-tastelanc-text-secondary'
            }`}
          >
            {slug === '' ? 'All Markets' : slug === 'lancaster-pa' ? 'Lancaster' : slug === 'cumberland-pa' ? 'Cumberland' : 'Fayetteville'}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
        </div>
      )}

      {/* Empty State */}
      {!loading && recs.length === 0 && (
        <Card className="p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-2">Queue is clear</h3>
          <p className="text-tastelanc-text-muted text-sm">
            No recommendations in this category right now.
          </p>
        </Card>
      )}

      {/* Queue Items */}
      {!loading && recs.length > 0 && (
        <div className="space-y-4">
          {recs.map((rec) => {
            const status = STATUS_CONFIG[rec.ig_status] || STATUS_CONFIG.pending;
            const StatusIcon = status.icon;
            const countdown = getCountdown(rec.ig_scheduled_at);
            const isEditing = editingCaption === rec.id;

            return (
              <Card key={rec.id} className="p-5">
                <div className="flex gap-5">
                  {/* Video Thumbnail */}
                  <div className="relative w-28 shrink-0">
                    <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
                      {rec.thumbnail_url ? (
                        <img
                          src={rec.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-tastelanc-surface">
                          <Play className="w-6 h-6 text-tastelanc-text-faint" />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-1 right-1 bg-black/70 px-1 py-0.5 rounded text-[9px] font-semibold text-white">
                      {Math.floor(rec.duration_seconds / 60)}:{String(rec.duration_seconds % 60).padStart(2, '0')}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Top row: restaurant + status */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-tastelanc-text-primary font-semibold">{rec.restaurant.name}</h3>
                        <p className="text-xs text-tastelanc-text-faint">
                          {rec.profiles?.display_name || 'Anonymous'} &middot;{' '}
                          {rec.restaurant.market.name} &middot;{' '}
                          {new Date(rec.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                        {!rec.is_visible && rec.ig_status !== 'pending' && rec.ig_status !== 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                            <EyeOff className="w-3 h-3" />
                            Hidden
                          </span>
                        )}
                        {countdown && rec.ig_status === 'ai_approved' && (
                          <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">
                            {countdown}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Caption + tag */}
                    <div>
                      {rec.caption_tag && TAG_LABELS[rec.caption_tag] && (
                        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-tastelanc-accent bg-tastelanc-accent/10 px-2 py-0.5 rounded-full mr-2">
                          {TAG_LABELS[rec.caption_tag]}
                        </span>
                      )}
                      {rec.caption && (
                        <span className="text-sm text-tastelanc-text-secondary">{rec.caption}</span>
                      )}
                    </div>

                    {/* AI Review Notes */}
                    {rec.ai_review_notes && (
                      <div className="flex items-start gap-2 bg-tastelanc-surface/50 rounded-md px-3 py-2">
                        <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-tastelanc-text-muted">{rec.ai_review_notes}</p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-tastelanc-text-faint">
                      <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {rec.view_count}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {rec.like_count}</span>
                      {rec.ig_post_id && (
                        <span className="flex items-center gap-1 text-purple-400">
                          <Instagram className="w-3.5 h-3.5" /> Posted
                        </span>
                      )}
                    </div>

                    {/* Caption editing */}
                    {isEditing && (
                      <div className="space-y-2">
                        <textarea
                          value={captionDraft}
                          onChange={(e) => setCaptionDraft(e.target.value)}
                          className="w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-3 text-sm text-tastelanc-text-primary resize-none"
                          rows={4}
                          placeholder="Override the Instagram caption..."
                        />
                        <div className="flex gap-2">
                          {rec.ig_status === 'app_approved' ? (
                            <button
                              onClick={() => handleAction(rec.id, 'post_to_instagram', captionDraft)}
                              disabled={actionLoading === rec.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-medium rounded-lg hover:from-pink-500 hover:to-purple-500 transition-colors"
                            >
                              <Instagram className="w-3.5 h-3.5" />
                              Post to Instagram with this caption
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(rec.id, 'approve', captionDraft)}
                              disabled={actionLoading === rec.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-500 transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Approve with edited caption
                            </button>
                          )}
                          <button
                            onClick={() => setEditingCaption(null)}
                            className="px-3 py-1.5 text-tastelanc-text-muted text-xs hover:text-tastelanc-text-primary transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons — pending/ai_approved: approve for app or reject */}
                    {!isEditing && ['pending', 'ai_approved'].includes(rec.ig_status) && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleAction(rec.id, 'approve')}
                          disabled={actionLoading === rec.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === rec.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          Approve for App
                        </button>
                        <button
                          onClick={() => handleAction(rec.id, 'reject')}
                          disabled={actionLoading === rec.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-600/30 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            setEditingCaption(rec.id);
                            setCaptionDraft(rec.ig_caption_override || rec.caption || '');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-tastelanc-surface text-tastelanc-text-secondary text-xs font-medium rounded-lg hover:text-tastelanc-text-primary transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit Caption
                        </button>
                      </div>
                    )}

                    {/* Action buttons — app_approved: post to Instagram */}
                    {!isEditing && rec.ig_status === 'app_approved' && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleAction(rec.id, 'post_to_instagram')}
                          disabled={actionLoading === rec.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-medium rounded-lg hover:from-pink-500 hover:to-purple-500 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === rec.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Instagram className="w-3.5 h-3.5" />}
                          Post to Instagram
                        </button>
                        <button
                          onClick={() => {
                            setEditingCaption(rec.id);
                            setCaptionDraft(rec.ig_caption_override || rec.caption || '');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-tastelanc-surface text-tastelanc-text-secondary text-xs font-medium rounded-lg hover:text-tastelanc-text-primary transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit IG Caption
                        </button>
                        <button
                          onClick={() => handleAction(rec.id, 'reject')}
                          disabled={actionLoading === rec.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-600/30 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Remove from App
                        </button>
                      </div>
                    )}

                    {/* Reset for rejected */}
                    {rec.ig_status === 'rejected' && (
                      <button
                        onClick={() => handleAction(rec.id, 'reset')}
                        disabled={actionLoading === rec.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-tastelanc-surface text-tastelanc-text-secondary text-xs font-medium rounded-lg hover:text-tastelanc-text-primary transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset to Pending
                      </button>
                    )}

                    {/* Hide / Unhide / Delete — available on all statuses */}
                    <div className="flex items-center gap-2 pt-1 border-t border-tastelanc-surface-light mt-1">
                      {rec.is_visible ? (
                        <button
                          onClick={() => handleAction(rec.id, 'hide')}
                          disabled={actionLoading === rec.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-tastelanc-surface text-tastelanc-text-secondary text-xs font-medium rounded-lg hover:text-tastelanc-text-primary transition-colors disabled:opacity-50"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          Hide
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(rec.id, 'unhide')}
                          disabled={actionLoading === rec.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-tastelanc-surface text-tastelanc-text-secondary text-xs font-medium rounded-lg hover:text-tastelanc-text-primary transition-colors disabled:opacity-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Unhide
                        </button>
                      )}
                      {deleteConfirm === rec.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-400">Delete permanently?</span>
                          <button
                            onClick={() => { handleAction(rec.id, 'delete'); setDeleteConfirm(null); }}
                            disabled={actionLoading === rec.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === rec.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1.5 text-tastelanc-text-muted text-xs hover:text-tastelanc-text-primary transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(rec.id)}
                          disabled={actionLoading === rec.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 text-red-400 text-xs font-medium rounded-lg hover:bg-red-600/20 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
