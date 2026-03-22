import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../config/theme';

export interface OtherCity {
  id: string;
  name: string;
  slug: string;
  instagram_handle: string;
  app_store_url: string;
  play_store_url: string;
}

/**
 * Returns markets that have an active Instagram account connected,
 * excluding the current market. Used by OtherCitiesSection on the Profile tab.
 *
 * Powered by the get_markets_with_instagram() Postgres RPC — adding a new
 * market's instagram_accounts row (is_active=true) and populating
 * markets.instagram_handle causes it to appear here automatically.
 *
 * 24-hour cache: this data changes very rarely.
 */
export function useOtherCities(currentMarketId: string | null): {
  cities: OtherCity[];
  isLoading: boolean;
} {
  const { data = [], isLoading } = useQuery({
    queryKey: ['otherCities', currentMarketId],
    queryFn: async (): Promise<OtherCity[]> => {
      const { data, error } = await getSupabase().rpc('get_markets_with_instagram');
      if (error) throw error;
      return ((data ?? []) as OtherCity[]).filter((m) => m.id !== currentMarketId);
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  return { cities: data, isLoading };
}
