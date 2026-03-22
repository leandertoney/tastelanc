import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Image,
  ImageBackground,
  FlatList,
  Dimensions,
  ScrollView,
  ViewToken,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { getColors, getBrand, getSupabase, hasFeature } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { withAlpha } from '../utils/colorUtils';
import { radius, spacing } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';
import { usePlatformSocialProof, usePersonalStats, usePersonalizedFeed } from '../hooks';
import type { PersonalizedFeedSignals } from '../hooks';
import { useAuth } from '../hooks/useAuth';
import type { RootStackParamList } from '../navigation/types';
import { trackClick } from '../lib/analytics';
import { applyContextBoosts, isHappyHourActiveNow } from '../lib/recommendations';
import { flushUserEvents, trackDetailView, trackDwell, trackQuickSkip, type BehavioralFeedItemKind } from '../lib/userEvents';
import { useOtherCities, type OtherCity } from '../hooks/useOtherCities';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FilterType = 'all' | 'photos' | 'itineraries' | 'trending' | 'deals' | 'events';

const SCREEN_WIDTH = Dimensions.get('window').width;
const VIDEO_HEIGHT = Math.round(SCREEN_WIDTH * 0.56);
const PHOTO_HEIGHT = Math.round(SCREEN_WIDTH * 0.85);
const AD_HEIGHT = Math.round(SCREEN_WIDTH * 0.52);
const EVENT_IMAGE_HEIGHT = Math.round(SCREEN_WIDTH * 0.5);
const BLOG_IMAGE_HEIGHT = Math.round(SCREEN_WIDTH * 0.48);

const CAPTION_TAG_LABELS: Record<string, string> = {
  must_try_dish: 'Must Try',
  best_vibes: 'Best Vibes',
  perfect_date_spot: 'Date Spot',
  hidden_gem: 'Hidden Gem',
  amazing_service: 'Great Service',
  go_to_spot: 'Go-To Spot',
};

const EVENT_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  live_music: 'musical-notes',
  dj: 'disc',
  trivia: 'bulb',
  karaoke: 'mic',
  comedy: 'happy',
  sports: 'football',
  bingo: 'grid',
  music_bingo: 'musical-notes',
  poker: 'diamond',
  promotion: 'megaphone',
  other: 'calendar',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  live_music: 'Live Music',
  dj: 'DJ Night',
  trivia: 'Trivia',
  karaoke: 'Karaoke',
  comedy: 'Comedy',
  sports: 'Sports',
  bingo: 'Bingo',
  music_bingo: 'Music Bingo',
  poker: 'Poker',
  promotion: 'Promo',
  other: 'Event',
};

// ─── Holiday metadata ─────────────────────────────────────────────────────────

const HOLIDAY_META: Record<string, { label: string; emoji: string; accent: string; bg: string }> = {
  'st-patricks':       { label: "St. Patrick's Day", emoji: '☘️',  accent: '#2ECC40', bg: '#0A3D0A' },
  'restaurant-week':   { label: 'Restaurant Week',   emoji: '🍽️', accent: '#C8532A', bg: '#1A0C08' },
  'cinco-de-mayo':     { label: 'Cinco de Mayo',     emoji: '🎉', accent: '#E84142', bg: '#1A0A0A' },
  'easter':            { label: 'Easter',             emoji: '🐣', accent: '#9B59B6', bg: '#1A0F20' },
  'valentines':     { label: "Valentine's Day",    emoji: '💕', accent: '#E74C8B', bg: '#1A0A12' },
  'fourth-of-july': { label: '4th of July',        emoji: '🇺🇸', accent: '#3498DB', bg: '#0A1520' },
  'halloween':      { label: 'Halloween',          emoji: '🎃', accent: '#E67E22', bg: '#1A120A' },
  'christmas':      { label: 'Christmas',          emoji: '🎄', accent: '#C0392B', bg: '#1A0A0A' },
  'new-years':      { label: "New Year's",         emoji: '🥂', accent: '#F1C40F', bg: '#1A180A' },
};

function getHolidayMeta(tag: string) {
  const base = tag.replace(/-\d{4}$/, '');
  return HOLIDAY_META[base] || { label: 'Holiday Special', emoji: '🎊', accent: '#F39C12', bg: '#1A150A' };
}

function buildHolidayDateLabel(dates: string[]): string {
  if (!dates.length) return '';
  const sorted = [...dates].sort();
  const first = new Date(sorted[0] + 'T00:00:00');
  const last = new Date(sorted[sorted.length - 1] + 'T00:00:00');
  const month = first.toLocaleDateString('en-US', { month: 'long' });
  const suffix = (n: number) => {
    if (n === 1 || n === 21 || n === 31) return 'st';
    if (n === 2 || n === 22) return 'nd';
    if (n === 3 || n === 23) return 'rd';
    return 'th';
  };
  const d1 = first.getDate();
  const d2 = last.getDate();
  if (d1 === d2) return `${month} ${d1}${suffix(d1)}`;
  return `${month} ${d1}${suffix(d1)}–${d2}${suffix(d2)}`;
}

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

interface SpecialItem {
  kind: 'special';
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string | null;
  specialName: string;
  description: string | null;
  originalPrice: number | null;
  specialPrice: number | null;
  imageUrl: string | null;
  date: string;
}

interface HappyHourItem {
  kind: 'happy_hour';
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string | null;
  happyHourName: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  dealPreview: string[];
  date: string;
}

interface EventItem {
  kind: 'event';
  id: string;
  restaurantId: string;
  restaurantName: string;
  eventName: string;
  eventType: string;
  performerName: string | null;
  imageUrl: string | null;
  startTime: string;
  endTime: string | null;
  eventDate: string;
  date: string;
}

interface NewRestaurantItem {
  kind: 'new_restaurant';
  id: string;
  restaurantId: string;
  restaurantName: string;
  coverImage: string | null;
  category: string | null;
  date: string;
}

interface BlogItem {
  kind: 'blog';
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImageUrl: string | null;
  date: string;
}

interface HolidayTeaserItem {
  kind: 'holiday_teaser';
  id: string;
  holidayTag: string;
  holidayLabel: string;
  holidayEmoji: string;
  holidayAccent: string;
  holidayBg: string;
  specialCount: number;
  restaurantCount: number;
  dateLabel: string;
  previewNames: string[];
  date: string;
}

interface CouponClaimItem {
  kind: 'coupon_claim';
  id: string;
  restaurantId: string;
  restaurantName: string;
  couponTitle: string;
  discountLabel: string;
  remaining: number | null;
  maxTotal: number | null;
  date: string;
}

interface CrossMarketPromoItem {
  kind: 'cross_market_promo';
  id: string;
}

type PulseItem =
  | VideoItem | PhotoItem | ItineraryItem | BuzzItem | AdItem | ReelsShelfItem
  | SpecialItem | HappyHourItem | EventItem | NewRestaurantItem | BlogItem
  | HolidayTeaserItem | CouponClaimItem | CrossMarketPromoItem;

function getBehavioralEventMeta(
  item: PulseItem
): { restaurantId: string; feedItemKind: BehavioralFeedItemKind } | null {
  switch (item.kind) {
    case 'video':
    case 'photo':
    case 'buzz':
    case 'special':
    case 'happy_hour':
    case 'event':
    case 'new_restaurant':
    case 'coupon_claim':
      return { restaurantId: item.restaurantId, feedItemKind: item.kind };
    default:
      return null;
  }
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

function usePulseFeed() {
  const { marketId } = useMarket();
  const supabase = getSupabase();
  const includeHappyHours = hasFeature('happyHours');

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

      // ── New queries
      let specialsQuery = supabase
        .from('specials')
        .select('id, name, description, original_price, special_price, image_url, days_of_week, created_at, restaurant:restaurants!inner(id, name, cover_image_url, market_id)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      let eventsQuery = supabase
        .from('events')
        .select('id, name, event_type, performer_name, image_url, start_time, end_time, event_date, created_at, restaurant:restaurants!inner(id, name, market_id)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
      let newRestaurantsQuery = supabase
        .from('restaurants')
        .select('id, name, cover_image_url, categories, created_at, market_id')
        .gte('created_at', twoWeeksAgo)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8);

      let blogQuery = supabase
        .from('blog_posts')
        .select('id, slug, title, summary, cover_image_url, published_at')
        .eq('status', 'published')
        .not('cover_image_url', 'is', null)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(5);

      // Holiday specials — teaser only, within ±3 days of today
      const today = new Date();
      const threeDaysAgo = new Date(today.getTime() - 3 * 86400000).toISOString().split('T')[0];
      const threeDaysAhead = new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0];
      let holidayQuery = supabase
        .from('holiday_specials')
        .select('id, name, holiday_tag, event_date, restaurant_id, restaurant:restaurants!inner(id, name, market_id)')
        .eq('is_active', true)
        .gte('event_date', threeDaysAgo)
        .lte('event_date', threeDaysAhead)
        .order('event_date', { ascending: true })
        .limit(20);

      // Market scoping
      if (marketId) {
        videosQuery = videosQuery.eq('restaurants.market_id', marketId);
        adsQuery = adsQuery.or(`market_id.is.null,market_id.eq.${marketId}`);
        specialsQuery = specialsQuery.eq('restaurant.market_id', marketId);
        eventsQuery = eventsQuery.eq('restaurant.market_id', marketId);
        newRestaurantsQuery = newRestaurantsQuery.eq('market_id', marketId);
        blogQuery = blogQuery.eq('market_id', marketId);
        holidayQuery = holidayQuery.eq('restaurant.market_id', marketId);
      }

      const buzzPromise = marketId
        ? supabase.rpc('get_restaurant_buzz', { p_market_id: marketId })
        : Promise.resolve({ data: [], error: null });

      // Happy hours (conditional)
      const happyHoursPromise = includeHappyHours
        ? supabase
            .from('happy_hours')
            .select('id, name, start_time, end_time, days_of_week, created_at, restaurant:restaurants!inner(id, name, cover_image_url, market_id), happy_hour_items(name)')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(10)
            .then((res) => {
              // Apply market filter (can't chain .eq on already-built query in then)
              if (marketId && res.data) {
                res.data = res.data.filter((h: any) => h.restaurant?.market_id === marketId);
              }
              return res;
            })
        : Promise.resolve({ data: [], error: null });

      // Recent coupon claims (for social proof — anonymized "Someone just claimed...")
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      let couponClaimsQuery = supabase
        .from('coupon_claims')
        .select('id, claimed_at, coupon:coupons!inner(id, title, discount_type, discount_value, max_claims_total, claims_count, restaurant:restaurants!inner(id, name, market_id))')
        .eq('status', 'claimed')
        .gte('claimed_at', oneDayAgo)
        .order('claimed_at', { ascending: false })
        .limit(8);

      const [videosRes, adsRes, buzzRes, itinerariesRes, specialsRes, eventsRes, newRestaurantsRes, blogRes, happyHoursRes, holidayRes, couponClaimsRes] = await Promise.all([
        videosQuery, adsQuery, buzzPromise, itinerariesQuery,
        specialsQuery, eventsQuery, newRestaurantsQuery, blogQuery, happyHoursPromise, holidayQuery,
        couponClaimsQuery,
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

      // ── Specials
      (specialsRes.data || []).slice(0, 6).forEach((s: any) => {
        items.push({
          kind: 'special',
          id: `special-${s.id}`,
          restaurantId: s.restaurant?.id,
          restaurantName: s.restaurant?.name || 'Restaurant',
          restaurantImage: s.restaurant?.cover_image_url || null,
          specialName: s.name,
          description: s.description || null,
          originalPrice: s.original_price ? Number(s.original_price) : null,
          specialPrice: s.special_price ? Number(s.special_price) : null,
          imageUrl: s.image_url || null,
          date: s.created_at,
        });
      });

      // ── Happy Hours
      (happyHoursRes.data || []).slice(0, 6).forEach((h: any) => {
        const dealNames = (h.happy_hour_items || []).slice(0, 3).map((i: any) => i.name);
        items.push({
          kind: 'happy_hour',
          id: `hh-${h.id}`,
          restaurantId: h.restaurant?.id,
          restaurantName: h.restaurant?.name || 'Restaurant',
          restaurantImage: h.restaurant?.cover_image_url || null,
          happyHourName: h.name || 'Happy Hour',
          startTime: h.start_time,
          endTime: h.end_time,
          daysOfWeek: h.days_of_week || [],
          dealPreview: dealNames,
          date: h.created_at,
        });
      });

      // ── Events
      (eventsRes.data || []).slice(0, 8).forEach((e: any) => {
        items.push({
          kind: 'event',
          id: `event-${e.id}`,
          restaurantId: e.restaurant?.id,
          restaurantName: e.restaurant?.name || 'Venue',
          eventName: e.name,
          eventType: e.event_type || 'other',
          performerName: e.performer_name || null,
          imageUrl: e.image_url || null,
          startTime: e.start_time,
          endTime: e.end_time || null,
          eventDate: e.event_date || '',
          date: e.created_at,
        });
      });

      // ── New Restaurants
      (newRestaurantsRes.data || []).slice(0, 4).forEach((r: any) => {
        items.push({
          kind: 'new_restaurant',
          id: `new-${r.id}`,
          restaurantId: r.id,
          restaurantName: r.name,
          coverImage: r.cover_image_url || null,
          category: Array.isArray(r.categories) && r.categories.length > 0 ? r.categories[0] : null,
          date: r.created_at,
        });
      });

      // ── Blog Posts
      (blogRes.data || []).slice(0, 3).forEach((b: any) => {
        items.push({
          kind: 'blog',
          id: `blog-${b.id}`,
          slug: b.slug,
          title: b.title,
          summary: b.summary || '',
          coverImageUrl: b.cover_image_url || null,
          date: b.published_at || b.created_at,
        });
      });

      // ── Holiday teasers (one per active holiday tag)
      const holidayRows = holidayRes.data || [];
      if (holidayRows.length > 0) {
        const byTag: Record<string, { names: string[]; dates: string[]; restaurantIds: Set<string> }> = {};
        holidayRows.forEach((hs: any) => {
          const tag = hs.holiday_tag;
          if (!byTag[tag]) byTag[tag] = { names: [], dates: [], restaurantIds: new Set() };
          byTag[tag].names.push(hs.name);
          if (hs.event_date) byTag[tag].dates.push(hs.event_date);
          if (hs.restaurant?.id) byTag[tag].restaurantIds.add(hs.restaurant.id);
        });
        Object.entries(byTag).forEach(([tag, data]) => {
          const meta = getHolidayMeta(tag);
          items.push({
            kind: 'holiday_teaser',
            id: `holiday-teaser-${tag}`,
            holidayTag: tag,
            holidayLabel: meta.label,
            holidayEmoji: meta.emoji,
            holidayAccent: meta.accent,
            holidayBg: meta.bg,
            specialCount: data.names.length,
            restaurantCount: data.restaurantIds.size,
            dateLabel: buildHolidayDateLabel([...new Set(data.dates)]),
            previewNames: data.names.slice(0, 3),
            date: new Date().toISOString(), // show near top
          });
        });
      }

      // ── Coupon claim social proof ("Someone just claimed...")
      const couponClaims = couponClaimsRes.data || [];
      // Deduplicate by coupon ID (show each coupon only once)
      const seenCouponIds = new Set<string>();
      couponClaims.forEach((claim: any) => {
        const coupon = claim.coupon;
        if (!coupon?.restaurant?.id || seenCouponIds.has(coupon.id)) return;
        // Market filter
        if (marketId && coupon.restaurant.market_id !== marketId) return;
        seenCouponIds.add(coupon.id);
        const remaining = coupon.max_claims_total ? coupon.max_claims_total - coupon.claims_count : null;
        const discountLabel = coupon.discount_type === 'percent_off' && coupon.discount_value
          ? `${coupon.discount_value}% Off`
          : coupon.discount_type === 'dollar_off' && coupon.discount_value
            ? `$${coupon.discount_value} Off`
            : coupon.discount_type === 'bogo' ? 'BOGO'
            : coupon.discount_type === 'free_item' ? 'Free Item'
            : coupon.title;
        items.push({
          kind: 'coupon_claim',
          id: `coupon-claim-${claim.id}`,
          restaurantId: coupon.restaurant.id,
          restaurantName: coupon.restaurant.name,
          couponTitle: coupon.title,
          discountLabel,
          remaining,
          maxTotal: coupon.max_claims_total,
          date: claim.claimed_at,
        });
      });

      // Sort newest first
      items.sort((a, b) => {
        const aDate = 'date' in a ? a.date : '';
        const bDate = 'date' in b ? b.date : '';
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

      // ── Insert holiday teasers at position 2 (high visibility)
      const teasers = items.filter((i): i is HolidayTeaserItem => i.kind === 'holiday_teaser');
      if (teasers.length > 0) {
        // Remove from sorted position, insert at position 2
        teasers.forEach((t) => {
          const idx = items.indexOf(t);
          if (idx !== -1) items.splice(idx, 1);
        });
        items.splice(Math.min(2, items.length), 0, ...teasers);
      }

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

function formatHHTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return minutes === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minutes}${suffix}`;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function PostHeader({
  avatarUri,
  avatarEmoji,
  avatarIcon,
  avatarBg,
  title,
  subtitle,
  time,
}: {
  avatarUri?: string | null;
  avatarEmoji?: string;
  avatarIcon?: keyof typeof Ionicons.glyphMap;
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
      ) : avatarIcon ? (
        <View style={[styles.avatarCircle, styles.avatarEmojiCircle, { backgroundColor: avatarBg || colors.cardBgElevated }]}>
          <Ionicons name={avatarIcon} size={18} color={colors.accent} />
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

// ─── NEW: Special Card ───────────────────────────────────────────────────────

function SpecialCard({ item, onPress }: { item: SpecialItem; onPress: () => void }) {
  const styles = useStyles();
  const colors = getColors();

  const priceText = item.specialPrice != null
    ? `$${item.specialPrice}`
    : null;
  const originalText = item.originalPrice != null && item.specialPrice != null
    ? `$${item.originalPrice}`
    : null;

  return (
    <View style={styles.card}>
      <PostHeader
        avatarUri={item.restaurantImage}
        avatarIcon={!item.restaurantImage ? 'pricetag' : undefined}
        avatarBg={!item.restaurantImage ? withAlpha(colors.accent, 0.15) : undefined}
        title={item.restaurantName}
        subtitle={`New Special · ${formatTimeAgo(item.date)}`}
      />
      {item.imageUrl && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.95}>
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: '100%', height: VIDEO_HEIGHT }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}
      <View style={styles.specialBody}>
        <Text style={styles.specialName} numberOfLines={2}>{item.specialName}</Text>
        {(priceText || originalText) && (
          <View style={styles.priceRow}>
            {originalText && (
              <Text style={styles.originalPrice}>{originalText}</Text>
            )}
            {priceText && (
              <Text style={[styles.specialPrice, { color: colors.accent }]}>{priceText}</Text>
            )}
          </View>
        )}
        {item.description && (
          <Text style={styles.specialDesc} numberOfLines={2}>{item.description}</Text>
        )}
      </View>
      <ActionBar onPress={onPress} ctaLabel="View Special" />
    </View>
  );
}

// ─── NEW: Happy Hour Card ────────────────────────────────────────────────────

function HappyHourCard({ item, onPress }: { item: HappyHourItem; onPress: () => void }) {
  const styles = useStyles();
  const colors = getColors();

  const timeRange = `${formatHHTime(item.startTime)} - ${formatHHTime(item.endTime)}`;

  return (
    <View style={styles.card}>
      <PostHeader
        avatarUri={item.restaurantImage}
        avatarIcon={!item.restaurantImage ? 'beer' : undefined}
        avatarBg={!item.restaurantImage ? withAlpha(colors.accent, 0.15) : undefined}
        title={item.restaurantName}
        subtitle={`Happy Hour · ${timeRange}`}
        time={formatTimeAgo(item.date)}
      />
      {item.dealPreview.length > 0 && (
        <View style={styles.dealChipsRow}>
          {item.dealPreview.map((deal, i) => (
            <View key={i} style={[styles.dealChip, { backgroundColor: withAlpha(colors.accent, 0.12) }]}>
              <Text style={[styles.dealChipText, { color: colors.accent }]} numberOfLines={1}>{deal}</Text>
            </View>
          ))}
        </View>
      )}
      <ActionBar onPress={onPress} ctaLabel="View Happy Hour" />
    </View>
  );
}

// ─── NEW: Event Card ─────────────────────────────────────────────────────────

function EventCard({ item, onPress }: { item: EventItem; onPress: () => void }) {
  const styles = useStyles();
  const colors = getColors();

  const icon = EVENT_TYPE_ICONS[item.eventType] || EVENT_TYPE_ICONS.other;
  const typeLabel = EVENT_TYPE_LABELS[item.eventType] || 'Event';
  const performerAt = item.performerName
    ? `${item.performerName} at ${item.restaurantName}`
    : item.restaurantName;
  const timeStr = formatHHTime(item.startTime);

  return (
    <View style={styles.card}>
      <PostHeader
        avatarIcon={icon}
        avatarBg={withAlpha(colors.accent, 0.15)}
        title={item.eventName}
        subtitle={`${typeLabel} · ${timeStr}`}
        time={formatTimeAgo(item.date)}
      />
      {item.imageUrl && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.95}>
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: '100%', height: EVENT_IMAGE_HEIGHT }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}
      <Text style={styles.postCaption} numberOfLines={1}>{performerAt}</Text>
      <ActionBar onPress={onPress} ctaLabel="View Event" />
    </View>
  );
}

// ─── NEW: New Restaurant Row ─────────────────────────────────────────────────

function NewRestaurantRow({ item, onPress }: { item: NewRestaurantItem; onPress: () => void }) {
  const styles = useStyles();
  const colors = getColors();

  const subtitle = item.category
    ? `Just added · ${item.category}`
    : 'Just added';

  return (
    <TouchableOpacity style={styles.compactRow} onPress={onPress} activeOpacity={0.85}>
      <PostHeader
        avatarUri={item.coverImage}
        avatarIcon={!item.coverImage ? 'sparkles' : undefined}
        avatarBg={!item.coverImage ? withAlpha(colors.accent, 0.15) : undefined}
        title={item.restaurantName}
        subtitle={subtitle}
        time={formatTimeAgo(item.date)}
      />
    </TouchableOpacity>
  );
}

// ─── NEW: Blog Card ──────────────────────────────────────────────────────────

function BlogCard({ item, onPress }: { item: BlogItem; onPress: () => void }) {
  const styles = useStyles();
  const brand = getBrand();

  return (
    <View style={styles.card}>
      <PostHeader
        avatarEmoji="📝"
        avatarBg="rgba(130, 100, 220, 0.18)"
        title="From the Editor"
        subtitle={`${brand.aiName} · ${formatTimeAgo(item.date)}`}
      />
      {item.coverImageUrl && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.95}>
          <View style={{ width: '100%', height: BLOG_IMAGE_HEIGHT }}>
            <Image
              source={{ uri: item.coverImageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={styles.blogGradient}
            >
              <Text style={styles.blogOverlayTitle} numberOfLines={2}>{item.title}</Text>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      )}
      {!item.coverImageUrl && (
        <Text style={styles.postCaption} numberOfLines={2}>{item.title}</Text>
      )}
      <ActionBar onPress={onPress} ctaLabel="Read More" />
    </View>
  );
}

// ─── Holiday Teaser Card ──────────────────────────────────────────────────────

function HolidayTeaserCard({ item, onPress }: { item: HolidayTeaserItem; onPress: () => void }) {
  const colors = getColors();

  const previewText = (() => {
    const names = item.previewNames;
    const remaining = item.specialCount - names.length;
    if (names.length === 0) return `${item.specialCount} deals from ${item.restaurantCount} bars`;
    const preview = names.join(', ');
    if (remaining > 0) return `${preview}, and ${remaining} more from ${item.restaurantCount} bars`;
    return `${preview} from ${item.restaurantCount} bars`;
  })();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        trackClick('holiday_teaser');
        onPress();
      }}
      style={{
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        backgroundColor: item.holidayBg,
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: withAlpha(item.holidayAccent, 0.35),
        padding: spacing.md,
        overflow: 'hidden',
      }}
    >
      {/* Background emoji watermarks */}
      <Text style={{ position: 'absolute', right: 10, top: -5, fontSize: 40, opacity: 0.08 }}>
        {item.holidayEmoji}
      </Text>
      <Text style={{ position: 'absolute', right: 55, bottom: -8, fontSize: 28, opacity: 0.06 }}>
        {item.holidayEmoji}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 28 }}>{item.holidayEmoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#F0F0F0', letterSpacing: -0.3 }}>
            {item.holidayLabel} Specials
          </Text>
          <Text style={{ fontSize: 13, color: item.holidayAccent, fontWeight: '500', marginTop: 1 }}>
            {item.dateLabel}
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontSize: 14,
          color: withAlpha('#FFFFFF', 0.7),
          marginTop: spacing.sm,
          lineHeight: 20,
        }}
        numberOfLines={2}
      >
        {previewText}
      </Text>

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: spacing.sm,
        gap: 6,
      }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: item.holidayAccent }}>
          See All Specials
        </Text>
        <View style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: withAlpha(item.holidayAccent, 0.15),
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Ionicons name="chevron-forward" size={14} color={item.holidayAccent} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Coupon Claim social proof card ──────────────────────────────────────────

function CouponClaimCard({ item, onPress }: { item: CouponClaimItem; onPress: () => void }) {
  const styles = useStyles();
  const colors = getColors();

  const urgencyText = item.remaining != null && item.maxTotal != null
    ? `Only ${item.remaining} of ${item.maxTotal} left!`
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <PostHeader
        avatarIcon="ticket"
        avatarBg={withAlpha(colors.accent, 0.15)}
        title={item.restaurantName}
        subtitle={`Someone just claimed · ${formatTimeAgo(item.date)}`}
      />
      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <View style={{ backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ color: colors.textOnAccent, fontSize: 13, fontWeight: '700' }}>
              {item.discountLabel}
            </Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 }} numberOfLines={1}>
            {item.couponTitle}
          </Text>
        </View>
        {urgencyText && (
          <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>
            {urgencyText}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
          <Ionicons name="arrow-forward-circle" size={18} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>
            View Restaurant
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Social proof header ──────────────────────────────────────────────────────

function SceneStatsHeader({ onFilterSelect }: { onFilterSelect: (f: FilterType) => void }) {
  const styles = useStyles();
  const colors = getColors();
  const { userId, isAnonymous } = useAuth();
  const { data: platformData } = usePlatformSocialProof();
  const { data: personal } = usePersonalStats();

  const hasPersonalHistory = !isAnonymous && userId && (
    (personal?.checkinsThisMonth ?? 0) > 0 ||
    personal?.lastVisitedName != null
  );

  type Pill = { label: string; icon: string; filter: FilterType | null };
  const pills: Pill[] = [];

  if (hasPersonalHistory && personal && personal.checkinsThisMonth > 0) {
    pills.push({ label: `${personal.checkinsThisMonth} visited this month`, icon: 'checkmark-circle', filter: null });
  }
  if (platformData) {
    if (platformData.checkinsToday > 0) {
      pills.push({ label: `${platformData.checkinsToday} check-ins today`, icon: 'location', filter: null });
    }
    if (hasFeature('happyHours') && platformData.upcomingHappyHoursCount > 0) {
      pills.push({ label: `${platformData.upcomingHappyHoursCount} happy hours live`, icon: 'beer', filter: 'deals' });
    }
    if (platformData.newSpecialsCount > 0) {
      pills.push({ label: `${platformData.newSpecialsCount} new specials`, icon: 'pricetag', filter: 'deals' });
    }
  }

  if (pills.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.statsPillRow}
      style={styles.statsPillContainer}
    >
      {pills.map((pill) => {
        const tappable = pill.filter !== null;
        return (
          <TouchableOpacity
            key={pill.label}
            style={[styles.statsPill, tappable && styles.statsPillTappable]}
            onPress={tappable ? () => onFilterSelect(pill.filter!) : undefined}
            activeOpacity={tappable ? 0.7 : 1}
          >
            <Ionicons
              name={pill.icon as any}
              size={13}
              color={tappable ? colors.accent : colors.textMuted}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.statsPillText, tappable && { color: colors.accent }]}>
              {pill.label}
            </Text>
            {tappable && (
              <Ionicons name="chevron-forward" size={11} color={colors.accent} style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'trending', label: 'Trending' },
  { key: 'deals', label: 'Deals' },
  { key: 'events', label: 'Events' },
  { key: 'photos', label: 'Photos' },
  { key: 'itineraries', label: 'Plans' },
];

const FAMILIAR_RATIO = 0.7;

// ─── Move Algorithm: Personalization Pass ─────────────────────────────────────

/**
 * Applies the Move tab personalization algorithm to the editorial feed.
 *
 * Strategy:
 * 1. Fixed-position items (holiday_teaser, reels_shelf) stay anchored at the top.
 * 2. Ads are stripped, then re-woven every 8 items after sorting.
 * 3. ALL remaining items are scored — restaurant-linked items via applyContextBoosts(),
 *    video/photo scored by their restaurant, itinerary/blog scored neutral (0).
 * 4. "Active right now" happy hours are promoted to the front of the scored list.
 * 5. Everything mixes together — no content type sinks to the bottom.
 */
function applyPersonalizationToFeed(
  items: PulseItem[],
  signals: PersonalizedFeedSignals
): PulseItem[] {
  const { context, favorites } = signals;
  const now = context.currentTime;
  const todayStr = now.toISOString().split('T')[0];
  const sevenDaysAgoMs = now.getTime() - 7 * 86400000;
  const thirtyDaysAgoMs = now.getTime() - 30 * 86400000;
  const familiarRestaurantIds = new Set<string>([
    ...favorites,
    ...context.visitedIds30d,
    ...context.checkinRestaurantIds,
    ...context.dwelledRestaurantIds,
    ...context.detailViewedRestaurantIds,
  ]);

  // Separate only truly fixed items and ads — everything else gets scored
  const fixedItems = items.filter((i) => i.kind === 'holiday_teaser' || i.kind === 'reels_shelf');
  const ads = items.filter((i) => i.kind === 'ad');
  const scorableItems = items.filter((i) =>
    i.kind !== 'holiday_teaser' && i.kind !== 'reels_shelf' && i.kind !== 'ad'
  );

  // Score every item — restaurant-linked gets context boosts, neutral content scores 0
  const scored = scorableItems.map((item) => {
    let restaurantId = '';
    const itemSignals: {
      isHappyHourNow?: boolean;
      isEventToday?: boolean;
      isNewSpecial?: boolean;
      isNewRestaurant?: boolean;
      checkinCount7d?: number;
    } = {};

    if (item.kind === 'happy_hour') {
      restaurantId = item.restaurantId;
      itemSignals.isHappyHourNow = isHappyHourActiveNow(
        item.startTime,
        item.endTime,
        item.daysOfWeek,
        now
      );
    } else if (item.kind === 'event') {
      restaurantId = item.restaurantId;
      itemSignals.isEventToday = item.eventDate === todayStr;
    } else if (item.kind === 'special') {
      restaurantId = item.restaurantId;
      itemSignals.isNewSpecial = new Date(item.date).getTime() >= sevenDaysAgoMs;
    } else if (item.kind === 'new_restaurant') {
      restaurantId = item.restaurantId;
      itemSignals.isNewRestaurant = new Date(item.date).getTime() >= thirtyDaysAgoMs;
    } else if (item.kind === 'buzz') {
      restaurantId = item.restaurantId;
      itemSignals.checkinCount7d = item.checkinCount7d;
    } else if (item.kind === 'coupon_claim') {
      restaurantId = item.restaurantId;
    } else if (item.kind === 'video' || item.kind === 'photo') {
      // Score by the restaurant the content is from
      restaurantId = item.restaurantId;
    }
    // itinerary and blog: restaurantId stays '' → score 0, mixes in naturally

    const eventMeta = getBehavioralEventMeta(item);
    const boost = restaurantId
      ? applyContextBoosts(restaurantId, [], context, {
          ...itemSignals,
          feedItemKind: eventMeta?.feedItemKind,
        })
      : 0;

    return {
      item,
      score: boost,
      isActiveNow: itemSignals.isHappyHourNow || itemSignals.isEventToday,
      restaurantId,
      isFamiliar: restaurantId ? familiarRestaurantIds.has(restaurantId) && !context.quickSkippedRestaurantIds.has(restaurantId) : false,
    };
  });

  // Sort: active-now first, then by score descending
  scored.sort((a, b) => {
    if (a.isActiveNow && !b.isActiveNow) return -1;
    if (!a.isActiveNow && b.isActiveNow) return 1;
    return b.score - a.score;
  });

  const familiar = scored.filter((entry) => entry.isFamiliar);
  const discovery = scored.filter((entry) => !entry.isFamiliar);
  const blended: typeof scored = [];
  let familiarUsed = 0;
  let discoveryUsed = 0;

  const pickNextCandidate = (pool: typeof scored, recentKinds: string[], recentRestaurantIds: string[]) => {
    const preferredIndex = pool.findIndex((candidate, index) => {
      if (index > 4) return false;
      const sameKindStreak = recentKinds.length >= 2
        && recentKinds[recentKinds.length - 1] === candidate.item.kind
        && recentKinds[recentKinds.length - 2] === candidate.item.kind;
      const candidateRestaurantId = candidate.restaurantId;
      const repeatedRestaurant = !!candidateRestaurantId
        && recentRestaurantIds[recentRestaurantIds.length - 1] === candidateRestaurantId;
      return !sameKindStreak && !repeatedRestaurant;
    });

    if (preferredIndex >= 0) {
      return pool.splice(preferredIndex, 1)[0];
    }

    return pool.shift() ?? null;
  };

  while (familiar.length > 0 || discovery.length > 0) {
    const totalPicked = familiarUsed + discoveryUsed;
    const currentFamiliarRatio = totalPicked === 0 ? 0 : familiarUsed / totalPicked;
    const preferFamiliar = currentFamiliarRatio < FAMILIAR_RATIO;
    const primaryPool = preferFamiliar ? familiar : discovery;
    const fallbackPool = preferFamiliar ? discovery : familiar;
    const recentKinds = blended.slice(-2).map((entry) => entry.item.kind);
    const recentRestaurantIds = blended
      .slice(-2)
      .map((entry) => entry.restaurantId)
      .filter((restaurantId): restaurantId is string => !!restaurantId);
    const next = pickNextCandidate(primaryPool, recentKinds, recentRestaurantIds)
      ?? pickNextCandidate(fallbackPool, recentKinds, recentRestaurantIds);

    if (!next) break;

    blended.push(next);
    if (next.isFamiliar) familiarUsed += 1;
    else discoveryUsed += 1;
  }

  // Reconstruct: fixed-position → unified scored feed
  const reordered: PulseItem[] = [
    ...fixedItems,
    ...blended.map((s) => s.item),
  ];

  // Re-weave ads every 8 items
  const result: PulseItem[] = [];
  let adIdx = 0;
  reordered.forEach((item, i) => {
    if (i > 0 && i % 8 === 0 && adIdx < ads.length) {
      result.push(ads[adIdx++]);
    }
    result.push(item);
  });

  return result;
}

// ─── Cross-Market Promo Card ──────────────────────────────────────────────────

/** Friendly display names for each market slug (shown in the promo card). */
const MARKET_DISPLAY_NAMES: Record<string, string> = {
  'lancaster-pa':   'Lancaster, PA',
  'cumberland-pa':  'Cumberland County, PA',
  'fayetteville-nc': 'Fayetteville, NC',
};

function CrossMarketPromoCard({ cities }: { cities: OtherCity[] }) {
  const styles = useStyles();
  const colors = getColors();

  if (cities.length === 0) return null;

  return (
    <View style={styles.crossPromoWrap}>
      <View style={styles.crossPromoHeader}>
        <Ionicons name="map-outline" size={15} color={colors.accent} />
        <Text style={styles.crossPromoTitle}>Traveling soon?</Text>
      </View>
      <Text style={styles.crossPromoSubtitle}>Find your move in other cities with our sister apps.</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.crossPromoCities}
      >
        {cities.map((city) => {
          const displayName = MARKET_DISPLAY_NAMES[city.slug] ?? city.name;
          const instagramUrl = city.instagram_handle
            ? `https://www.instagram.com/${city.instagram_handle.replace('@', '')}/`
            : null;
          const storeUrl = Platform.OS === 'android' && city.play_store_url
            ? city.play_store_url
            : city.app_store_url;

          return (
            <ImageBackground
              key={city.id}
              source={city.logo_url ? { uri: city.logo_url } : undefined}
              style={styles.crossPromoCity}
              imageStyle={styles.crossPromoCityImage}
            >
              {/* Dark gradient overlay at the bottom */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.82)']}
                style={styles.crossPromoCityOverlay}
              >
                <Text style={styles.crossPromoCityName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{displayName}</Text>
                {instagramUrl ? (
                  <TouchableOpacity
                    style={styles.crossPromoIgBtn}
                    onPress={() => Linking.openURL(instagramUrl).catch(() => {})}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="logo-instagram" size={14} color="#fff" />
                    <Text style={styles.crossPromoIgText}>Instagram</Text>
                  </TouchableOpacity>
                ) : null}
                {storeUrl ? (
                  <TouchableOpacity
                    style={styles.crossPromoDownloadBtn}
                    onPress={() => Linking.openURL(storeUrl).catch(() => {})}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={Platform.OS === 'android' ? 'logo-google-playstore' : 'logo-apple'}
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.crossPromoDownloadText}>Download</Text>
                  </TouchableOpacity>
                ) : null}
              </LinearGradient>
            </ImageBackground>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SceneScreen() {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { marketId } = useMarket();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const marketIdRef = useRef<string | null>(marketId);
  const visibleStartTimesRef = useRef(new Map<string, number>());
  const visibleItemsRef = useRef(new Map<string, PulseItem>());
  const interactedItemIdsRef = useRef(new Set<string>());

  const { userId } = useAuth();
  const { data: rawFeed = [], isLoading, refetch } = usePulseFeed();
  const { signals } = usePersonalizedFeed(userId ?? undefined);
  const { cities: otherCities } = useOtherCities(marketId);

  const allItems = useMemo(() => {
    const base = (!signals || rawFeed.length === 0)
      ? rawFeed
      : applyPersonalizationToFeed(rawFeed, signals);

    // Inject cross-market promo card at position 12 (after a full scroll of content)
    if (otherCities.length === 0 || base.length === 0) return base;
    const promo: CrossMarketPromoItem = { kind: 'cross_market_promo', id: 'cross-market-promo' };
    const result = [...base];
    result.splice(Math.min(12, result.length), 0, promo);
    return result;
  }, [rawFeed, signals, otherCities]);

  useEffect(() => {
    marketIdRef.current = marketId;
  }, [marketId]);

  const filteredItems = allItems.filter((item) => {
    if (item.kind === 'ad') return true; // Ads always show
    if (item.kind === 'cross_market_promo') return activeFilter === 'all'; // Only in "All" view
    if (item.kind === 'reels_shelf') return activeFilter === 'all' || activeFilter === 'photos';
    if (activeFilter === 'all') return true;
    if (activeFilter === 'trending') return item.kind === 'buzz' || item.kind === 'new_restaurant';
    if (activeFilter === 'deals') return item.kind === 'special' || item.kind === 'happy_hour' || item.kind === 'holiday_teaser' || item.kind === 'coupon_claim';
    if (activeFilter === 'events') return item.kind === 'event';
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

  const flushDwellForItem = useCallback((
    itemId: string,
    endedAt: number = Date.now(),
    allowQuickSkip: boolean = false,
  ) => {
    const startedAt = visibleStartTimesRef.current.get(itemId);
    const item = visibleItemsRef.current.get(itemId);
    const wasInteracted = interactedItemIdsRef.current.has(itemId);

    visibleStartTimesRef.current.delete(itemId);
    visibleItemsRef.current.delete(itemId);
    interactedItemIdsRef.current.delete(itemId);

    if (!item || startedAt === undefined) return;

    const eventMeta = getBehavioralEventMeta(item);
    if (!eventMeta) return;
    const durationMs = endedAt - startedAt;

    if (!wasInteracted && allowQuickSkip && durationMs <= 1200) {
      trackQuickSkip(
        eventMeta.restaurantId,
        eventMeta.feedItemKind,
        durationMs,
        marketIdRef.current,
      );
      return;
    }

    trackDwell(
      eventMeta.restaurantId,
      eventMeta.feedItemKind,
      durationMs,
      marketIdRef.current,
    );
  }, []);

  useEffect(() => {
    const now = Date.now();
    const filteredIds = new Set(filteredItems.map((item) => item.id));

    Array.from(visibleStartTimesRef.current.keys()).forEach((itemId) => {
      if (!filteredIds.has(itemId)) {
        flushDwellForItem(itemId, now);
      }
    });
  }, [filteredItems, flushDwellForItem]);

  useEffect(() => () => {
    const now = Date.now();
    Array.from(visibleStartTimesRef.current.keys()).forEach((itemId) => {
      flushDwellForItem(itemId, now);
    });
  }, [flushDwellForItem]);

  useFocusEffect(
    useCallback(() => () => {
      const now = Date.now();
      Array.from(visibleStartTimesRef.current.keys()).forEach((itemId) => {
        flushDwellForItem(itemId, now);
      });
      void flushUserEvents();
    }, [flushDwellForItem])
  );

  const onViewableItemsChanged = useRef(({ changed }: { changed: ViewToken[] }) => {
    const now = Date.now();

    changed.forEach((token) => {
      const item = token.item as PulseItem | undefined;
      if (!item) return;

      if (token.isViewable) {
        if (!visibleStartTimesRef.current.has(item.id)) {
          visibleStartTimesRef.current.set(item.id, now);
          visibleItemsRef.current.set(item.id, item);
        }
        return;
      }

      flushDwellForItem(item.id, now, true);
    });
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const handleItemPress = (restaurantId: string) => {
    navigation.navigate('RestaurantDetail', { id: restaurantId });
  };

  const handleBehavioralRestaurantPress = useCallback((item: PulseItem) => {
    const eventMeta = getBehavioralEventMeta(item);
    if (!eventMeta) return;

    interactedItemIdsRef.current.add(item.id);
    trackDetailView(eventMeta.restaurantId, eventMeta.feedItemKind, marketId);
    navigation.navigate('RestaurantDetail', { id: eventMeta.restaurantId });
  }, [marketId, navigation]);

  const renderItem = ({ item }: { item: PulseItem }) => {
    switch (item.kind) {
      case 'reels_shelf':
        return <ReelsShelf item={item} onPress={(restaurantId) => {
          trackDetailView(restaurantId, 'video', marketId);
          navigation.navigate('RestaurantDetail', { id: restaurantId });
        }} />;
      case 'video':
        return <VideoCard item={item} onPress={() => handleBehavioralRestaurantPress(item)} />;
      case 'photo':
        return <PhotoCard item={item} onPress={() => handleBehavioralRestaurantPress(item)} />;
      case 'itinerary':
        return <ItineraryCard item={item} onCopy={() => navigation.navigate('ItineraryBuilder', { date: item.date })} />;
      case 'buzz':
        return <BuzzRow item={item} onPress={() => handleBehavioralRestaurantPress(item)} />;
      case 'ad':
        return <AdCard item={item} onPress={() => handleItemPress(item.restaurantId)} />;
      case 'special':
        return <SpecialCard item={item} onPress={() => handleBehavioralRestaurantPress(item)} />;
      case 'happy_hour':
        return <HappyHourCard item={item} onPress={() => handleBehavioralRestaurantPress(item)} />;
      case 'event':
        return <EventCard item={item} onPress={() => handleBehavioralRestaurantPress(item)} />;
      case 'new_restaurant':
        return <NewRestaurantRow item={item} onPress={() => handleBehavioralRestaurantPress(item)} />;
      case 'blog':
        return <BlogCard item={item} onPress={() => navigation.navigate('BlogDetail', { slug: item.slug })} />;
      case 'holiday_teaser': {
        const holidayBase = (item.holidayTag || '').replace(/-\d{4}$/, '');
        const holidayDest = holidayBase === 'restaurant-week' ? 'RestaurantWeek' : 'StPatricksDay';
        return <HolidayTeaserCard item={item} onPress={() => navigation.navigate(holidayDest)} />;
      }
      case 'coupon_claim':
        return <CouponClaimCard item={item} onPress={() => handleBehavioralRestaurantPress(item)} />;
      case 'cross_market_promo':
        return <CrossMarketPromoCard cities={otherCities} />;
    }
  };

  const emptyMessage = (() => {
    switch (activeFilter) {
      case 'photos': return 'No photos or videos yet. Be the first!';
      case 'itineraries': return 'No shared day plans yet. Plan your day and share it!';
      case 'trending': return 'No trending spots right now — check back soon.';
      case 'deals': return 'No specials or happy hours yet — check back soon.';
      case 'events': return 'No events posted yet — check back soon.';
      default: return `Be the first to contribute in ${brand.cityName}!`;
    }
  })();

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
          <Ionicons name="compass-outline" size={52} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Nothing yet</Text>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListHeaderComponent={<SceneStatsHeader onFilterSelect={setActiveFilter} />}
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

  // Stats header
  statsPillContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBg,
  },
  statsPillRow: {
    flexDirection: 'row' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  statsPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsPillTappable: {
    borderColor: withAlpha(colors.accent, 0.35),
    backgroundColor: withAlpha(colors.accent, 0.08),
  },
  statsPillText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500' as const,
  },

  // Feed
  listContent: { paddingTop: spacing.sm, paddingBottom: 40 },
  separator: { height: 8 },

  // Cross-market promo — full-bleed image cards with gradient overlay
  crossPromoWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  crossPromoHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    gap: 6,
    marginBottom: 2,
  },
  crossPromoTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
  },
  crossPromoSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  crossPromoCities: {
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  crossPromoCity: {
    width: 155,
    height: 220,
    borderRadius: radius.md,
    overflow: 'hidden' as const,
    backgroundColor: colors.cardBgElevated,
  },
  crossPromoCityImage: {
    borderRadius: radius.md,
  },
  crossPromoCityOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 32,
    paddingBottom: 10,
    paddingHorizontal: 10,
    gap: 7,
  },
  crossPromoCityName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 2,
  },
  crossPromoIgBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: radius.xs,
    paddingVertical: 9,
  },
  crossPromoIgText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600' as const,
  },
  crossPromoDownloadBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.xs,
    paddingVertical: 9,
  },
  crossPromoDownloadText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.primary,
  },

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

  // ── Compact notification rows (buzz, new restaurant)
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

  // ── Special card
  specialBody: {
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: 4,
  },
  specialName: {
    fontSize: 16, fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: 'line-through' as const,
  },
  specialPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  specialDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },

  // ── Happy hour card
  dealChipsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    paddingHorizontal: spacing.md,
    gap: 6,
    paddingBottom: 4,
  },
  dealChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  dealChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },

  // ── Blog card
  blogGradient: {
    position: 'absolute' as const,
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: 40,
    paddingBottom: 14,
  },
  blogOverlayTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
