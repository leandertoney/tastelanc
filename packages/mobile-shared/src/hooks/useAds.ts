import { useQuery } from '@tanstack/react-query';
import { getActiveAds } from '../lib/ads';
import { useMarket } from '../context/MarketContext';

/**
 * Hook to fetch active featured ads.
 * Stale time matches featured restaurants (5 min) so they refresh together.
 */
export function useActiveAds() {
  const { marketId } = useMarket();

  return useQuery({
    queryKey: ['featuredAds', marketId],
    queryFn: () => getActiveAds(marketId),
    staleTime: 5 * 60 * 1000,
  });
}
