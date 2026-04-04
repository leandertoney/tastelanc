import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../config/theme';
import { useMarket } from '../context/MarketContext';
import { queryKeys } from '../lib/queryKeys';
import type { Restaurant } from '../types/database';

/**
 * Fetches restaurants confirmed open on Mondays and/or Tuesdays for the
 * current market. Used by the "Open on Your Night Off" HomeScreen section.
 *
 * Deduplication: a restaurant open both Mon AND Tue appears only once.
 * Market scoped: joins through restaurants!inner to enforce market isolation.
 */
export function useNightOffRestaurants() {
  const { marketId } = useMarket();

  return useQuery({
    queryKey: queryKeys.nightOff.restaurants(marketId),
    queryFn: async (): Promise<Restaurant[]> => {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('restaurant_hours')
        .select('restaurant_id, restaurant:restaurants!inner(*, market_id)')
        .in('day_of_week', ['monday', 'tuesday'])
        .eq('is_closed', false)
        .not('open_time', 'is', null)
        .eq('restaurant.market_id', marketId);

      if (error) {
        console.warn('useNightOffRestaurants query failed:', error.message);
        return [];
      }

      // Deduplicate by restaurant_id — a restaurant open both Mon AND Tue
      // should appear only once. Use a Map keyed by restaurant_id.
      const seen = new Map<string, Restaurant>();
      for (const row of data || []) {
        if (!seen.has(row.restaurant_id)) {
          // The join returns restaurant as a single object (not an array)
          const restaurant = row.restaurant as unknown as Restaurant;
          if (restaurant) {
            seen.set(row.restaurant_id, restaurant);
          }
        }
      }

      return Array.from(seen.values()).slice(0, 15);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!marketId,
  });
}
