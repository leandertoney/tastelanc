/**
 * Hooks for video recommendations — fetching, liking, posting.
 */
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../config/theme';
import { useAuth } from './useAuth';
import { useSignUpModal } from '../context/SignUpModalContext';
import { queryKeys } from '../lib/queryKeys';
import { toggleLike, flagRecommendation, deleteRecommendation } from '../lib/videoRecommendations';
import type { VideoRecommendationWithUser, ReviewerStats } from '../types/database';

/**
 * Fetch all visible recommendations for a restaurant.
 * Pinned recommendations appear first, then by newest.
 */
export function useRestaurantRecommendations(restaurantId: string) {
  return useQuery({
    queryKey: queryKeys.recommendations.byRestaurant(restaurantId),
    queryFn: async (): Promise<VideoRecommendationWithUser[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('restaurant_recommendations')
        .select('*, profiles:user_id(display_name, avatar_url)')
        .eq('restaurant_id', restaurantId)
        .eq('is_visible', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as VideoRecommendationWithUser[];
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch all recommendations by a specific user.
 */
export function useUserRecommendations(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.recommendations.byUser(userId || ''),
    queryFn: async (): Promise<VideoRecommendationWithUser[]> => {
      if (!userId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('restaurant_recommendations')
        .select('*, profiles:user_id(display_name, avatar_url)')
        .eq('user_id', userId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as VideoRecommendationWithUser[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch trending recommendations across a market.
 */
export function useTrendingRecommendations(marketId?: string) {
  return useQuery({
    queryKey: queryKeys.recommendations.trending(marketId),
    queryFn: async (): Promise<VideoRecommendationWithUser[]> => {
      const supabase = getSupabase();
      let query = supabase
        .from('restaurant_recommendations')
        .select('*, profiles:user_id(display_name, avatar_url), restaurants:restaurant_id(name, slug)')
        .eq('is_visible', true)
        .order('view_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (marketId) {
        query = query.eq('market_id', marketId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as VideoRecommendationWithUser[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch the IDs of recommendations the current user has liked.
 */
export function useUserLikedRecommendations() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.recommendations.likes(userId || ''),
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('recommendation_likes')
        .select('recommendation_id')
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []).map((r: { recommendation_id: string }) => r.recommendation_id);
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/**
 * Toggle like on a recommendation. Prompts signup if anonymous.
 * Uses optimistic update for instant UI feedback.
 */
export function useToggleRecommendationLike() {
  const { userId, isAnonymous } = useAuth();
  const { showSignUpModal } = useSignUpModal();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      if (!userId) throw new Error('Not signed in');
      return toggleLike(recommendationId, userId);
    },
    onMutate: async (recommendationId: string) => {
      if (!userId) return;
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.recommendations.likes(userId) });

      // Snapshot previous likes
      const previousLikes = queryClient.getQueryData<string[]>(
        queryKeys.recommendations.likes(userId)
      ) || [];

      // Optimistically toggle
      const isCurrentlyLiked = previousLikes.includes(recommendationId);
      const newLikes = isCurrentlyLiked
        ? previousLikes.filter((id: string) => id !== recommendationId)
        : [...previousLikes, recommendationId];

      queryClient.setQueryData(queryKeys.recommendations.likes(userId), newLikes);

      return { previousLikes };
    },
    onError: (_err, _recommendationId, context) => {
      // Rollback on error
      if (context?.previousLikes && userId) {
        queryClient.setQueryData(
          queryKeys.recommendations.likes(userId),
          context.previousLikes,
        );
      }
    },
    onSettled: () => {
      // Refetch to sync with server
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.likes(userId) });
      }
    },
  });

  // Gate anonymous users outside the mutation
  const wrappedMutate = useCallback((recommendationId: string) => {
    if (!userId || isAnonymous) {
      showSignUpModal({ action: 'like_recommendation' });
      return;
    }
    mutation.mutate(recommendationId);
  }, [userId, isAnonymous, showSignUpModal, mutation]);

  return { ...mutation, mutate: wrappedMutate };
}

/**
 * Flag a recommendation for moderation.
 */
export function useFlagRecommendation() {
  return useMutation({
    mutationFn: async (recommendationId: string) => {
      await flagRecommendation(recommendationId);
    },
    onSuccess: () => {
      Alert.alert('Reported', 'Thanks for helping keep the community positive. We\'ll review this.');
    },
  });
}

/**
 * Delete own recommendation.
 */
export function useDeleteRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recommendationId: string) => {
      await deleteRecommendation(recommendationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

/**
 * Fetch reviewer stats for a user (total recommendations, views, likes).
 */
export function useReviewerStats(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.recommendations.reviewerStats(userId || ''),
    queryFn: async (): Promise<ReviewerStats | null> => {
      if (!userId) return null;
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('restaurant_recommendations')
        .select('id, view_count, like_count')
        .eq('user_id', userId)
        .eq('is_visible', true);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      return {
        user_id: userId,
        total_recommendations: data.length,
        total_views: data.reduce((sum: number, r: any) => sum + (r.view_count || 0), 0),
        total_likes: data.reduce((sum: number, r: any) => sum + (r.like_count || 0), 0),
      };
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}
