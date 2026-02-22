/**
 * Favorites hook — cloud-backed via Supabase `favorites` table
 *
 * Heart (❤️) = favorited (been there, loved it)
 * This replaces the original AsyncStorage implementation so favorites
 * persist across devices and Expo Go sessions.
 */
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useSignUpModal } from '../context/SignUpModalContext';
import { trackClick } from '../lib/analytics';
import { requestReviewIfEligible } from '../lib/reviewPrompts';

const FAVORITES_KEY = 'favorites';

/**
 * Get all favorited restaurant IDs for the current user
 */
export function useFavorites() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: [FAVORITES_KEY, userId],
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('favorites')
        .select('restaurant_id')
        .eq('user_id', userId);
      if (error) throw error;
      return (data || []).map((r: { restaurant_id: string }) => r.restaurant_id);
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/**
 * Check if a specific restaurant is favorited
 */
export function useIsFavorite(restaurantId: string) {
  const { data: favorites = [] } = useFavorites();
  return favorites.includes(restaurantId);
}

/**
 * Toggle favorite status for a restaurant
 * Prompts signup if the user is anonymous
 */
export function useToggleFavorite() {
  const { userId, isAnonymous } = useAuth();
  const queryClient = useQueryClient();
  const { showSignUpModal } = useSignUpModal();

  const mutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      if (!userId) throw new Error('Not authenticated');

      // Check if already favorited
      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (existing) {
        // Remove
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('restaurant_id', restaurantId);
        if (error) throw error;
        return { added: false };
      } else {
        // Add
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: userId, restaurant_id: restaurantId });
        if (error) throw error;
        trackClick('favorite', restaurantId);
        requestReviewIfEligible('first_save');
        return { added: true };
      }
    },
    onMutate: async (restaurantId) => {
      if (!userId) return;
      const queryKey = [FAVORITES_KEY, userId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<string[]>(queryKey) || [];
      const isFav = previous.includes(restaurantId);
      queryClient.setQueryData<string[]>(
        queryKey,
        isFav
          ? previous.filter((id) => id !== restaurantId)
          : [...previous, restaurantId]
      );
      return { previous };
    },
    onError: (_err, _restaurantId, context) => {
      if (!userId || !context?.previous) return;
      // Roll back the optimistic update
      queryClient.setQueryData([FAVORITES_KEY, userId], context.previous);
      Alert.alert('Error', "Could not save favorite. Make sure you're signed in.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [FAVORITES_KEY, userId] });
    },
  });

  const mutate = useCallback(
    (restaurantId: string) => {
      if (!userId || isAnonymous) {
        showSignUpModal({
          action: 'save this restaurant',
          onSuccess: () => {
            // User must re-tap after signing up (userId in closure is stale)
          },
        });
        return;
      }
      mutation.mutate(restaurantId);
    },
    [userId, isAnonymous, showSignUpModal, mutation]
  );

  return { ...mutation, mutate };
}
