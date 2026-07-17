import { useQuery } from '@tanstack/react-query';
import { getSupabase, getBrand } from '../config/theme';

/**
 * Returns a Set of restaurant IDs currently in Restaurant Week.
 *
 * Membership is driven by the admin-controlled restaurants.is_lrw column (not
 * holiday_specials as before). RW ended April 2026, so is_lrw defaults to false
 * for every restaurant — the badge is off everywhere until an admin re-enables it
 * per restaurant for a future Restaurant Week.
 *
 * Uses React Query so the fetch is deduplicated across all card instances.
 */
export function useRestaurantWeekIds(): Set<string> {
  const brand = getBrand();
  const marketSlug = brand.marketSlug;

  const { data } = useQuery({
    queryKey: ['restaurantWeekIds', marketSlug],
    queryFn: async () => {
      const supabase = getSupabase();
      let marketId: string | null = null;
      if (marketSlug) {
        const { data: m } = await supabase
          .from('markets')
          .select('id')
          .eq('slug', marketSlug)
          .single();
        marketId = m?.id || null;
      }
      // Market isolation (per CLAUDE.md): restaurants has market_id directly.
      let query = supabase
        .from('restaurants')
        .select('id')
        .eq('is_lrw', true);
      if (marketId) query = (query as any).eq('market_id', marketId);
      const { data: rows } = await query;
      return ((rows || []) as any[]).map((row) => row.id as string);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return new Set(data || []);
}
