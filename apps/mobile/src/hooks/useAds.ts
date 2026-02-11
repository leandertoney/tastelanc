import { useQuery } from '@tanstack/react-query';
import { getActiveAds } from '../lib/ads';

/**
 * Hook to fetch active featured ads.
 * Stale time matches featured restaurants (5 min) so they refresh together.
 */
export function useActiveAds() {
  return useQuery({
    queryKey: ['featuredAds'],
    queryFn: getActiveAds,
    staleTime: 5 * 60 * 1000,
  });
}
