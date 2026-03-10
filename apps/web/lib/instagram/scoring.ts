// Instagram Agent v1: Candidate scoring and selection
// score = (tier_weight * 3) + (freshness * 2) + (photo_quality * 2) + (rating_weight * 1.5) - (recent_post_penalty)

import { SupabaseClient } from '@supabase/supabase-js';
import { ScoredCandidate } from './types';

// Stock/default event images we uploaded — NOT custom restaurant photos
// Any image_url matching these patterns is a stock placeholder, not a real photo
const STOCK_IMAGE_PREFIXES = [
  'https://tastelanc.com/images/events/',
  'https://tastelanc.com/images/entertainment/',
  'https://tastecumberland.com/images/events/',
];

function isStockImage(url: string | null): boolean {
  if (!url) return true;
  return STOCK_IMAGE_PREFIXES.some(prefix => url.startsWith(prefix));
}

function hasCustomImage(candidate: ScoredCandidate): boolean {
  return !!candidate.image_url && !isStockImage(candidate.image_url);
}

const TIER_WEIGHTS: Record<string, number> = {
  elite: 4,
  premium: 3,
  basic: 2,     // "starter" in task spec
  coffee_shop: 2,
};
const FREE_TIER_WEIGHT = 1;

const EVENT_TYPE_LABELS: Record<string, string> = {
  live_music: 'Live Music',
  trivia: 'Trivia Night',
  karaoke: 'Karaoke',
  dj: 'DJ Night',
  comedy: 'Comedy Show',
  sports: 'Sports Watch Party',
  bingo: 'Bingo',
  music_bingo: 'Music Bingo',
  poker: 'Poker Night',
  other: 'Event',
};

function formatTimeShort(time: string | null): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return minutes === '00' ? `${h12}${ampm}` : `${h12}:${minutes}${ampm}`;
}

const RECENCY_PENALTY_DAYS = 7; // Full penalty if used in last 7 days
const MAX_RECENCY_PENALTY = 6;

interface MemoryRow {
  restaurant_id: string | null;
  last_used_at: string;
  use_count_30d: number;
}

export async function loadRecencyMemory(
  supabase: SupabaseClient,
  marketId: string
): Promise<Map<string, MemoryRow>> {
  const { data } = await supabase
    .from('instagram_post_memory')
    .select('restaurant_id, last_used_at, use_count_30d')
    .eq('market_id', marketId)
    .not('restaurant_id', 'is', null);

  const map = new Map<string, MemoryRow>();
  if (data) {
    for (const row of data) {
      if (row.restaurant_id) {
        map.set(row.restaurant_id, row);
      }
    }
  }
  return map;
}

function computeRecencyPenalty(memory: MemoryRow | undefined): number {
  if (!memory) return 0;
  const daysSince = (Date.now() - new Date(memory.last_used_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince >= RECENCY_PENALTY_DAYS) return 0;
  // Linear decay: full penalty at day 0, zero at RECENCY_PENALTY_DAYS
  const ratio = 1 - daysSince / RECENCY_PENALTY_DAYS;
  // Extra penalty for overuse in last 30 days
  const overusePenalty = Math.min(memory.use_count_30d - 1, 3); // max 3 extra
  return Math.min(MAX_RECENCY_PENALTY * ratio + overusePenalty, MAX_RECENCY_PENALTY);
}

function getTierWeight(tierSlug: string | null): number {
  if (!tierSlug) return FREE_TIER_WEIGHT;
  return TIER_WEIGHTS[tierSlug] ?? FREE_TIER_WEIGHT;
}

function computePhotoQuality(imageUrl: string | null, coverImageUrl: string | null): number {
  if (imageUrl) return 2; // Entity has its own image — best
  if (coverImageUrl) return 1; // Restaurant cover available
  return 0; // No image
}

function computeFreshness(createdAt: string): number {
  const daysOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysOld <= 3) return 3;
  if (daysOld <= 7) return 2;
  if (daysOld <= 30) return 1;
  return 0;
}

function computeRatingWeight(rating: number | null): number {
  if (!rating) return 0;
  if (rating >= 4.5) return 2;
  if (rating >= 4.0) return 1.5;
  if (rating >= 3.5) return 1;
  return 0.5;
}

export function scoreCandidate(
  candidate: {
    restaurant_id: string;
    restaurant_name: string;
    restaurant_slug: string;
    entity_id: string;
    entity_type: 'event' | 'happy_hour' | 'special' | 'restaurant';
    entity_name: string;
    image_url: string | null;
    cover_image_url: string | null;
    tier_slug: string | null;
    average_rating: number | null;
    created_at: string;
    detail_text?: string;
  },
  memory: Map<string, MemoryRow>
): ScoredCandidate {
  const tier_weight = getTierWeight(candidate.tier_slug);
  const freshness = computeFreshness(candidate.created_at);
  const photo_quality = computePhotoQuality(candidate.image_url, candidate.cover_image_url);
  const rating_weight = computeRatingWeight(candidate.average_rating);
  const recency_penalty = computeRecencyPenalty(memory.get(candidate.restaurant_id));

  const score =
    tier_weight * 3 +
    freshness * 2 +
    photo_quality * 2 +
    rating_weight * 1.5 -
    recency_penalty;

  return {
    restaurant_id: candidate.restaurant_id,
    restaurant_name: candidate.restaurant_name,
    restaurant_slug: candidate.restaurant_slug,
    entity_id: candidate.entity_id,
    entity_type: candidate.entity_type,
    entity_name: candidate.entity_name,
    score,
    tier_weight,
    freshness,
    photo_quality,
    rating_weight,
    recency_penalty,
    image_url: candidate.image_url,
    cover_image_url: candidate.cover_image_url,
    detail_text: candidate.detail_text,
  };
}

/**
 * Select top N candidates, deduplicating by restaurant_id.
 * Returns [visible, totalCount] where visible is 2-3 restaurants and totalCount is all eligible.
 *
 * @param dateSeed - Optional date string (YYYY-MM-DD) for deterministic day-to-day variety.
 *                   Different dates will rotate which candidates are selected.
 * @param recentEntityIds - Entity IDs already used in nearby posts — these get deprioritized.
 */
export function selectTopCandidates(
  scored: ScoredCandidate[],
  visibleCount: number = 3,
  dateSeed?: string,
  recentEntityIds?: Set<string>,
  deduplicateByEntity: boolean = false
): { visible: ScoredCandidate[]; totalCount: number } {
  // Sort descending by score
  const sorted = [...scored].sort((a, b) => b.score - a.score);

  // Deduplicate: by entity_id (for events — same venue can appear with different events)
  // or by restaurant_id (for specials/happy hours — one entry per restaurant)
  const seen = new Set<string>();
  const deduped: ScoredCandidate[] = [];
  for (const c of sorted) {
    const key = deduplicateByEntity ? c.entity_id : c.restaurant_id;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(c);
    }
  }

  // Split into fresh (not used on nearby dates) and reused pools
  let fresh = deduped;
  let reused: ScoredCandidate[] = [];
  if (recentEntityIds && recentEntityIds.size > 0) {
    fresh = deduped.filter(c => !recentEntityIds.has(c.entity_id));
    reused = deduped.filter(c => recentEntityIds.has(c.entity_id));
  }

  // Apply deterministic rotation within each pool separately
  if (dateSeed) {
    const hash = dateSeed.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0);
    if (fresh.length > visibleCount) {
      const offset = Math.abs(hash) % fresh.length;
      fresh = [...fresh.slice(offset), ...fresh.slice(0, offset)];
    }
    if (reused.length > 0) {
      const offset = Math.abs(hash) % reused.length;
      reused = [...reused.slice(offset), ...reused.slice(0, offset)];
    }
  }

  // Within each pool, prefer candidates with custom images
  const sortByImage = (arr: ScoredCandidate[]) => [
    ...arr.filter(hasCustomImage),
    ...arr.filter(c => !hasCustomImage(c)),
  ];

  // Fill from fresh first, then fall back to reused if not enough fresh
  // When deduplicating by entity, cap same restaurant at 2 appearances max
  const pool = [...sortByImage(fresh), ...sortByImage(reused)];
  const visible: ScoredCandidate[] = [];
  const restaurantCount = new Map<string, number>();
  const maxPerRestaurant = deduplicateByEntity ? 2 : 1;
  for (const c of pool) {
    if (visible.length >= visibleCount) break;
    const count = restaurantCount.get(c.restaurant_id) || 0;
    if (count < maxPerRestaurant) {
      visible.push(c);
      restaurantCount.set(c.restaurant_id, count + 1);
    }
  }

  return {
    visible,
    totalCount: deduped.length,
  };
}

// ============================================
// Query helpers: fetch candidates by type
// ============================================

export async function fetchTonightCandidates(
  supabase: SupabaseClient,
  marketId: string,
  dayOfWeek: string,
  todayDate: string
): Promise<{
  events: ScoredCandidate[];
  happyHours: ScoredCandidate[];
  specials: ScoredCandidate[];
  memory: Map<string, MemoryRow>;
}> {
  const memory = await loadRecencyMemory(supabase, marketId);

  // Events: recurring on this day OR one-time on this date (scoped to market)
  const { data: events } = await supabase
    .from('events')
    .select(`
      id, name, event_type, image_url, created_at, is_recurring, days_of_week, event_date, start_time,
      restaurant:restaurants!inner(id, name, slug, cover_image_url, average_rating, market_id, is_active,
        tier:tiers(name)
      )
    `)
    .eq('is_active', true)
    .eq('restaurant.market_id', marketId)
    .or(`and(is_recurring.eq.true,days_of_week.cs.{${dayOfWeek}}),and(is_recurring.eq.false,event_date.eq.${todayDate})`);

  const scoredEvents = (events || [])
    .filter((e: any) => e.restaurant?.is_active)
    .map((e: any) => {
      const timeStr = formatTimeShort(e.start_time);
      const eventLabel = EVENT_TYPE_LABELS[e.event_type] || e.name;
      const detail = timeStr ? `${eventLabel} at ${timeStr}` : eventLabel;
      return scoreCandidate({
        restaurant_id: e.restaurant.id,
        restaurant_name: e.restaurant.name,
        restaurant_slug: e.restaurant.slug,
        entity_id: e.id,
        entity_type: 'event',
        entity_name: e.name,
        image_url: e.image_url,
        cover_image_url: e.restaurant.cover_image_url,
        tier_slug: e.restaurant.tier?.name || null,
        average_rating: e.restaurant.average_rating,
        created_at: e.created_at,
        detail_text: detail,
      }, memory);
    });

  // Happy hours active today (scoped to market)
  const { data: happyHours } = await supabase
    .from('happy_hours')
    .select(`
      id, name, description, image_url, created_at, days_of_week, start_time, end_time,
      restaurant:restaurants!inner(id, name, slug, cover_image_url, average_rating, market_id, is_active,
        tier:tiers(name)
      )
    `)
    .eq('is_active', true)
    .eq('restaurant.market_id', marketId)
    .contains('days_of_week', [dayOfWeek]);

  const scoredHappyHours = (happyHours || [])
    .filter((h: any) => h.restaurant?.is_active)
    .map((h: any) => {
      const start = formatTimeShort(h.start_time);
      const end = formatTimeShort(h.end_time);
      const detail = start && end ? `Happy Hour ${start}–${end}` : 'Happy Hour';
      return scoreCandidate({
        restaurant_id: h.restaurant.id,
        restaurant_name: h.restaurant.name,
        restaurant_slug: h.restaurant.slug,
        entity_id: h.id,
        entity_type: 'happy_hour',
        entity_name: h.name,
        image_url: h.image_url,
        cover_image_url: h.restaurant.cover_image_url,
        tier_slug: h.restaurant.tier?.name || null,
        average_rating: h.restaurant.average_rating,
        created_at: h.created_at,
        detail_text: detail,
      }, memory);
    });

  // Specials active today (scoped to market)
  const { data: specials } = await supabase
    .from('specials')
    .select(`
      id, name, description, image_url, created_at, is_recurring, days_of_week, start_date, end_date,
      restaurant:restaurants!inner(id, name, slug, cover_image_url, average_rating, market_id, is_active,
        tier:tiers(name)
      )
    `)
    .eq('is_active', true)
    .eq('restaurant.market_id', marketId);

  const scoredSpecials = (specials || [])
    .filter((s: any) => {
      if (!s.restaurant?.is_active) return false;
      if (s.is_recurring && s.days_of_week?.includes(dayOfWeek)) return true;
      if (!s.is_recurring && s.start_date && s.end_date) {
        return todayDate >= s.start_date && todayDate <= s.end_date;
      }
      if (!s.is_recurring && s.start_date) return todayDate === s.start_date;
      return false;
    })
    .map((s: any) => {
      const descText = s.description || s.name || 'Special';
      const detail = descText.length > 35 ? descText.slice(0, 32) + '...' : descText;
      return scoreCandidate({
        restaurant_id: s.restaurant.id,
        restaurant_name: s.restaurant.name,
        restaurant_slug: s.restaurant.slug,
        entity_id: s.id,
        entity_type: 'special',
        entity_name: s.name,
        image_url: s.image_url,
        cover_image_url: s.restaurant.cover_image_url,
        tier_slug: s.restaurant.tier?.name || null,
        average_rating: s.restaurant.average_rating,
        created_at: s.created_at,
        detail_text: detail,
      }, memory);
    });

  return { events: scoredEvents, happyHours: scoredHappyHours, specials: scoredSpecials, memory };
}

export async function fetchWeekendCandidates(
  supabase: SupabaseClient,
  marketId: string,
  fridayDate: string,
  saturdayDate: string,
  sundayDate: string
): Promise<{ candidates: ScoredCandidate[]; memory: Map<string, MemoryRow> }> {
  const memory = await loadRecencyMemory(supabase, marketId);
  const weekendDays = ['friday', 'saturday', 'sunday'];

  // Events on fri/sat/sun (scoped to market)
  const { data: events } = await supabase
    .from('events')
    .select(`
      id, name, event_type, image_url, created_at, is_recurring, days_of_week, event_date, start_time,
      restaurant:restaurants!inner(id, name, slug, cover_image_url, average_rating, market_id, is_active,
        tier:tiers(name)
      )
    `)
    .eq('is_active', true)
    .eq('restaurant.market_id', marketId);

  const scoredEvents = (events || [])
    .filter((e: any) => {
      if (!e.restaurant?.is_active) return false;
      if (e.is_recurring && e.days_of_week?.some((d: string) => weekendDays.includes(d))) return true;
      if (!e.is_recurring && e.event_date) {
        return [fridayDate, saturdayDate, sundayDate].includes(e.event_date);
      }
      return false;
    })
    .map((e: any) => {
      const timeStr = formatTimeShort(e.start_time);
      const eventLabel = EVENT_TYPE_LABELS[e.event_type] || e.name;
      const detail = timeStr ? `${eventLabel} at ${timeStr}` : eventLabel;
      return scoreCandidate({
        restaurant_id: e.restaurant.id,
        restaurant_name: e.restaurant.name,
        restaurant_slug: e.restaurant.slug,
        entity_id: e.id,
        entity_type: 'event',
        entity_name: e.name,
        image_url: e.image_url,
        cover_image_url: e.restaurant.cover_image_url,
        tier_slug: e.restaurant.tier?.name || null,
        average_rating: e.restaurant.average_rating,
        created_at: e.created_at,
        detail_text: detail,
      }, memory);
    });

  // Brunch spots for weekend
  const { data: brunchRestaurants } = await supabase
    .from('restaurants')
    .select(`id, name, slug, cover_image_url, average_rating, market_id, categories, created_at,
      tier:tiers(name)
    `)
    .eq('market_id', marketId)
    .eq('is_active', true)
    .contains('categories', ['brunch']);

  const scoredBrunch = (brunchRestaurants || []).map((r: any) =>
    scoreCandidate({
      restaurant_id: r.id,
      restaurant_name: r.name,
      restaurant_slug: r.slug,
      entity_id: r.id,
      entity_type: 'restaurant',
      entity_name: `${r.name} (Brunch)`,
      image_url: null,
      cover_image_url: r.cover_image_url,
      tier_slug: r.tier?.name || null,
      average_rating: r.average_rating,
      created_at: r.created_at,
      detail_text: 'Brunch',
    }, memory)
  );

  return {
    candidates: [...scoredEvents, ...scoredBrunch],
    memory,
  };
}

/**
 * Fetch upcoming events this week (today through end of week).
 * Used for PM "upcoming events" posts.
 */
export async function fetchUpcomingEventsCandidates(
  supabase: SupabaseClient,
  marketId: string,
  fromDate: Date
): Promise<{ candidates: ScoredCandidate[]; memory: Map<string, MemoryRow> }> {
  const memory = await loadRecencyMemory(supabase, marketId);

  // Get remaining days of the week from today
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const remainingDays: string[] = [];
  const remainingDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(fromDate);
    d.setDate(fromDate.getDate() + i);
    remainingDays.push(dayNames[d.getDay()]);
    remainingDates.push(d.toISOString().split('T')[0]);
  }

  const { data: events } = await supabase
    .from('events')
    .select(`
      id, name, event_type, image_url, created_at, is_recurring, days_of_week, event_date, start_time,
      restaurant:restaurants!inner(id, name, slug, cover_image_url, average_rating, market_id, is_active,
        tier:tiers(name)
      )
    `)
    .eq('is_active', true)
    .eq('restaurant.market_id', marketId);

  const scored = (events || [])
    .filter((e: any) => {
      if (!e.restaurant?.is_active) return false;
      if (e.is_recurring && e.days_of_week?.some((d: string) => remainingDays.includes(d))) return true;
      if (!e.is_recurring && e.event_date && remainingDates.includes(e.event_date)) return true;
      return false;
    })
    .map((e: any) => {
      const timeStr = formatTimeShort(e.start_time);
      const eventLabel = EVENT_TYPE_LABELS[e.event_type] || e.name;
      const detail = timeStr ? `${eventLabel} at ${timeStr}` : eventLabel;
      return scoreCandidate({
        restaurant_id: e.restaurant.id,
        restaurant_name: e.restaurant.name,
        restaurant_slug: e.restaurant.slug,
        entity_id: e.id,
        entity_type: 'event',
        entity_name: e.name,
        image_url: e.image_url,
        cover_image_url: e.restaurant.cover_image_url,
        tier_slug: e.restaurant.tier?.name || null,
        average_rating: e.restaurant.average_rating,
        created_at: e.created_at,
        detail_text: detail,
      }, memory);
    });

  return { candidates: scored, memory };
}

export async function fetchCategoryRoundupCandidates(
  supabase: SupabaseClient,
  marketId: string,
  category: string
): Promise<{ candidates: ScoredCandidate[]; memory: Map<string, MemoryRow> }> {
  const memory = await loadRecencyMemory(supabase, marketId);

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select(`id, name, slug, cover_image_url, average_rating, market_id, categories, created_at,
      tier:tiers(name)
    `)
    .eq('market_id', marketId)
    .eq('is_active', true)
    .contains('categories', [category]);

  const scored = (restaurants || []).map((r: any) =>
    scoreCandidate({
      restaurant_id: r.id,
      restaurant_name: r.name,
      restaurant_slug: r.slug,
      entity_id: r.id,
      entity_type: 'restaurant',
      entity_name: r.name,
      image_url: null,
      cover_image_url: r.cover_image_url,
      tier_slug: r.tier?.name || null,
      average_rating: r.average_rating,
      created_at: r.created_at,
      detail_text: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' '),
    }, memory)
  );

  return { candidates: scored, memory };
}
