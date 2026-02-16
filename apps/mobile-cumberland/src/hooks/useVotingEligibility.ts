/**
 * React Query hooks for voting eligibility based on Supabase visits
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { queryKeys } from '../lib/queryClient';
import {
  canVoteForRestaurant,
  batchCheckVotingEligibility,
} from '../lib/votingEligibility';
import type { VotingEligibility } from '../types/voting';

/**
 * Hook to check voting eligibility for a single restaurant
 */
export function useVotingEligibility(restaurantId: string, restaurantName: string) {
  const { userId } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<VotingEligibility>({
    queryKey: [...queryKeys.voting.eligibility([restaurantId]), userId],
    queryFn: () => canVoteForRestaurant(userId!, restaurantId, restaurantName),
    enabled: !!userId && !!restaurantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  return {
    canVote: data?.canVote ?? false,
    reason: data?.reason,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to batch check voting eligibility for multiple restaurants
 */
export function useBatchVotingEligibility(restaurantIds: string[]) {
  const { userId } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKeys.voting.eligibility(restaurantIds), userId],
    queryFn: () => batchCheckVotingEligibility(userId!, restaurantIds),
    enabled: !!userId && restaurantIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  return {
    eligibilityMap: data ?? {},
    isLoading,
    error,
    refetch,
    isEligible: (restaurantId: string) => data?.[restaurantId] ?? false,
  };
}

/**
 * Hook to get eligibility status for a restaurant in a list
 */
export function useRestaurantEligibilityStatus(
  restaurantId: string,
  eligibilityMap: Record<string, boolean>,
  isMapLoading: boolean
): 'loading' | 'eligible' | 'ineligible' {
  if (isMapLoading) return 'loading';
  if (!(restaurantId in eligibilityMap)) return 'loading';
  return eligibilityMap[restaurantId] ? 'eligible' : 'ineligible';
}
