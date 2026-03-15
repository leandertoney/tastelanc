'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Eye,
  EyeOff,
  Heart,
  Trash2,
  Loader2,
  Video,
  CheckCircle,
  XCircle,
  Clock,
  Instagram,
  Shield,
} from 'lucide-react';

interface VideoRec {
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
  ig_post_id: string | null;
  ai_review_notes: string | null;
  created_at: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
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

const STATUS_ICONS: Record<string, { icon: typeof Clock; color: string }> = {
  pending: { icon: Clock, color: 'text-yellow-400' },
  ai_approved: { icon: Shield, color: 'text-blue-400' },
  admin_approved: { icon: CheckCircle, color: 'text-green-400' },
  posted: { icon: Instagram, color: 'text-purple-400' },
  rejected: { icon: XCircle, color: 'text-red-400' },
};

export default function AdminRestaurantVideos({ restaurantId }: { restaurantId: string }) {
  const [videos, setVideos] = useState<VideoRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/restaurants/${restaurantId}/videos`);
    if (res.ok) {
      const data = await res.json();
      setVideos(data.videos || []);
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleAction = async (videoId: string, action: 'hide' | 'unhide' | 'delete') => {
    setActionLoading(videoId);
    await fetch(`/api/admin/restaurants/${restaurantId}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_id: videoId, action }),
    });
    setActionLoading(null);
    setDeleteConfirm(null);
    fetchVideos();
  };

  if (loading) {
    return (
      <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-6">
        <h2 className="text-lg font-semibold text-tastelanc-text-primary mb-4 flex items-center gap-2">
          <Video className="w-5 h-5 text-tastelanc-accent" />
          Community Videos
        </h2>
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-tastelanc-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-6">
      <h2 className="text-lg font-semibold text-tastelanc-text-primary mb-4 flex items-center gap-2">
        <Video className="w-5 h-5 text-tastelanc-accent" />
        Community Videos
        {videos.length > 0 && (
          <span className="text-sm font-normal text-tastelanc-text-muted">({videos.length})</span>
        )}
      </h2>

      {videos.length === 0 ? (
        <p className="text-tastelanc-text-muted text-sm py-4">No community videos for this restaurant yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videos.map((video) => {
            const statusConfig = STATUS_ICONS[video.ig_status] || STATUS_ICONS.pending;
            const StatusIcon = statusConfig.icon;

            return (
              <div key={video.id} className="relative group">
                {/* Thumbnail */}
                <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden relative">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-tastelanc-surface-light">
                      <Play className="w-8 h-8 text-tastelanc-text-faint" />
                    </div>
                  )}

                  {/* Overlay badges */}
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                    <StatusIcon className={`w-4 h-4 ${statusConfig.color} drop-shadow`} />
                    {!video.is_visible && (
                      <span className="bg-black/70 text-gray-300 text-[9px] px-1.5 py-0.5 rounded font-medium">
                        Hidden
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-1.5 right-1.5 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white">
                    {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}
                  </div>

                  {/* Stats overlay */}
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-2 text-[10px] text-white drop-shadow">
                    <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {video.view_count}</span>
                    <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {video.like_count}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="mt-2 space-y-1">
                  {video.caption_tag && TAG_LABELS[video.caption_tag] && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-tastelanc-accent">
                      {TAG_LABELS[video.caption_tag]}
                    </span>
                  )}
                  {video.caption && (
                    <p className="text-xs text-tastelanc-text-secondary line-clamp-2">{video.caption}</p>
                  )}
                  <p className="text-[10px] text-tastelanc-text-faint">
                    {video.profiles?.display_name || 'Anonymous'} &middot; {new Date(video.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 mt-2">
                  {video.is_visible ? (
                    <button
                      onClick={() => handleAction(video.id, 'hide')}
                      disabled={actionLoading === video.id}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-tastelanc-surface-light text-tastelanc-text-secondary text-[10px] font-medium rounded hover:text-tastelanc-text-primary transition-colors disabled:opacity-50"
                    >
                      <EyeOff className="w-3 h-3" />
                      Hide
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(video.id, 'unhide')}
                      disabled={actionLoading === video.id}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-tastelanc-surface-light text-tastelanc-text-secondary text-[10px] font-medium rounded hover:text-tastelanc-text-primary transition-colors disabled:opacity-50"
                    >
                      <Eye className="w-3 h-3" />
                      Unhide
                    </button>
                  )}
                  {deleteConfirm === video.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAction(video.id, 'delete')}
                        disabled={actionLoading === video.id}
                        className="flex items-center gap-1 px-2 py-1.5 bg-red-600 text-white text-[10px] font-medium rounded hover:bg-red-500 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === video.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1.5 text-tastelanc-text-muted text-[10px] hover:text-tastelanc-text-primary transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(video.id)}
                      disabled={actionLoading === video.id}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 bg-red-600/10 text-red-400 text-[10px] font-medium rounded hover:bg-red-600/20 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
