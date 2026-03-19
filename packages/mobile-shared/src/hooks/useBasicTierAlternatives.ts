import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../config/theme';
import type { Restaurant, RestaurantCategory, CuisineType } from '../types/database';

export type RestaurantWithTierName = Restaurant & { tierName: string };

async function fetchBasicTierAlternatives(
  categories: RestaurantCategory[],
  cuisine: CuisineType | null,
  marketId: string,
  excludeId: string
): Promise<RestaurantWithTierName[]> {
  const supabase = getSupabase();

  let query = supabase
    .from('restaurants')
    .select('*, tiers!inner(name)')
    .eq('is_active', true)
    .eq('market_id', marketId)
    .neq('id', excludeId)
    .in('tiers.name', ['premium', 'elite'])
    .limit(6);

  // Build correlation filter (categories overlap OR cuisine match)
  const filters: string[] = [];
  if (categories && categories.length > 0) {
    filters.push(`categories.ov.{${categories.join(',')}}`);
  }
  if (cuisine) {
    filters.push(`cuisine.eq.${cuisine}`);
  }
  if (filters.length > 0) {
    query = query.or(filters.join(','));
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[useBasicTierAlternatives] Query error:', error.message);
    return [];
  }

  if (!data) return [];

  return data.map((row: any) => ({
    ...row,
    tierName: row.tiers?.name ?? 'premium',
    tiers: undefined,
  }));
}

export function useBasicTierAlternatives(
  categories: RestaurantCategory[],
  cuisine: CuisineType | null,
  marketId: string | null,
  excludeId: string
) {
  return useQuery<RestaurantWithTierName[]>({
    queryKey: ['basicTierAlts', excludeId, marketId],
    queryFn: () =>
      fetchBasicTierAlternatives(categories, cuisine, marketId!, excludeId),
    staleTime: 5 * 60 * 1000,
    enabled: !!marketId && !!excludeId,
    placeholderData: [],
  });
}
