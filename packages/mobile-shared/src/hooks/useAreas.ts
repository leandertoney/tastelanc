import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../config/theme';
import { useMarket } from '../context/MarketContext';
import type { Area } from '../lib/areaVisits';

/**
 * Fetches all active neighborhood areas for the current market.
 * Used by the map neighborhood selector and Explore tab neighborhood filter.
 */
export function useAreas() {
  const { marketId } = useMarket();

  return useQuery<Area[]>({
    queryKey: ['areas', marketId],
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from('areas')
        .select('id, name, slug, description, latitude, longitude, radius, is_active')
        .eq('is_active', true)
        .order('name');

      if (marketId) {
        // @ts-ignore — PostgREST chaining type limitation
        query = query.eq('market_id', marketId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as Area[]) || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}
