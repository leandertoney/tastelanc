import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import {
  getVoteBalance,
  getUserVotes,
  getCurrentMonthVotes,
  submitVote,
  getCategoryLeaderboard,
  getCurrentWinners,
  hasVotedInCategory,
} from '../lib/voting';
import { useAuth } from './useAuth';
import type { VoteCategory, VoteRecord, LeaderboardEntry } from '../types/voting';

/**
 * Hook to get the user's current vote balance
 */
export function useVoteBalance() {
  const { userId } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: userId ? [...queryKeys.voting.balance, userId] : queryKeys.voting.balance,
    queryFn: () => (userId ? getVoteBalance(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    votesAvailable: data?.votes_available ?? 0,
    nextReset: data?.next_reset ?? null,
    isLoading,
    refetch,
  };
}

/**
 * Hook to submit a vote for a restaurant in a category
 */
export function useSubmitVote() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ restaurantId, category }: { restaurantId: string; category: VoteCategory }) => {
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const result = await submitVote(userId, restaurantId, category);
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit vote');
      }
      return result;
    },
    onSuccess: () => {
      if (!userId) return;

      // Invalidate all voting-related queries
      queryClient.invalidateQueries({ queryKey: [...queryKeys.voting.balance, userId] });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.voting.userVotes, userId] });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.voting.monthVotes, userId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.voting.winners });
      queryClient.invalidateQueries({ queryKey: ['voting', 'leaderboard'] });
    },
  });
}

/**
 * Hook to get the user's vote history (all time)
 */
export function useUserVotes() {
  const { userId } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: userId ? [...queryKeys.voting.userVotes, userId] : queryKeys.voting.userVotes,
    queryFn: () => (userId ? getUserVotes(userId) : Promise.resolve([])),
    enabled: !!userId,
  });

  return {
    votes: data ?? [],
    isLoading,
    refetch,
  };
}

/**
 * Hook to get the user's votes for current month
 */
export function useCurrentMonthVotes() {
  const { userId } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: userId ? [...queryKeys.voting.monthVotes, userId] : queryKeys.voting.monthVotes,
    queryFn: () => (userId ? getCurrentMonthVotes(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  return {
    votes: data ?? [],
    isLoading,
    refetch,
  };
}

/**
 * Hook to check if user has voted in a specific category this month
 */
export function useHasVotedInCategory(category: VoteCategory) {
  const { votes } = useCurrentMonthVotes();
  return votes.some((vote) => vote.category === category);
}

/**
 * Hook to get the leaderboard for a category
 */
export function useLeaderboard(category?: VoteCategory) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.voting.leaderboard(category),
    queryFn: () => (category ? getCategoryLeaderboard(category) : Promise.resolve([])),
    enabled: !!category,
  });

  return {
    entries: (data ?? []) as (LeaderboardEntry & { vote_count?: number })[],
    isLoading,
    refetch,
  };
}

/**
 * Hook to get current month's winners (top pick in each category)
 */
export function useCurrentWinners() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.voting.winners,
    queryFn: getCurrentWinners,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    winners: (data ?? []) as (LeaderboardEntry & { vote_count?: number })[],
    isLoading,
    refetch,
  };
}
