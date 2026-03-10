import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../config/theme';
import { useAuth } from './useAuth';
import { useMarket } from '../context/MarketContext';

// Types for social proof data
export interface PlatformSocialProof {
  // Check-ins - can use real numbers
  checkinsToday: number;
  checkinsThisWeek: number;

  // Live counts for banner
  upcomingHappyHoursCount: number;
  newSpecialsCount: number;

  // Formatted strings for display
  checkinBannerText: string;
  communityText: string;
  happyHoursBannerText: string | null;
  specialsBannerText: string | null;
}

export interface RestaurantSocialProof {
  // Check-ins (real numbers OK)
  checkinsToday: number;
  checkinsThisWeek: number;
  checkinsTotal: number;

  // Voting (percentages/qualitative)
  isTrending: boolean;
  trendingRank: number | null;
  votingTier: 'top_pick' | 'leading_pick' | 'local_favorite' | 'on_the_board' | null;
  voteShareText: string | null; // e.g., "Leading in Best Wings"

  // Formatted display strings
  activityText: string | null;
  trendingBadge: string | null;
}

// Minimum thresholds before showing actual numbers
const CHECKIN_THRESHOLD_TODAY = 3;
const CHECKIN_THRESHOLD_WEEK = 5;

/**
 * Format check-in count for display with thresholds
 * Only shows actual numbers above threshold to avoid low number display
 */
function formatCheckinCount(count: number, period: 'today' | 'week' | 'month'): string {
  const threshold = period === 'today' ? CHECKIN_THRESHOLD_TODAY : CHECKIN_THRESHOLD_WEEK;

  if (count === 0) {
    return ''; // Don't show anything
  }
  if (count < threshold) {
    // Below threshold - use vague language
    return period === 'today'
      ? 'People are checking in today'
      : 'People are checking in this week';
  }
  // Above threshold - show actual number
  return `${count} ${period === 'today' ? 'check-ins today' : 'check-ins this week'}`;
}

/**
 * Get formatted check-in text for display (with threshold logic)
 */
function getCheckinDisplayText(count: number, period: 'today' | 'week'): string | null {
  const threshold = period === 'today' ? CHECKIN_THRESHOLD_TODAY : CHECKIN_THRESHOLD_WEEK;

  if (count === 0) {
    return null; // Don't show anything
  }
  if (count < threshold) {
    return 'People are checking deals'; // Vague
  }
  return `${count} people checking deals ${period === 'today' ? 'today' : 'this week'}`;
}

// --- Personal Stats for logged-in users ---

export interface PersonalStats {
  checkinsThisMonth: number;
  lastVisitedName: string | null;
  lastVisitedDaysAgo: number | null;
}

/**
 * Hook to fetch personal stats for the current user
 * Used to show personalized messages in the SocialProofBanner
 */
export function usePersonalStats() {
  const { userId } = useAuth();
  const { marketId } = useMarket();

  return useQuery({
    queryKey: ['personalStats', userId, marketId],
    queryFn: async (): Promise<PersonalStats> => {
      if (!userId) return {
        checkinsThisMonth: 0,
        lastVisitedName: null,
        lastVisitedDaysAgo: null,
      };

      const supabase = getSupabase();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Filter checkins through restaurant join to scope to current market
      const [checkinRes, lastVisitRes] = await Promise.all([
        supabase
          .from('checkins')
          .select('*, restaurant:restaurants!inner(market_id)', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('restaurant.market_id', marketId)
          .gte('created_at', monthStart),
        supabase
          .from('checkins')
          .select('restaurant_name, created_at, restaurant:restaurants!inner(market_id)')
          .eq('user_id', userId)
          .eq('restaurant.market_id', marketId)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const checkinsThisMonth = checkinRes.count || 0;

      let lastVisitedName: string | null = null;
      let lastVisitedDaysAgo: number | null = null;
      if (lastVisitRes.data && lastVisitRes.data.length > 0) {
        const last = lastVisitRes.data[0] as { restaurant_name: string; created_at: string };
        lastVisitedName = last.restaurant_name;
        lastVisitedDaysAgo = Math.floor(
          (Date.now() - new Date(last.created_at).getTime()) / 86400000
        );
      }

      return {
        checkinsThisMonth,
        lastVisitedName,
        lastVisitedDaysAgo,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch platform-wide social proof stats
 */
export function usePlatformSocialProof() {
  const { marketId } = useMarket();

  const query = useQuery({
    queryKey: ['socialProof', 'platform', marketId],
    queryFn: async (): Promise<PlatformSocialProof> => {
      const supabase = getSupabase();

      // Get live counts for happy hours and specials (scoped to market via restaurant join)
      const now = new Date();
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

      // Calculate time 2 hours from now
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const twoHoursTime = twoHoursLater.toTimeString().slice(0, 5);

      // Calculate one week ago and today start
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // Query upcoming happy hours (starting within 2 hours) — filtered by market
      let upcomingHappyHoursCount = 0;
      try {
        const { count } = await supabase
          .from('happy_hours')
          .select('*, restaurant:restaurants!inner(market_id)', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('restaurant.market_id', marketId)
          .contains('days_of_week', [dayOfWeek])
          .gt('start_time', currentTime)
          .lte('start_time', twoHoursTime);
        upcomingHappyHoursCount = count || 0;
      } catch {
        // Ignore - will show 0
      }

      // Query new specials added this week — filtered by market
      let newSpecialsCount = 0;
      try {
        const { count } = await supabase
          .from('specials')
          .select('*, restaurant:restaurants!inner(market_id)', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('restaurant.market_id', marketId)
          .gte('created_at', oneWeekAgo);
        newSpecialsCount = count || 0;
      } catch {
        // Ignore - will show 0
      }

      // Query checkins for this market today/this week via restaurant join
      let checkinsToday = 0;
      let checkinsThisWeek = 0;
      try {
        const [todayRes, weekRes] = await Promise.all([
          supabase
            .from('checkins')
            .select('*, restaurant:restaurants!inner(market_id)', { count: 'exact', head: true })
            .eq('restaurant.market_id', marketId)
            .gte('created_at', todayStart),
          supabase
            .from('checkins')
            .select('*, restaurant:restaurants!inner(market_id)', { count: 'exact', head: true })
            .eq('restaurant.market_id', marketId)
            .gte('created_at', oneWeekAgo),
        ]);
        checkinsToday = todayRes.count || 0;
        checkinsThisWeek = weekRes.count || 0;
      } catch {
        // Ignore
      }

      // Format banner text for happy hours and specials
      const happyHoursBannerText = upcomingHappyHoursCount > 0
        ? `\u{1F379} ${upcomingHappyHoursCount} happy hour${upcomingHappyHoursCount > 1 ? 's' : ''} starting soon`
        : null;
      const specialsBannerText = newSpecialsCount > 0
        ? `\u2728 ${newSpecialsCount} new special${newSpecialsCount > 1 ? 's' : ''} added this week`
        : null;

      const checkinText = getCheckinDisplayText(checkinsToday, 'today');

      return {
        checkinsToday,
        checkinsThisWeek,
        upcomingHappyHoursCount,
        newSpecialsCount,
        checkinBannerText: checkinText
          ? `\u{1F4CD} ${checkinText}`
          : '\u{1F4CD} Check in to earn points',
        communityText: 'Join the local dining community',
        happyHoursBannerText,
        specialsBannerText,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch social proof for a specific restaurant
 */
export function useRestaurantSocialProof(restaurantId: string | undefined) {
  const query = useQuery({
    queryKey: ['socialProof', 'restaurant', restaurantId],
    queryFn: async (): Promise<RestaurantSocialProof | null> => {
      if (!restaurantId) return null;

      const supabase = getSupabase();

      // Try to fetch from Supabase
      const { data, error } = await supabase.rpc('get_restaurant_social_proof', {
        p_restaurant_id: restaurantId,
      });

      if (error || !data) {
        return {
          checkinsToday: 0,
          checkinsThisWeek: 0,
          checkinsTotal: 0,
          isTrending: false,
          trendingRank: null,
          votingTier: null,
          voteShareText: null,
          activityText: null,
          trendingBadge: null,
        };
      }

      const stats = Array.isArray(data) ? data[0] : data;

      return {
        checkinsToday: stats?.checkins_today || 0,
        checkinsThisWeek: stats?.checkins_this_week || 0,
        checkinsTotal: stats?.checkins_total || 0,
        isTrending: stats?.is_trending || false,
        trendingRank: stats?.trending_rank || null,
        votingTier: null, // Would need additional query
        voteShareText: null,
        activityText: stats?.checkins_this_week > 0
          ? formatCheckinCount(stats.checkins_this_week, 'week')
          : null,
        trendingBadge: stats?.is_trending ? '\u{1F525} Trending' : null,
      };
    },
    enabled: !!restaurantId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
  };
}

/**
 * Hook to record a check-in (syncs to Supabase for aggregation)
 */
export function useRecordCheckinForSocialProof() {
  const { userId } = useAuth();

  return async (restaurantId: string, restaurantName: string, pointsEarned: number = 5) => {
    if (!userId) return;

    const supabase = getSupabase();

    // Record to Supabase for aggregate counting
    try {
      await supabase.from('checkins').insert({
        user_id: userId,
        restaurant_id: restaurantId,
        restaurant_name: restaurantName,
        points_earned: pointsEarned,
      });
    } catch (error) {
      // Silent fail - local storage is the source of truth
      console.log('Failed to sync checkin to server:', error);
    }
  };
}

/**
 * Hook to get trending restaurants (for badges)
 * Returns string[] (not Set) so it survives JSON serialization in React Query cache
 */
export function useTrendingRestaurants() {
  const { marketId } = useMarket();

  return useQuery({
    queryKey: ['socialProof', 'trending', marketId],
    queryFn: async (): Promise<string[]> => {
      const supabase = getSupabase();
      const trendingIds = new Set<string>();

      try {
        const { data } = await supabase
          .from('restaurant_activity')
          .select('restaurant_id, restaurant:restaurants!inner(market_id)')
          .eq('is_trending', true)
          .eq('restaurant.market_id', marketId);
        data?.forEach((row: { restaurant_id: string }) => trendingIds.add(row.restaurant_id));
      } catch {
        // Ignore
      }

      return Array.from(trendingIds);
    },
    staleTime: 5 * 60 * 1000,
  });
}
