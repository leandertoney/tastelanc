import { useQuery } from '@tanstack/react-query';
import { getSupabase, getBrand } from '../config/theme';

/**
 * Returns a Set of restaurant IDs that are official stops on the
 * 2026 Cumberland Valley Coffee & Chocolate Trail.
 * Uses React Query so the fetch is deduplicated across all card instances.
 */
export function useCoffeeChocolateTrailIds(): Set<string> {
  const brand = getBrand();
  const marketSlug = brand.marketSlug;

  const { data } = useQuery({
    queryKey: ['coffeeChocolateTrailIds', marketSlug],
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
      let query = supabase
        .from('holiday_specials')
        .select('restaurant:restaurants!inner(id, market_id)')
        .eq('holiday_tag', 'coffee-chocolate-trail-2026')
        .eq('is_active', true);
      if (marketId) query = (query as any).eq('restaurant.market_id', marketId);
      const { data: rows } = await query;
      return ((rows || []) as any[]).map((row) => row.restaurant.id as string);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return new Set(data || []);
}
