/**
 * React Query hooks for voting eligibility based on Radar dwell time
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  canVoteForRestaurant,
  batchCheckVotingEligibility,
  type VotingEligibility,
} from '../lib/radarDwellTime';

export const votingEligibilityKeys = {
  single: (restaurantId: string) => ['votingEligibility', restaurantId] as const,
  batch: (restaurantIds: string[]) =>
    ['votingEligibility', 'batch', restaurantIds.sort().join(',')] as const,
};

/**
 * Hook to check voting eligibility for a single restaurant
 * Used when viewing a specific restaurant's details before voting
 */
export function useVotingEligibility(restaurantId: string, restaurantName: string) {
  const { userId } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: userId
      ? [...votingEligibilityKeys.single(restaurantId), userId]
      : votingEligibilityKeys.single(restaurantId),
    queryFn: () => canVoteForRestaurant(userId!, restaurantId, restaurantName),
    enabled: !!userId && !!restaurantId,
    staleTime: 5 * 60 * 1000, // 5 minutes - dwell time doesn't change rapidly
    retry: 1,
  });

  return {
    canVote: data?.canVote ?? false,
    reason: data?.reason,
    dwellTimeResult: data?.dwellTimeResult,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to batch check voting eligibility for multiple restaurants
 * Used on the voting screen to show eligibility status for all restaurants
 */
export function useBatchVotingEligibility(restaurantIds: string[]) {
  const { userId } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: userId
      ? [...votingEligibilityKeys.batch(restaurantIds), userId]
      : votingEligibilityKeys.batch(restaurantIds),
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
    // Helper to check a specific restaurant
    isEligible: (restaurantId: string) => data?.[restaurantId] ?? false,
  };
}

/**
 * Hook to get eligibility status with loading state for a restaurant in a list
 * Returns simplified status for UI display
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
