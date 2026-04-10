import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hasPremiumAccess } from '../lib/subscription';

const PREMIUM_QUERY_KEY = ['premium-status'];

/**
 * React hook for checking premium status.
 * Uses React Query with 60-second stale time for performance.
 */
export function usePremiumStatus() {
  const queryClient = useQueryClient();

  const { data: isPremium = false, isLoading } = useQuery({
    queryKey: PREMIUM_QUERY_KEY,
    queryFn: hasPremiumAccess,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: PREMIUM_QUERY_KEY });
  };

  return { isPremium, isLoading, refetch };
}
