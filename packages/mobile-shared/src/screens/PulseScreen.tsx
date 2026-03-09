import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getColors, getBrand, getSupabase } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FilterType = 'all' | 'photos' | 'itineraries' | 'trending';

const SCREEN_WIDTH = Dimensions.get('window').width;
const VIDEO_HEIGHT = Math.round(SCREEN_WIDTH * 0.56);
const PHOTO_HEIGHT = Math.round(SCREEN_WIDTH * 0.85);
const AD_HEIGHT = Math.round(SCREEN_WIDTH * 0.52);

const CAPTION_TAG_LABELS: Record<string, string> = {
  must_try_dish: 'Must Try',
  best_vibes: 'Best Vibes',
  perfect_date_spot: 'Date Spot',
  hidden_gem: 'Hidden Gem',
  amazing_service: 'Great Service',
  go_to_spot: 'Go-To Spot',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoItem {
  kind: 'video';
  id: string;
  restaurantId: string;
  restaurantName: string;
  coverImageUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  captionTag: string | null;
  viewCount: number;
  likeCount: number;
  date: string;
}

interface PhotoItem {
  kind: 'photo';
  id: string;
  restaurantId: string;
  restaurantName: string;
  photoUrl: string;
  caption: string | null;
  date: string;
}

interface ItineraryItem {
  kind: 'itinerary';
  id: string;
  itineraryId: string;
  title: string;
  date: string;
  mood: string | null;
  stopCount: number;
  stops: { name: string; timeSlot: string; imageUrl: string | null }[];
  sharedAt: string;
}

interface BuzzItem {
  kind: 'buzz';
  id: string;
  restaurantId: string;
  restaurantName: string;
  coverThumb: string | null;
  checkinCount7d: number;
  checkinCountThisWeek: number;
  lastCheckinAt: string;
  date: string;
}

interface AdItem {
  kind: 'ad';
  id: string;
  restaurantId: string;
  restaurantName: string;
  imageUrl: string | null;
  tagline: string;
  ctaLabel: string;
  date: string;
}

interface ReelsShelfItem {
  kind: 'reels_shelf';
  id: string;
  videos: VideoItem[];
}

type PulseItem = VideoItem | PhotoItem | ItineraryItem | BuzzItem | AdItem | ReelsShelfItem;

// ─── Data fetching ─────────────────────────────────────────────────────────────

function usePulseFeed() {
  const { marketId } = useMarket();
  const supabase = getSupabase();

  return useQuery({
    queryKey: ['pulseFeed', marketId],
    queryFn: async (): Promise<PulseItem[]> => {
      let videosQuery = supabase
        .from('restaurant_recommendations')
        .select('id, restaurant_id, thumbnail_url, caption, caption_tag, view_count, like_count, created_at, restaurants!inner(id, name, market_id, cover_image_url, restaurant_photos(url, is_cover))')
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(30);

      const itinerariesQuery = supabase
        .from('itineraries')
        .select('id, title, date, mood, shared_at, itinerary_items(display_name, time_slot, display_image_url, sort_order)')
        .eq('is_shared', true)
        .order('shared_at', { ascending: false })
        .limit(20);

      let adsQuery = supabase
        .from('featured_ads')
        .select('id, restaurant_id, image_url, tagline, restaurants!inner(name, market_id, cover_image_url, description)')
        .eq('is_active', true)
        .limit(4);

      if (marketId) {
        videosQuery = videosQuery.eq('restaurants.market_id', marketId);
        adsQuery = adsQuery.or(`market_id.is.null,market_id.eq.${marketId}`);
      }

      const buzzPromise = marketId
        ? supabase.rpc('get_restaurant_buzz', { p_market_id: marketId })
        : Promise.resolve({ data: [], error: null });

      const [videosRes, adsRes, buzzRes, itinerariesRes] = await Promise.all([
        videosQuery, adsQuery, buzzPromise, itinerariesQuery,
      ]);

      const items: PulseItem[] = [];

      // ── Videos + Photos from restaurant_photos
      (videosRes.data || []).forEach((v: any) => {
        const restaurantPhotos: { url: string; is_cover: boolean }[] =
          v.restaurants?.restaurant_photos || [];
        const feedPhotos = restaurantPhotos.filter((p) => !p.is_cover).slice(0, 2);

        items.push({
          kind: 'video',
          id: `video-${v.id}`,
          restaurantId: v.restaurant_id,
          restaurantName: v.restaurants?.name || 'Restaurant',
          coverImageUrl: v.restaurants?.cover_image_url || null,
          thumbnailUrl: v.thumbnail_url || null,
          caption: v.caption || null,
          captionTag: v.caption_tag || null,
          viewCount: v.view_count || 0,
          likeCount: v.like_count || 0,
          date: v.created_at,
        });

        feedPhotos.forEach((photo, pi) => {
          const photoDate = new Date(v.created_at);
          photoDate.setMinutes(photoDate.getMinutes() + 2 + pi * 3);
          items.push({
            kind: 'photo',
            id: `photo-${v.id}-${pi}`,
            restaurantId: v.restaurant_id,
            restaurantName: v.restaurants?.name || 'Restaurant',
            photoUrl: photo.url,
            caption: v.caption || null,
            date: photoDate.toISOString(),
          });
        });
      });

      // ── Shared Itineraries
      (itinerariesRes.data || []).forEach((itin: any) => {
        const sortedStops = [...(itin.itinerary_items || [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
        items.push({
          kind: 'itinerary',
          id: `itinerary-${itin.id}`,
          itineraryId: itin.id,
          title: itin.title || 'Day Plan',
          date: itin.date,
          mood: itin.mood || null,
          stopCount: sortedStops.length,
          stops: sortedStops.slice(0, 3).map((s: any) => ({
            name: s.display_name,
            timeSlot: s.time_slot,
            imageUrl: s.display_image_url || null,
          })),
          sharedAt: itin.shared_at,
        });
      });

      // ── Buzz
      (buzzRes.data || []).forEach((b: any, i: number) => {
        const syntheticDate = new Date(b.last_checkin_at || Date.now());
        syntheticDate.setMinutes(syntheticDate.getMinutes() - i * 3);
        items.push({
          kind: 'buzz',
          id: `buzz-${b.restaurant_id}`,
          restaurantId: b.restaurant_id,
          restaurantName: b.restaurant_name,
          coverThumb: b.cover_image_url || null,
          checkinCount7d: b.checkin_count_7d || 0,
          checkinCountThisWeek: b.checkin_count_this_week || 0,
          lastCheckinAt: b.last_checkin_at,
          date: syntheticDate.toISOString(),
        });
      });

      // Sort newest first
      items.sort((a, b) => {
        const aDate = 'date' in a ? a.date : '';
        const bDate = 'date' in b ? b.date : '';
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

      // ── Build Reels shelf from first 6 videos, insert at position 3
      const videoItems = items.filter((i): i is VideoItem => i.kind === 'video').slice(0, 8);
      if (videoItems.length > 0) {
        const shelf: ReelsShelfItem = {
          kind: 'reels_shelf',
          id: 'reels-shelf',
          videos: videoItems,
        };
        items.splice(Math.min(3, items.length), 0, shelf);
      }

      // ── Weave in ads every ~8 items
      const adItems: AdItem[] = (adsRes.data || []).map((a: any, i: number) => {
        const adDate = new Date();
        adDate.setHours(adDate.getHours() - 1 - i * 3);
        return {
          kind: 'ad',
          id: `ad-${a.id}`,
          restaurantId: a.restaurant_id,
          restaurantName: a.restaurants?.name || a.business_name || 'Restaurant',
          imageUrl: a.image_url || a.restaurants?.cover_image_url || null,
          tagline: a.tagline || a.restaurants?.description?.slice(0, 80) || '',
          ctaLabel: 'Check It Out',
          date: adDate.toISOString(),
        };
      });

      const result: PulseItem[] = [];
      let adIdx = 0;
      items.forEach((item, i) => {
        if (i > 0 && i % 8 === 0 && adIdx < adItems.length) {
          result.push(adItems[adIdx++]);
        }
        result.push(item);
      });

      return result;
    },
    staleTime: 60 * 1000,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function PostHeader({
  avatarUri,
  avatarEmoji,
  avatarBg,
  title,
  subtitle,
  time,
}: {
  avatarUri?: string | null;
  avatarEmoji?: string;
  avatarBg?: string;
  title: string;
  subtitle: string;
  time?: string;
}) {
  const styles = useStyles();
  const colors = getColors();

  return (
    <View style={styles.postHeader}>
      {/* Avatar */}
      {avatarUri ? (
        <View style={styles.avatarCircle}>
          <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
      ) : (
        <View style={[styles.avatarCircle, styles.avatarEmojiCircle, { backgroundColor: avatarBg || colors.cardBgElevated }]}>
          <Text style={{ fontSize: 18 }}>{avatarEmoji || '🍽️'}</Text>
        </View>
      )}

      {/* Text block */}
      <View style={styles.headerTextBlock}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text>
      </View>

      {/* Timestamp pushed right */}
      {time && <Text style={styles.headerTime}>{time}</Text>}
    </View>
  );
}

function ActionBar({
  likeCount,
  onPress,
  ctaLabel = 'View Restaurant',
}: {
  likeCount?: number;
  onPress: () => void;
  ctaLabel?: string;
}) {
  const styles = useStyles();
  const colors = getColors();

  return (
    <View style={styles.actionBar}>
      <View style={styles.actionLeft}>
        {likeCount != null && (
          <>
            <Ionicons name="heart-outline" size={15} color={colors.textMuted} />
            <Text style={styles.actionLikeText}>{likeCount.toLocaleString()}</Text>
          </>
        )}
      </View>
      <TouchableOpacity
        style={[styles.ctaPill, { backgroundColor: colors.accent }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.ctaPillText, { color: colors.textOnAccent }]}>{ctaLabel}</Text>
        <Ionicons name="chevron-forward" size={12} color={colors.textOnAccent} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Feed item components ─────────────────────────────────────────────────────

function VideoCard({ item, onPress }: { item: VideoItem; onPress: () => void }) {
  const styles = useStyles();
  const tagLabel = item.captionTag ? CAPTION_TAG_LABELS[item.captionTag] : null;
  const subtitle = [tagLabel, formatTimeAgo(item.date)].filter(Boolean).join(' · ');

  return (
    <View style={styles.card}>
      <PostHeader
        avatarUri={item.coverImageUrl}
        title={item.restaurantName}
        subtitle={subtitle}
      />
      {/* Image / video */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.95}>
        <View style={{ width: '100%', height: VIDEO_HEIGHT, backgroundColor: '#111' }}>
          {(item.thumbnailUrl || item.coverImageUrl) ? (
            <Image
              source={{ uri: item.thumbnailUrl || item.coverImageUrl! }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : null}
          {/* Centered play circle */}
          <View style={styles.playCircleOverlay}>
            <View style={styles.playCircle}>
              <Ionicons name="play" size={22} color="#fff" style={{ marginLeft: 3 }} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
      {item.caption && (
        <Text style={styles.postCaption} numberOfLines={2}>{item.caption}</Text>
      )}
      <ActionBar likeCount={item.likeCount} onPress={onPress} />
    </View>
  );
}

function PhotoCard({ item, onPress }: { item: PhotoItem; onPress: () => void }) {
  const styles = useStyles();

  return (
    <View style={styles.card}>
      <PostHeader
        avatarUri={null}
        avatarEmoji="📸"
        avatarBg="rgba(80,80,100,0.35)"
        title={item.restaurantName}
        subtitle={`Shared photos · ${formatTimeAgo(item.date)}`}
      />
      <TouchableOpacity onPress={onPress} activeOpacity={0.95}>
        <Image
          source={{ uri: item.photoUrl }}
          style={{ width: '100%', height: PHOTO_HEIGHT }}
          resizeMode="cover"
        />
      </TouchableOpacity>
      {item.caption && (
        <Text style={styles.postCaption} numberOfLines={2}>{item.caption}</Text>
      )}
      <ActionBar onPress={onPress} />
    </View>
  );
}

function ItineraryCard({ item, onCopy }: { item: ItineraryItem; onCopy: () => void }) {
  const styles = useStyles();
  const colors = getColors();

  const timeAgo = formatTimeAgo(item.sharedAt);
  const stopLabel = `${item.stopCount} stop${item.stopCount !== 1 ? 's' : ''}`;

  return (
    <View style={styles.card}>
      <PostHeader
        avatarEmoji="🗓️"
        avatarBg="rgba(80, 140, 255, 0.18)"
        title={item.title}
        subtitle={`Day Plan · ${timeAgo}`}
      />
      {/* Mini stop strip */}
      {item.stops.length > 0 && (
        <View style={styles.itinStops}>
          {item.stops.map((stop, i) => (
            <View key={i} style={styles.itinStop}>
              <View style={styles.itinStopImg}>
                {stop.imageUrl ? (
                  <Image source={{ uri: stop.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="restaurant" size={16} color={colors.textMuted} />
                  </View>
                )}
              </View>
              <Text style={styles.itinStopName} numberOfLines={2}>{stop.name}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.itinMeta}>
        {stopLabel}{item.mood ? ` · ${item.mood.replace(/_/g, ' ')}` : ''}
      </Text>
      <View style={styles.actionBar}>
        <View style={styles.actionLeft} />
        <TouchableOpacity
          style={[styles.ctaPill, { backgroundColor: colors.accent }]}
          onPress={onCopy}
          activeOpacity={0.8}
        >
          <Ionicons name="copy-outline" size={12} color={colors.textOnAccent} />
          <Text style={[styles.ctaPillText, { color: colors.textOnAccent }]}>Copy This Day</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BuzzRow({ item, onPress }: { item: BuzzItem; onPress: () => void }) {
  const brand = getBrand();
  const styles = useStyles();
  const n = item.checkinCount7d;
  const buzzSub = n >= 20
    ? `Trending in ${brand.cityName} · ${n} visits this week`
    : `${n} people visited recently`;

  return (
    <TouchableOpacity style={styles.compactRow} onPress={onPress} activeOpacity={0.85}>
      <PostHeader
        avatarEmoji="🔥"
        avatarBg="rgba(255, 107, 53, 0.18)"
        title={item.restaurantName}
        subtitle={buzzSub}
        time={formatTimeAgo(item.lastCheckinAt)}
      />
    </TouchableOpacity>
  );
}

function AdCard({ item, onPress }: { item: AdItem; onPress: () => void }) {
  const styles = useStyles();

  return (
    <View style={[styles.card, styles.adCard]}>
      <PostHeader
        avatarUri={item.imageUrl}
        title={item.restaurantName}
        subtitle="Sponsored"
      />
      <TouchableOpacity onPress={onPress} activeOpacity={0.95}>
        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: '100%', height: AD_HEIGHT }}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>
      {item.tagline ? (
        <Text style={styles.postCaption} numberOfLines={2}>{item.tagline}</Text>
      ) : null}
      <ActionBar onPress={onPress} ctaLabel={item.ctaLabel} />
    </View>
  );
}

function ReelsShelf({ item, onPress }: { item: ReelsShelfItem; onPress: (restaurantId: string) => void }) {
  const styles = useStyles();
  const colors = getColors();

  return (
    <View style={styles.reelsShelf}>
      <View style={styles.reelsHeaderRow}>
        <Ionicons name="videocam" size={14} color={colors.accent} />
        <Text style={styles.reelsLabel}>Video Recs</Text>
        <Text style={styles.reelsSwipeHint}>Swipe to explore</Text>
      </View>
      <FlatList
        data={item.videos}
        horizontal
        keyExtractor={(v) => v.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.reelsRow}
        renderItem={({ item: v }) => (
          <TouchableOpacity
            style={styles.reelThumb}
            onPress={() => onPress(v.restaurantId)}
            activeOpacity={0.88}
          >
            <View style={styles.reelThumbImg}>
              {(v.thumbnailUrl || v.coverImageUrl) ? (
                <Image
                  source={{ uri: v.thumbnailUrl || v.coverImageUrl! }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="restaurant" size={24} color={colors.textMuted} />
                </View>
              )}
              {/* Small play overlay */}
              <View style={styles.reelPlayOverlay}>
                <View style={styles.reelPlayCircle}>
                  <Ionicons name="play" size={12} color="#fff" style={{ marginLeft: 2 }} />
                </View>
              </View>
            </View>
            <Text style={styles.reelName} numberOfLines={2}>{v.restaurantName}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'trending', label: '🔥 Trending' },
  { key: 'photos', label: '📸 Photos' },
  { key: 'itineraries', label: '🗓️ Plans' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PulseScreen() {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: allItems = [], isLoading, refetch } = usePulseFeed();

  const filteredItems = allItems.filter((item) => {
    if (item.kind === 'reels_shelf') return activeFilter === 'all' || activeFilter === 'photos';
    if (activeFilter === 'all') return true;
    if (activeFilter === 'trending') return item.kind === 'buzz';
    if (activeFilter === 'photos') return item.kind === 'video' || item.kind === 'photo';
    if (activeFilter === 'itineraries') return item.kind === 'itinerary';
    return true;
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['pulseFeed'] });
    await refetch();
    setIsRefreshing(false);
  }, [refetch, queryClient]);

  const handleItemPress = (restaurantId: string) => {
    navigation.navigate('RestaurantDetail', { id: restaurantId });
  };

  const renderItem = ({ item }: { item: PulseItem }) => {
    switch (item.kind) {
      case 'reels_shelf':
        return <ReelsShelf item={item} onPress={handleItemPress} />;
      case 'video':
        return <VideoCard item={item} onPress={() => handleItemPress(item.restaurantId)} />;
      case 'photo':
        return <PhotoCard item={item} onPress={() => handleItemPress(item.restaurantId)} />;
      case 'itinerary':
        return <ItineraryCard item={item} onCopy={() => navigation.navigate('ItineraryBuilder', { date: item.date })} />;
      case 'buzz':
        return <BuzzRow item={item} onPress={() => handleItemPress(item.restaurantId)} />;
      case 'ad':
        return <AdCard item={item} onPress={() => handleItemPress(item.restaurantId)} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Filter bar */}
      <FlatList
        data={FILTERS}
        horizontal
        keyExtractor={(f) => f.key}
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoading && allItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="pulse" size={52} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Nothing yet</Text>
          <Text style={styles.emptyText}>
            {activeFilter === 'photos'
              ? 'No photos or videos yet. Be the first!'
              : activeFilter === 'itineraries'
              ? 'No shared day plans yet. Plan your day and share it!'
              : activeFilter === 'trending'
              ? 'No trending spots right now — check back soon.'
              : `Be the first to contribute in ${brand.cityName}!`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },

  // Filter bar
  filterBar: { borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 },
  filterBarContent: { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterChipText: { fontSize: 13, fontWeight: '600' as const, color: colors.textMuted },
  filterChipTextActive: { color: colors.textOnAccent },

  // Feed
  listContent: { paddingTop: spacing.sm, paddingBottom: 40 },
  separator: { height: 8 },

  // ── Full post card
  card: {
    backgroundColor: colors.cardBg,
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: colors.border,
  },
  adCard: {},

  // ── PostHeader
  postHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 10,
  },
  avatarCircle: {
    width: 38, height: 38,
    borderRadius: 19,
    overflow: 'hidden' as const,
    backgroundColor: colors.cardBgElevated,
    flexShrink: 0,
  },
  avatarEmojiCircle: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTextBlock: { flex: 1 },
  headerTitle: {
    fontSize: 14, fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 1,
  },
  headerSub: {
    fontSize: 12, color: colors.textMuted,
  },
  headerTime: {
    fontSize: 11, color: colors.textSecondary,
    flexShrink: 0,
  },

  // ── Caption below image
  postCaption: {
    fontSize: 14, color: colors.text,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    paddingTop: 10, paddingBottom: 4,
  },

  // ── Action bar
  actionBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  actionLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
  },
  actionLikeText: {
    fontSize: 13, color: colors.textMuted,
  },
  ctaPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: radius.full,
  },
  ctaPillText: {
    fontSize: 13, fontWeight: '700' as const,
  },

  // ── Video play overlay
  playCircleOverlay: {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  playCircle: {
    width: 54, height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  // ── Itinerary card
  itinStops: {
    flexDirection: 'row' as const,
    paddingHorizontal: spacing.md,
    gap: 10,
    marginBottom: 8,
  },
  itinStop: {
    width: 90,
    alignItems: 'center' as const,
  },
  itinStopImg: {
    width: 90,
    height: 70,
    borderRadius: radius.md,
    overflow: 'hidden' as const,
    backgroundColor: colors.cardBgElevated,
    marginBottom: 4,
  },
  itinStopName: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 13,
  },
  itinMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    marginBottom: 2,
    textTransform: 'capitalize' as const,
  },

  // ── Compact notification rows (buzz)
  compactRow: {
    backgroundColor: colors.cardBg,
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: colors.border,
  },

  // ── Reels shelf
  reelsShelf: {
    backgroundColor: colors.cardBg,
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: colors.border,
    paddingTop: 12, paddingBottom: 14,
  },
  reelsHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: spacing.md,
    marginBottom: 10,
  },
  reelsLabel: {
    fontSize: 13, fontWeight: '700' as const, color: colors.text,
  },
  reelsSwipeHint: {
    fontSize: 12, color: colors.textSecondary, marginLeft: 2,
  },
  reelsRow: {
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  reelThumb: {
    width: 110,
  },
  reelThumbImg: {
    width: 110, height: 168,
    borderRadius: radius.md,
    overflow: 'hidden' as const,
    backgroundColor: colors.cardBgElevated,
    marginBottom: 5,
  },
  reelPlayOverlay: {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  reelPlayCircle: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  reelName: {
    fontSize: 11, color: colors.textMuted, lineHeight: 15,
  },

  // ── Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const, alignItems: 'center' as const,
    paddingHorizontal: 40, gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 20, fontWeight: '700' as const, color: colors.text, marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: 14, color: colors.textMuted, textAlign: 'center' as const, lineHeight: 20,
  },
}));
