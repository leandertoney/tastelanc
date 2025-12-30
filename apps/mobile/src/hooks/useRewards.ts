/**
 * React Query hooks for rewards system
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  getRewardsBalance,
  getRewardsHistory,
  earnPoints,
  type EarnPointsRequest,
  type RewardsBalance,
  type RewardsHistoryItem,
  type RewardsHistoryResponse,
} from '../lib/rewards';
import { isPremiumUser } from '../lib/subscription';

// Query keys for rewards
export const rewardsQueryKeys = {
  balance: ['rewards', 'balance'] as const,
  history: ['rewards', 'history'] as const,
  premium: ['rewards', 'premium'] as const,
};

/**
 * Hook to get rewards balance with premium status
 */
export function useRewardsBalance() {
  const { userId } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: userId ? [...rewardsQueryKeys.balance, userId] : rewardsQueryKeys.balance,
    queryFn: getRewardsBalance,
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });

  return {
    totalPoints: data?.total_points ?? 0,
    lifetimePoints: data?.lifetime_points ?? 0,
    isPremium: data?.premium_active ?? false,
    multiplier: data?.multiplier ?? 1.0,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get rewards history with infinite scroll pagination
 */
export function useRewardsHistory(limit: number = 20) {
  const { userId } = useAuth();

  return useInfiniteQuery({
    queryKey: userId ? [...rewardsQueryKeys.history, userId] : rewardsQueryKeys.history,
    queryFn: async ({ pageParam = 0 }) => {
      return getRewardsHistory(limit, pageParam);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.has_more) return undefined;
      return allPages.length * limit;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get flat list of all loaded history items
 */
export function useRewardsHistoryFlat(limit: number = 20) {
  const query = useRewardsHistory(limit);

  const items: RewardsHistoryItem[] = query.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    items,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    error: query.error,
  };
}

/**
 * Hook to earn points for an action
 */
export function useEarnPoints() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: earnPoints,
    onSuccess: () => {
      // Invalidate balance and history to refresh
      if (userId) {
        queryClient.invalidateQueries({ queryKey: [...rewardsQueryKeys.balance, userId] });
        queryClient.invalidateQueries({ queryKey: [...rewardsQueryKeys.history, userId] });
      }
    },
  });
}

/**
 * Hook to get premium multiplier status
 * Queries consumer_subscriptions table directly for accurate status
 */
export function usePremiumMultiplier() {
  const { userId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: userId ? [...rewardsQueryKeys.premium, userId] : rewardsQueryKeys.premium,
    queryFn: async () => {
      if (!userId) return { isPremium: false, multiplier: 1.0 };
      const premium = await isPremiumUser(userId);
      return {
        isPremium: premium,
        multiplier: premium ? 2.5 : 1.0,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - subscription doesn't change often
  });

  return {
    isPremium: data?.isPremium ?? false,
    multiplier: data?.multiplier ?? 1.0,
    isLoading,
  };
}

/**
 * Hook to invalidate all rewards queries
 * Useful after actions that affect points
 */
export function useInvalidateRewards() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return () => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: [...rewardsQueryKeys.balance, userId] });
      queryClient.invalidateQueries({ queryKey: [...rewardsQueryKeys.history, userId] });
    }
  };
}
