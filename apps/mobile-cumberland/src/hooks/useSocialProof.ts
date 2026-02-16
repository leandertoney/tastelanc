import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getLeaderboard } from '../lib/voting';
import { useAuth } from './useAuth';
import { useMarket } from '../context/MarketContext';
import { BRAND } from '../config/brand';

// Types for social proof data
export interface PlatformSocialProof {
  // Voting - use percentages/qualitative, not raw numbers
  voterParticipation: string; // e.g., "Growing community of voters"
  categoriesActive: number;
  restaurantsCompeting: string; // e.g., "Dozens of restaurants"
  votingUrgency: string; // e.g., "5 days left to vote"

  // Check-ins - can use real numbers
  checkinsToday: number;
  checkinsThisWeek: number;

  // Live counts for banner
  upcomingHappyHoursCount: number;
  newSpecialsCount: number;

  // Formatted strings for display
  votingBannerText: string;
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

/**
 * Get days remaining in the current month for voting urgency
 */
function getDaysRemainingInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
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

/**
 * Get qualitative description for voter participation
 * Uses vague terms to avoid showing low numbers
 */
function getVoterParticipationText(voterCount: number): string {
  if (voterCount === 0) return 'Be among the first to vote!';
  if (voterCount < 10) return `Join ${BRAND.cityName} locals in voting`;
  if (voterCount < 50) return 'Growing community of local voters';
  if (voterCount < 100) return 'Active community voting';
  if (voterCount < 500) return 'Hundreds of locals voting';
  return `Thousands of ${BRAND.cityName} locals voting`;
}

/**
 * Get qualitative description for restaurants competing
 */
function getRestaurantsCompetingText(count: number): string {
  if (count === 0) return 'Restaurants awaiting their first votes';
  if (count < 10) return 'Top restaurants competing';
  if (count < 30) return 'Dozens of restaurants competing';
  return 'Many restaurants competing';
}

/**
 * Hook to fetch platform-wide social proof stats
 */
export function usePlatformSocialProof() {
  const { marketId } = useMarket();

  const query = useQuery({
    queryKey: ['socialProof', 'platform', marketId],
    queryFn: async (): Promise<PlatformSocialProof> => {
      // Stub: pass p_market_id to RPC when it's updated in a future phase
      const { data, error } = await supabase.rpc('get_social_proof_stats');

      // Calculate days remaining for urgency
      const daysRemaining = getDaysRemainingInMonth();
      const urgencyText = daysRemaining <= 1
        ? 'Last day to vote!'
        : daysRemaining <= 3
          ? `Only ${daysRemaining} days left!`
          : daysRemaining <= 7
            ? `${daysRemaining} days left to vote`
            : `${daysRemaining} days left this month`;

      // Get live counts for happy hours and specials
      const now = new Date();
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

      // Calculate time 2 hours from now
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const twoHoursTime = twoHoursLater.toTimeString().slice(0, 5);

      // Calculate one week ago
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Query upcoming happy hours (starting within 2 hours)
      let upcomingHappyHoursCount = 0;
      try {
        const { count } = await supabase
          .from('happy_hours')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .contains('days_of_week', [dayOfWeek])
          .gt('start_time', currentTime)
          .lte('start_time', twoHoursTime);
        upcomingHappyHoursCount = count || 0;
      } catch {
        // Ignore - will show 0
      }

      // Query new specials added this week
      let newSpecialsCount = 0;
      try {
        const { count } = await supabase
          .from('specials')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .gte('created_at', oneWeekAgo);
        newSpecialsCount = count || 0;
      } catch {
        // Ignore - will show 0
      }

      // Format banner text for happy hours and specials
      const happyHoursBannerText = upcomingHappyHoursCount > 0
        ? `🍹 ${upcomingHappyHoursCount} happy hour${upcomingHappyHoursCount > 1 ? 's' : ''} starting soon`
        : null;
      const specialsBannerText = newSpecialsCount > 0
        ? `✨ ${newSpecialsCount} new special${newSpecialsCount > 1 ? 's' : ''} added this week`
        : null;

      if (error || !data) {
        // Fallback: use local leaderboard data
        const leaderboard = await getLeaderboard();
        const uniqueRestaurants = new Set(leaderboard.map(e => e.restaurant_id)).size;

        return {
          voterParticipation: `Join ${BRAND.cityName} locals in voting`,
          categoriesActive: 8, // We have 8 vote categories
          restaurantsCompeting: getRestaurantsCompetingText(uniqueRestaurants),
          votingUrgency: urgencyText,
          checkinsToday: 0,
          checkinsThisWeek: 0,
          upcomingHappyHoursCount,
          newSpecialsCount,
          votingBannerText: `🗳️ Vote for your favorites • ${urgencyText}`,
          checkinBannerText: 'Check in at restaurants to earn points',
          communityText: `Join the ${BRAND.cityName} dining community`,
          happyHoursBannerText,
          specialsBannerText,
        };
      }

      const stats = Array.isArray(data) ? data[0] : data;

      const checkinsToday = stats?.checkins_today || 0;
      const checkinsThisWeek = stats?.checkins_this_week || 0;

      // Use threshold logic for check-in display
      const checkinText = getCheckinDisplayText(checkinsToday, 'today');

      return {
        voterParticipation: getVoterParticipationText(stats?.voters_this_month || 0),
        categoriesActive: stats?.categories_with_votes || 8,
        restaurantsCompeting: getRestaurantsCompetingText(stats?.restaurants_voted || 0),
        votingUrgency: urgencyText,
        checkinsToday,
        checkinsThisWeek,
        upcomingHappyHoursCount,
        newSpecialsCount,
        votingBannerText: `🗳️ ${getVoterParticipationText(stats?.voters_this_month || 0)} • ${urgencyText}`,
        checkinBannerText: checkinText
          ? `📍 ${checkinText}`
          : '📍 Check in to earn points',
        communityText: stats?.voters_this_month > 10
          ? `${getVoterParticipationText(stats.voters_this_month)}`
          : `Join the ${BRAND.cityName} dining community`,
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

      // Try to fetch from Supabase
      const { data, error } = await supabase.rpc('get_restaurant_social_proof', {
        p_restaurant_id: restaurantId,
      });

      if (error || !data) {
        // Fallback: check local leaderboard
        const leaderboard = await getLeaderboard();
        const restaurantEntries = leaderboard.filter(e => e.restaurant_id === restaurantId);

        if (restaurantEntries.length === 0) {
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

        // Find best tier across categories
        const bestEntry = restaurantEntries.reduce((best, current) => {
          const tierOrder = ['top_pick', 'leading_pick', 'local_favorite', 'on_the_board'];
          return tierOrder.indexOf(current.tier) < tierOrder.indexOf(best.tier) ? current : best;
        });

        return {
          checkinsToday: 0,
          checkinsThisWeek: 0,
          checkinsTotal: 0,
          isTrending: bestEntry.tier === 'top_pick' || bestEntry.tier === 'leading_pick',
          trendingRank: bestEntry.tier === 'top_pick' ? 1 : bestEntry.tier === 'leading_pick' ? 2 : null,
          votingTier: bestEntry.tier as any,
          voteShareText: bestEntry.tier === 'top_pick'
            ? `#1 in ${formatCategory(bestEntry.category)}`
            : bestEntry.tier === 'leading_pick'
              ? `Top 3 in ${formatCategory(bestEntry.category)}`
              : null,
          activityText: null,
          trendingBadge: bestEntry.tier === 'top_pick'
            ? '🏆 Top Pick'
            : bestEntry.tier === 'leading_pick'
              ? '🔥 Trending'
              : null,
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
        trendingBadge: stats?.is_trending ? '🔥 Trending' : null,
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

  return async (restaurantId: string, restaurantName: string) => {
    if (!userId) return;

    // Record to Supabase for aggregate counting
    try {
      await supabase.from('checkins').insert({
        user_id: userId,
        restaurant_id: restaurantId,
        restaurant_name: restaurantName,
        points_earned: 10,
      });
    } catch (error) {
      // Silent fail - local storage is the source of truth
      console.log('Failed to sync checkin to server:', error);
    }
  };
}

/**
 * Format vote category for display
 */
function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    best_wings: 'Best Wings',
    best_burgers: 'Best Burgers',
    best_pizza: 'Best Pizza',
    best_cocktails: 'Best Cocktails',
    best_happy_hour: 'Best Happy Hour',
    best_brunch: 'Best Brunch',
    best_late_night: 'Best Late Night',
    best_live_music: 'Best Live Music',
  };
  return categoryMap[category] || category;
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
      // Get from leaderboard - top picks and leading picks are "trending"
      const leaderboard = await getLeaderboard();
      const trendingIds = new Set<string>();

      leaderboard.forEach(entry => {
        if (entry.tier === 'top_pick' || entry.tier === 'leading_pick') {
          trendingIds.add(entry.restaurant_id);
        }
      });

      // Also try to get from Supabase
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
    },
    staleTime: 5 * 60 * 1000,
  });
}
