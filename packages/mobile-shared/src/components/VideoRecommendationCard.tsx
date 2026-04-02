/**
 * VideoRecommendationCard — compact half-width thumbnail tile in the feed.
 * Tapping opens a full-screen portrait modal with video playback,
 * captions, restaurant branding, and TasteLanc/TasteCumberland branding.
 */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  ActionSheetIOS,
  Platform,
  Alert,
  Modal,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getColors, getBrand, getAssets } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius } from '../constants/spacing';
import { CAPTION_TAG_LABELS } from '../types/database';
import { parseVideoUrls } from '../lib/videoRecommendations';
import type { VideoRecommendationWithUser, CaptionTag, CaptionWord, TextOverlay, TextOverlayColor, TextOverlaySize } from '../types/database';

const OVERLAY_COLOR_MAP: Record<TextOverlayColor, string> = {
  white: '#FFFFFF',
  yellow: '#FACC15',
  black: '#111111',
  orange: '#F97316',
};

const OVERLAY_FONT_SIZE_MAP: Record<TextOverlaySize, number> = {
  small: 14,
  medium: 18,
  large: 24,
};

/** Group Whisper words into ~5-word chunks for readable subtitle display. */
function buildCaptionChunks(words: CaptionWord[], chunkSize = 5) {
  const chunks: { text: string; start: number; end: number }[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    const group = words.slice(i, i + chunkSize);
    chunks.push({
      text: group.map(w => w.word).join(' ').trim(),
      start: group[0].start,
      end: group[group.length - 1].end,
    });
  }
  return chunks;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // Half width with gaps
const THUMB_HEIGHT = CARD_WIDTH * (16 / 9); // Full portrait ratio

export interface RestaurantInfo {
  name: string;
  logo_url?: string | null;
  cover_image_url?: string | null;
}

interface VideoRecommendationCardProps {
  recommendation: VideoRecommendationWithUser;
  restaurant: RestaurantInfo;
  isLiked: boolean;
  isOwnContent: boolean;
  onLike: (id: string) => void;
  onFlag: (id: string) => void;
  onDelete: (id: string) => void;
  onViewCounted?: (id: string) => void;
}

export default function VideoRecommendationCard({
  recommendation,
  restaurant,
  isLiked,
  isOwnContent,
  onLike,
  onFlag,
  onDelete,
  onViewCounted,
}: VideoRecommendationCardProps) {
  const colors = getColors();
  const brand = getBrand();
  const assets = getAssets();
  const styles = useStyles();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasCountedView, setHasCountedView] = useState(false);

  // Parse video_url — handles both plain URL and JSON array (multi-segment)
  const videoUrls = parseVideoUrls(recommendation.video_url);
  const player = useVideoPlayer(videoUrls[0], (p) => {
    p.loop = true;
    p.muted = false;
  });

  const displayName = recommendation.profiles?.display_name || 'Anonymous';
  const avatarUrl = recommendation.profiles?.avatar_url;
  const tagLabel = recommendation.caption_tag
    ? CAPTION_TAG_LABELS[recommendation.caption_tag as CaptionTag]
    : null;
  const duration = recommendation.duration_seconds || 0;

  const handleOpenFullscreen = useCallback(() => {
    setIsFullscreen(true);
    try {
      player.play();
      if (!hasCountedView && onViewCounted) {
        setHasCountedView(true);
        onViewCounted(recommendation.id);
      }
    } catch (_) {}
  }, [hasCountedView, onViewCounted, recommendation.id, player]);

  const handleCloseFullscreen = useCallback(() => {
    try { player.pause(); } catch (_) {}
    setIsFullscreen(false);
  }, [player]);

  const handleMorePress = useCallback(() => {
    const options = isOwnContent
      ? ['Delete Recommendation', 'Cancel']
      : ['Report', 'Cancel'];
    const destructiveIndex = 0;
    const cancelIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destructiveIndex, cancelButtonIndex: cancelIndex },
        (index) => {
          if (index === 0) {
            if (isOwnContent) {
              Alert.alert('Delete Recommendation', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(recommendation.id) },
              ]);
            } else {
              onFlag(recommendation.id);
            }
          }
        },
      );
    } else {
      Alert.alert(
        isOwnContent ? 'Delete Recommendation' : 'Report',
        isOwnContent ? 'Are you sure?' : 'Report this recommendation as inappropriate?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: isOwnContent ? 'Delete' : 'Report',
            style: 'destructive',
            onPress: () => isOwnContent ? onDelete(recommendation.id) : onFlag(recommendation.id),
          },
        ],
      );
    }
  }, [isOwnContent, recommendation.id, onDelete, onFlag]);

  return (
    <>
      {/* ── Compact Tile ── */}
      <View style={styles.tile}>
        <TouchableOpacity onPress={handleOpenFullscreen} activeOpacity={0.9}>
          <View style={styles.thumbContainer}>
            {recommendation.thumbnail_url ? (
              <Image
                source={{ uri: recommendation.thumbnail_url }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Ionicons name="videocam" size={28} color="rgba(255,255,255,0.4)" />
              </View>
            )}
            {/* Play icon */}
            <View style={styles.playOverlay}>
              <Ionicons name="play" size={24} color="#FFF" />
            </View>
            {/* Duration */}
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
              </Text>
            </View>
            {/* View count — hidden until 10 views to avoid ghost-town signal */}
            {recommendation.view_count >= 10 && (
              <View style={styles.viewBadge}>
                <Ionicons name="eye-outline" size={12} color="#FFF" />
                <Text style={styles.viewBadgeText}>
                  {formatViewCount(recommendation.view_count)}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Full-Screen Modal ── */}
      {isFullscreen && (
        <FullscreenVideoModal
          visible
          player={player}
          recommendation={recommendation}
          restaurant={restaurant}
          displayName={displayName}
          avatarUrl={avatarUrl}
          tagLabel={tagLabel}
          isLiked={isLiked}
          isOwnContent={isOwnContent}
          onLike={onLike}
          onMore={handleMorePress}
          onClose={handleCloseFullscreen}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────
// Full-screen portrait video modal
// ────────────────────────────────────────────

/** Restaurant icon with fallback to cover image */
function RestaurantIconImage({ restaurant }: { restaurant: RestaurantInfo }) {
  const [failed, setFailed] = useState(false);
  const primaryUrl = restaurant.logo_url;
  const fallbackUrl = restaurant.cover_image_url;

  if (failed || !primaryUrl) {
    if (fallbackUrl && !failed) {
      return (
        <Image
          source={{ uri: fallbackUrl }}
          style={fs.restaurantIcon}
          onError={() => setFailed(true)}
        />
      );
    }
    return (
      <View style={[fs.restaurantIcon, fs.restaurantIconPlaceholder]}>
        <Ionicons name="restaurant" size={14} color="#ccc" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: primaryUrl }}
      style={fs.restaurantIcon}
      onError={() => setFailed(true)}
    />
  );
}

function FullscreenVideoModal({
  visible,
  player,
  recommendation,
  restaurant,
  displayName,
  avatarUrl,
  tagLabel,
  isLiked,
  isOwnContent,
  onLike,
  onMore,
  onClose,
}: {
  visible: boolean;
  player: ReturnType<typeof useVideoPlayer>;
  recommendation: VideoRecommendationWithUser;
  restaurant: RestaurantInfo;
  displayName: string;
  avatarUrl: string | null | undefined;
  tagLabel: string | null;
  isLiked: boolean;
  isOwnContent: boolean;
  onLike: (id: string) => void;
  onMore: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const brand = getBrand();
  const assets = getAssets();
  const timeAgo = getTimeAgo(recommendation.created_at);
  const { width: SW, height: SH } = Dimensions.get('window');

  // ── Synced captions ──
  const [currentTime, setCurrentTime] = useState(0);

  const captionChunks = useMemo(() => {
    if (!recommendation.captions_enabled || !recommendation.caption_data?.length) return [];
    return buildCaptionChunks(recommendation.caption_data);
  }, [recommendation.captions_enabled, recommendation.caption_data]);

  const activeChunk = useMemo(() =>
    captionChunks.find(c => currentTime >= c.start && currentTime <= c.end) ?? null,
    [captionChunks, currentTime],
  );

  useEffect(() => {
    if (!captionChunks.length) return;
    try {
      (player as any).timeUpdateEventInterval = 0.1;
    } catch {}
    const sub = player.addListener('timeUpdate', ({ currentTime: t }: { currentTime: number }) => {
      setCurrentTime(t);
    });
    return () => { try { sub.remove(); } catch {} };
  }, [player, captionChunks.length]);

  // Reset time tracking when modal closes
  useEffect(() => {
    if (!visible) setCurrentTime(0);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      supportedOrientations={['portrait']}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={fs.container}>
        {/* Video */}
        <VideoView player={player} style={fs.video} contentFit="cover" nativeControls={false} />

        {/* Tap to play/pause */}
        <TouchableOpacity
          style={fs.tapArea}
          activeOpacity={1}
          onPress={() => {
            try {
              if (player.playing) player.pause();
              else player.play();
            } catch (_) {}
          }}
        />

        {/* User text overlays — rendered using normalized coords */}
        {recommendation.text_overlays?.map(overlay => (
          <View
            key={overlay.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: overlay.x * SW,
              top: overlay.y * SH,
              zIndex: 9,
            }}
          >
            <Text style={{
              fontSize: OVERLAY_FONT_SIZE_MAP[overlay.size] ?? 18,
              color: OVERLAY_COLOR_MAP[overlay.color] ?? '#FFF',
              fontWeight: '700',
              textShadowColor: '#000',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 3,
            }}>
              {overlay.text}
            </Text>
          </View>
        ))}

        {/* Synced caption subtitle bar */}
        {activeChunk && (
          <View style={fs.captionBar} pointerEvents="none">
            <Text style={fs.captionBarText}>{activeChunk.text}</Text>
          </View>
        )}

        {/* Top bar: close + brand */}
        <View style={[fs.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={fs.closeButton}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={fs.topBrand}>
            <Image source={assets.appIcon} style={fs.topBrandIcon} />
            <Text style={fs.topBrandText}>{brand.appName}</Text>
          </View>
        </View>

        {/* Persistent watermark */}
        <View style={fs.watermark} pointerEvents="none">
          <Image source={assets.appIcon} style={fs.watermarkIcon} />
          <Text style={fs.watermarkText}>{brand.appName}</Text>
        </View>

        {/* Right side actions */}
        <View style={[fs.sideActions, { bottom: insets.bottom + 140 }]}>
          <TouchableOpacity style={fs.sideButton} onPress={() => onLike(recommendation.id)}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={28}
              color={isLiked ? '#ef4444' : '#FFF'}
            />
            {recommendation.like_count > 0 && (
              <Text style={fs.sideButtonText}>{recommendation.like_count}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={fs.sideButton} onPress={onMore}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Bottom overlay */}
        <View style={[fs.bottomOverlay, { paddingBottom: insets.bottom + 16 }]}>
          <View style={fs.restaurantRow}>
            <RestaurantIconImage restaurant={restaurant} />
            <Text style={fs.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
          </View>
          <View style={fs.userRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={fs.avatar} />
            ) : (
              <View style={[fs.avatar, fs.avatarPlaceholder]}>
                <Ionicons name="person" size={12} color="#ccc" />
              </View>
            )}
            <Text style={fs.userName}>{displayName}</Text>
            <Text style={fs.timeAgo}>{timeAgo}</Text>
          </View>
          {tagLabel && (
            <View style={fs.tagRow}>
              <View style={fs.captionTag}>
                <Text style={fs.captionTagText}>{tagLabel}</Text>
              </View>
            </View>
          )}
          {recommendation.caption && (
            <Text style={fs.caption}>{recommendation.caption}</Text>
          )}
          <View style={fs.bottomBrand}>
            <Image source={assets.appIcon} style={fs.bottomBrandIcon} />
            <Text style={fs.bottomBrandText}>{brand.appName}</Text>
            <Text style={fs.bottomBrandDot}>&middot;</Text>
            <Text style={fs.bottomBrandSub}>{brand.cityName}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────
function getTimeAgo(dateStr: string): string {
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

function formatViewCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  return `${Math.floor(count / 1000)}k`;
}

// ── Tile styles (themed) ──
const useStyles = createLazyStyles((colors) => ({
  tile: {
    marginBottom: 16,
  },
  thumbContainer: {
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
    borderRadius: radius.md,
    overflow: 'hidden' as const,
  },
  thumbnailImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  thumbPlaceholder: {
    width: '100%' as const,
    height: '100%' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.primaryDark,
  },
  playOverlay: {
    ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as any),
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  durationBadge: {
    position: 'absolute' as const,
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  viewBadge: {
    position: 'absolute' as const,
    bottom: 6,
    left: 6,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  viewBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600' as const,
  },
}));

// ── Fullscreen styles (static) ──
const fs = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  tapArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  topBrandIcon: {
    width: 22,
    height: 22,
    borderRadius: 5,
  },
  topBrandText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  sideActions: {
    position: 'absolute',
    right: 12,
    zIndex: 10,
    alignItems: 'center',
    gap: 20,
  },
  sideButton: {
    alignItems: 'center',
    gap: 2,
  },
  sideButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  restaurantIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  restaurantIconPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  timeAgo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  captionTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  captionTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  caption: {
    fontSize: 15,
    color: '#FFF',
    lineHeight: 21,
    marginBottom: 10,
  },
  bottomBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  bottomBrandIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  bottomBrandText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bottomBrandDot: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  bottomBrandSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  captionBar: {
    position: 'absolute',
    bottom: 180,
    left: 16,
    right: 16,
    zIndex: 9,
    alignItems: 'center',
  },
  captionBarText: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    textAlign: 'center',
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    left: 0,
    right: 0,
    zIndex: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    opacity: 0.25,
  },
  watermarkIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  watermarkText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
