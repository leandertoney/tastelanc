/**
 * Prefetch module for HomeScreen data
 * Loads all data during splash screen for instant HomeScreen rendering
 */

import type { QueryClient } from '@tanstack/react-query';
import { getSupabase, getBrand } from '../config/theme';
import { getFeaturedRestaurants, getOtherRestaurants, getRecommendations, getUserPreferences } from './recommendations';
import { getActiveAds } from './ads';
import { fetchEntertainmentEvents, fetchEvents, ENTERTAINMENT_TYPES, ApiEvent } from './events';
import { getFavorites } from './favorites';
import { queryKeys } from './queryKeys';
import type { HappyHour, HappyHourItem, Restaurant, DayOfWeek } from '../types/database';
import { ALL_CUISINES, CuisineType } from '../types/database';

// ========== Helpers ==========

function getCurrentDay(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

// ========== Happy Hours Query Function ==========

interface HappyHourWithRestaurant extends HappyHour {
  restaurant: Pick<Restaurant, 'id' | 'name' | 'cover_image_url'>;
  items?: HappyHourItem[];
}

async function getActiveHappyHours(marketId: string | null): Promise<HappyHourWithRestaurant[]> {
  const supabase = getSupabase();
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  // Happy hours inherit market from their restaurant via inner join
  let query = supabase
    .from('happy_hours')
    .select(`
      *,
      restaurant:restaurants!inner(id, name, cover_image_url, tier_id, market_id),
      items:happy_hour_items(*)
    `)
    .eq('is_active', true)
    .contains('days_of_week', [dayOfWeek])
    .order('display_order', { referencedTable: 'happy_hour_items', ascending: true })
    .limit(10);

  if (marketId) {
    query = query.eq('restaurant.market_id', marketId);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[Prefetch] getActiveHappyHours query failed:', error.message);
    return [];
  }
  return data || [];
}

// ========== Entertainment Query Function ==========

interface EntertainmentResult {
  events: ApiEvent[];
  hasTodayEvents: boolean;
}

async function getEntertainmentEvents(marketId?: string | null): Promise<EntertainmentResult> {
  const events = await fetchEntertainmentEvents(marketId);
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;
  const todayDate = now.toISOString().split('T')[0];

  // Filter to upcoming/recurring events
  const upcoming = events.filter(event => {
    if (event.is_recurring) return true;
    if (event.event_date && event.event_date >= todayDate) return true;
    return false;
  });

  // Identify today's events
  const isToday = (event: ApiEvent) => {
    if (event.event_date === todayDate) return true;
    if (event.is_recurring && event.days_of_week.includes(dayOfWeek)) return true;
    return false;
  };

  const todayEvents = upcoming.filter(isToday);
  const futureEvents = upcoming.filter(e => !isToday(e));

  todayEvents.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  futureEvents.sort((a, b) => {
    const dateA = a.event_date || '9999-12-31';
    const dateB = b.event_date || '9999-12-31';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  const sorted = [...todayEvents, ...futureEvents];
  return { events: sorted.slice(0, 5), hasTodayEvents: todayEvents.length > 0 };
}

// ========== Upcoming Events Query Function ==========

interface EventsResult {
  events: ApiEvent[];
  hasTodayEvents: boolean;
}

async function getUpcomingEvents(marketId?: string | null): Promise<EventsResult> {
  const allEvents = await fetchEvents({ market_id: marketId });
  const nonEntertainment = allEvents.filter(
    (event: ApiEvent) => !ENTERTAINMENT_TYPES.includes(event.event_type)
  );

  const now = new Date();
  const todayDate = now.toISOString().split('T')[0];
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;

  const upcoming = nonEntertainment.filter(event => {
    if (event.is_recurring) return true;
    if (event.event_date && event.event_date >= todayDate) return true;
    return false;
  });

  const isToday = (event: ApiEvent) => {
    if (event.event_date === todayDate) return true;
    if (event.is_recurring && event.days_of_week.includes(dayOfWeek)) return true;
    return false;
  };

  const todayEvents = upcoming.filter(isToday);
  const futureEvents = upcoming.filter(e => !isToday(e));

  todayEvents.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  futureEvents.sort((a, b) => {
    const dateA = a.event_date || '9999-12-31';
    const dateB = b.event_date || '9999-12-31';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  const sorted = [...todayEvents, ...futureEvents];
  return { events: sorted.slice(0, 10), hasTodayEvents: todayEvents.length > 0 };
}

// ========== Cuisines Query Function ==========

type CuisineFeaturedRestaurant = Pick<Restaurant, 'id' | 'name' | 'cover_image_url' | 'cuisine'>;

async function getCuisineFeaturedRestaurants(): Promise<Record<CuisineType, CuisineFeaturedRestaurant | null>> {
  const results: Partial<Record<CuisineType, CuisineFeaturedRestaurant | null>> = {};
  ALL_CUISINES.forEach((c) => {
    results[c] = null;
  });
  return results as Record<CuisineType, CuisineFeaturedRestaurant | null>;
}

// ========== Social Proof Query Functions ==========

async function getPlatformSocialProof() {
  const supabase = getSupabase();
  const brand = getBrand();
  const { data, error } = await supabase.rpc('get_social_proof_stats');

  if (error || !data) {
    return {
      checkinsToday: 0,
      checkinsThisWeek: 0,
      checkinBannerText: 'Check in at restaurants to earn points',
      communityText: `Join the ${brand.cityName} dining community`,
    };
  }

  const stats = Array.isArray(data) ? data[0] : data;
  const checkinsToday = stats?.checkins_today || 0;
  const checkinsThisWeek = stats?.checkins_this_week || 0;

  return {
    checkinsToday,
    checkinsThisWeek,
    checkinBannerText: checkinsToday > 0 ? `\uD83D\uDCCD ${checkinsToday} check-ins today` : '\uD83D\uDCCD Check in to earn points',
    communityText: `Join the ${brand.cityName} dining community`,
    happyHoursBannerText: null as string | null,
    specialsBannerText: null as string | null,
  };
}

async function getTrendingRestaurants(): Promise<string[]> {
  const supabase = getSupabase();
  const trendingIds = new Set<string>();

  try {
    const { data } = await supabase
      .from('restaurant_activity')
      .select('restaurant_id')
      .eq('is_trending', true);
    data?.forEach((row: { restaurant_id: string }) => trendingIds.add(row.restaurant_id));
  } catch {
    // Ignore
  }

  return Array.from(trendingIds);
}

// ========== Main Prefetch Function ==========

export async function prefetchHomeScreenData(
  qc: QueryClient,
  userId: string | null,
  marketId: string | null = null
): Promise<void> {
  const supabase = getSupabase();
  console.log('[Prefetch] Starting prefetch for userId:', userId, 'marketId:', marketId);

  try {
    // Launch ALL independent queries in parallel -- don't wait for featured first
    const independentQueries = [
      // Featured restaurants (needed for otherRestaurants, but runs in parallel with everything else)
      qc.fetchQuery({
        queryKey: ['featuredRestaurants', marketId],
        queryFn: () => getFeaturedRestaurants(16, marketId),
        staleTime: 5 * 60 * 1000,
      }),

      // Favorites (requires userId)
      userId
        ? qc.prefetchQuery({
            queryKey: ['favorites', userId],
            queryFn: () => getFavorites(userId),
            staleTime: 30 * 1000,
          })
        : Promise.resolve(),

      // Trending restaurants
      qc.prefetchQuery({
        queryKey: ['socialProof', 'trending', marketId],
        queryFn: getTrendingRestaurants,
        staleTime: 5 * 60 * 1000,
      }),

      // Active happy hours
      qc.prefetchQuery({
        queryKey: ['activeHappyHours', marketId],
        queryFn: () => getActiveHappyHours(marketId),
        staleTime: 5 * 60 * 1000,
      }),

      // Platform social proof
      qc.prefetchQuery({
        queryKey: ['socialProof', 'platform', marketId],
        queryFn: getPlatformSocialProof,
        staleTime: 5 * 60 * 1000,
      }),

      // Entertainment events (today's or upcoming)
      qc.prefetchQuery({
        queryKey: ['entertainmentEvents', marketId],
        queryFn: () => getEntertainmentEvents(marketId),
        staleTime: 5 * 60 * 1000,
      }),

      // Upcoming events
      qc.prefetchQuery({
        queryKey: ['upcomingEvents', marketId],
        queryFn: () => getUpcomingEvents(marketId),
        staleTime: 10 * 60 * 1000,
      }),

      // Cuisine featured restaurants
      qc.prefetchQuery({
        queryKey: ['cuisineFeaturedRestaurants', marketId],
        queryFn: getCuisineFeaturedRestaurants,
        staleTime: 10 * 60 * 1000,
      }),

      // Featured ads (for carousel ad slots)
      qc.prefetchQuery({
        queryKey: ['featuredAds', marketId],
        queryFn: () => getActiveAds(marketId),
        staleTime: 5 * 60 * 1000,
      }),

      // Open status (today's hours for all restaurants -- powers Open/Closed badges)
      qc.prefetchQuery({
        queryKey: queryKeys.openStatus.today(getCurrentDay()),
        queryFn: async () => {
          const today = getCurrentDay();
          const { data, error } = await supabase
            .from('restaurant_hours')
            .select('restaurant_id, open_time, close_time, is_closed')
            .eq('day_of_week', today);
          if (error) return {};
          const map: Record<string, { open_time: string | null; close_time: string | null; is_closed: boolean }> = {};
          for (const row of data || []) {
            map[row.restaurant_id] = { open_time: row.open_time, close_time: row.close_time, is_closed: row.is_closed };
          }
          return map;
        },
        staleTime: 5 * 60 * 1000,
      }),

      // Recommendations + user preferences (powers "Recommended for You" section)
      qc.prefetchQuery({
        queryKey: ['recommendations', userId ?? 'anon', marketId],
        queryFn: () => getRecommendations(8, userId ?? undefined, undefined, marketId),
        staleTime: 5 * 60 * 1000,
      }),
      qc.prefetchQuery({
        queryKey: ['userPreferences'],
        queryFn: getUserPreferences,
        staleTime: 10 * 60 * 1000,
      }),
    ];

    // Wait for all independent queries -- featured result is at index 0
    const results = await Promise.all(independentQueries);
    const featuredRestaurants = results[0] as Restaurant[];
    const featuredIds = featuredRestaurants?.map(r => r.id) || [];

    // Now prefetch otherRestaurants which depends on featuredIds
    await qc.prefetchQuery({
      queryKey: ['otherRestaurantsPage0', featuredIds, marketId],
      queryFn: () => getOtherRestaurants(featuredIds, 0, 10, marketId),
      staleTime: 5 * 60 * 1000,
    });

    console.log('[Prefetch] All queries prefetched successfully');
  } catch (error) {
    console.error('[Prefetch] Error during prefetch:', error);
    // Don't throw - let the app continue and fetch data normally if prefetch fails
  }
}
