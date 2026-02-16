/**
 * Prefetch module for HomeScreen data
 * Loads all data during splash screen for instant HomeScreen rendering
 */

import { queryClient } from './queryClient';
import { supabase } from './supabase';
import { getFeaturedRestaurants, getOtherRestaurants } from './recommendations';
import { getActiveAds } from './ads';
import { fetchEntertainmentEvents, fetchEvents, ENTERTAINMENT_TYPES, ApiEvent } from './events';
import { getFavorites } from './favorites';
import { getLeaderboard } from './voting';
import type { HappyHour, HappyHourItem, Restaurant, DayOfWeek } from '../types/database';
import { ALL_CUISINES, CuisineType } from '../types/database';
import { BRAND } from '../config/brand';

// ========== Happy Hours Query Function ==========

interface HappyHourWithRestaurant extends HappyHour {
  restaurant: Pick<Restaurant, 'id' | 'name' | 'cover_image_url'>;
  items?: HappyHourItem[];
}

async function getActiveHappyHours(marketId: string | null): Promise<HappyHourWithRestaurant[]> {
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
  isUpcoming: boolean;
}

async function getEntertainmentEvents(): Promise<EntertainmentResult> {
  const events = await fetchEntertainmentEvents();
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;
  const todayDate = now.toISOString().split('T')[0];

  const todayEvents = events.filter(event => {
    if (event.is_recurring && event.days_of_week.includes(dayOfWeek)) return true;
    if (event.event_date === todayDate) return true;
    return false;
  }).slice(0, 10);

  if (todayEvents.length > 0) {
    return { events: todayEvents, isUpcoming: false };
  }

  const upcomingEvents = events.filter(event => {
    if (event.is_recurring) return true;
    if (event.event_date && event.event_date >= todayDate) return true;
    return false;
  }).slice(0, 10);

  return { events: upcomingEvents, isUpcoming: true };
}

// ========== Upcoming Events Query Function ==========

async function getUpcomingEvents(): Promise<ApiEvent[]> {
  // Fetch all events and filter out entertainment types inline
  // (avoiding separate function to prevent potential bundling issues)
  const allEvents = await fetchEvents();
  const nonEntertainment = allEvents.filter(
    (event: ApiEvent) => !ENTERTAINMENT_TYPES.includes(event.event_type)
  );

  const today = new Date().toISOString().split('T')[0];
  return nonEntertainment
    .filter((event: ApiEvent) => {
      if (event.is_recurring) return true;
      if (event.event_date && event.event_date >= today) return true;
      return false;
    })
    .slice(0, 10);
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

function getDaysRemainingInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
}

function getVoterParticipationText(voterCount: number): string {
  if (voterCount === 0) return 'Be among the first to vote!';
  if (voterCount < 10) return `Join ${BRAND.cityName} locals in voting`;
  if (voterCount < 50) return 'Growing community of local voters';
  if (voterCount < 100) return 'Active community voting';
  if (voterCount < 500) return 'Hundreds of locals voting';
  return `Thousands of ${BRAND.cityName} locals voting`;
}

function getRestaurantsCompetingText(count: number): string {
  if (count === 0) return 'Restaurants awaiting their first votes';
  if (count < 10) return 'Top restaurants competing';
  if (count < 30) return 'Dozens of restaurants competing';
  return 'Many restaurants competing';
}

async function getPlatformSocialProof() {
  // Stub: pass p_market_id when RPC is updated in a future phase
  const { data, error } = await supabase.rpc('get_social_proof_stats');
  const daysRemaining = getDaysRemainingInMonth();
  const urgencyText = daysRemaining <= 1
    ? 'Last day to vote!'
    : daysRemaining <= 3
      ? `Only ${daysRemaining} days left!`
      : daysRemaining <= 7
        ? `${daysRemaining} days left to vote`
        : `${daysRemaining} days left this month`;

  if (error || !data) {
    const leaderboard = await getLeaderboard();
    const uniqueRestaurants = new Set(leaderboard.map(e => e.restaurant_id)).size;

    return {
      voterParticipation: `Join ${BRAND.cityName} locals in voting`,
      categoriesActive: 8,
      restaurantsCompeting: getRestaurantsCompetingText(uniqueRestaurants),
      votingUrgency: urgencyText,
      checkinsToday: 0,
      checkinsThisWeek: 0,
      votingBannerText: `🗳️ Vote for your favorites • ${urgencyText}`,
      checkinBannerText: 'Check in at restaurants to earn points',
      communityText: `Join the ${BRAND.cityName} dining community`,
    };
  }

  const stats = Array.isArray(data) ? data[0] : data;
  const checkinsToday = stats?.checkins_today || 0;
  const checkinsThisWeek = stats?.checkins_this_week || 0;

  return {
    voterParticipation: getVoterParticipationText(stats?.voters_this_month || 0),
    categoriesActive: stats?.categories_with_votes || 8,
    restaurantsCompeting: getRestaurantsCompetingText(stats?.restaurants_voted || 0),
    votingUrgency: urgencyText,
    checkinsToday,
    checkinsThisWeek,
    votingBannerText: `🗳️ ${getVoterParticipationText(stats?.voters_this_month || 0)} • ${urgencyText}`,
    checkinBannerText: checkinsToday > 0 ? `📍 ${checkinsToday} check-ins today` : '📍 Check in to earn points',
    communityText: stats?.voters_this_month > 10
      ? getVoterParticipationText(stats.voters_this_month)
      : `Join the ${BRAND.cityName} dining community`,
  };
}

async function getTrendingRestaurants(): Promise<string[]> {
  const leaderboard = await getLeaderboard();
  const trendingIds = new Set<string>();

  leaderboard.forEach(entry => {
    if (entry.tier === 'top_pick' || entry.tier === 'leading_pick') {
      trendingIds.add(entry.restaurant_id);
    }
  });

  try {
    const { data } = await supabase
      .from('restaurant_activity')
      .select('restaurant_id')
      .eq('is_trending', true);
    data?.forEach(row => trendingIds.add(row.restaurant_id));
  } catch {
    // Ignore - fallback to leaderboard data
  }

  return Array.from(trendingIds);
}

// ========== Main Prefetch Function ==========

export async function prefetchHomeScreenData(userId: string | null, marketId: string | null = null): Promise<void> {
  console.log('[Prefetch] Starting prefetch for userId:', userId, 'marketId:', marketId);

  try {
    // First, prefetch featured restaurants to get IDs for otherRestaurants query
    const featuredRestaurants = await queryClient.fetchQuery({
      queryKey: ['featuredRestaurants', marketId],
      queryFn: () => getFeaturedRestaurants(16, marketId),
      staleTime: 5 * 60 * 1000,
    });

    const featuredIds = featuredRestaurants.map(r => r.id);

    // Now prefetch all other queries in parallel
    const prefetchPromises = [
      // Favorites (requires userId)
      userId
        ? queryClient.prefetchQuery({
            queryKey: ['favorites', userId],
            queryFn: () => getFavorites(userId),
            staleTime: 30 * 1000,
          })
        : Promise.resolve(),

      // Trending restaurants
      queryClient.prefetchQuery({
        queryKey: ['socialProof', 'trending', marketId],
        queryFn: getTrendingRestaurants,
        staleTime: 5 * 60 * 1000,
      }),

      // Active happy hours
      queryClient.prefetchQuery({
        queryKey: ['activeHappyHours', marketId],
        queryFn: () => getActiveHappyHours(marketId),
        staleTime: 5 * 60 * 1000,
      }),

      // Platform social proof
      queryClient.prefetchQuery({
        queryKey: ['socialProof', 'platform', marketId],
        queryFn: getPlatformSocialProof,
        staleTime: 5 * 60 * 1000,
      }),

      // Entertainment events (today's or upcoming)
      queryClient.prefetchQuery({
        queryKey: ['entertainmentEvents', marketId],
        queryFn: getEntertainmentEvents,
        staleTime: 5 * 60 * 1000,
      }),

      // Upcoming events
      queryClient.prefetchQuery({
        queryKey: ['upcomingEvents', marketId],
        queryFn: getUpcomingEvents,
        staleTime: 10 * 60 * 1000,
      }),

      // Cuisine featured restaurants
      queryClient.prefetchQuery({
        queryKey: ['cuisineFeaturedRestaurants', marketId],
        queryFn: getCuisineFeaturedRestaurants,
        staleTime: 10 * 60 * 1000,
      }),

      // Other restaurants (just prefetch first page data)
      queryClient.prefetchQuery({
        queryKey: ['otherRestaurantsPage0', featuredIds, marketId],
        queryFn: () => getOtherRestaurants(featuredIds, 0, 10, marketId),
        staleTime: 5 * 60 * 1000,
      }),

      // Featured ads (for carousel ad slots)
      queryClient.prefetchQuery({
        queryKey: ['featuredAds', marketId],
        queryFn: () => getActiveAds(marketId),
        staleTime: 5 * 60 * 1000,
      }),
    ];

    await Promise.all(prefetchPromises);
    console.log('[Prefetch] All queries prefetched successfully');
  } catch (error) {
    console.error('[Prefetch] Error during prefetch:', error);
    // Don't throw - let the app continue and fetch data normally if prefetch fails
  }
}
