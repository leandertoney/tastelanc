/**
 * Bucket List / Wishlist hook
 * Lets users save restaurants they want to visit (separate from favorites)
 * Heart = favorited (been there, loved it)
 * Bookmark = wishlist (want to go)
 */
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useSignUpModal } from '../context/SignUpModalContext';

const WISHLIST_KEY = 'wishlist';

/**
 * Get all wishlisted restaurant IDs for the current user
 */
export function useWishlist() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: [WISHLIST_KEY, userId],
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('wishlist')
        .select('restaurant_id')
        .eq('user_id', userId);
      if (error) throw error;
      return (data || []).map((r: { restaurant_id: string }) => r.restaurant_id);
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

/**
 * Check if a specific restaurant is on the wishlist
 */
export function useIsWishlisted(restaurantId: string) {
  const { data: wishlist = [] } = useWishlist();
  return wishlist.includes(restaurantId);
}

/**
 * Toggle a restaurant on/off the wishlist
 * Prompts signup if anonymous
 */
export function useToggleWishlist() {
  const { userId, isAnonymous } = useAuth();
  const queryClient = useQueryClient();
  const { showSignUpModal } = useSignUpModal();

  const mutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      if (!userId) throw new Error('Not authenticated');

      // Check current state
      const { data: existing } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (existing) {
        // Remove from wishlist
        await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', userId)
          .eq('restaurant_id', restaurantId);
        return { added: false };
      } else {
        // Add to wishlist
        await supabase
          .from('wishlist')
          .insert({ user_id: userId, restaurant_id: restaurantId });
        return { added: true };
      }
    },
    onMutate: async (restaurantId) => {
      if (!userId) return;
      const queryKey = [WISHLIST_KEY, userId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<string[]>(queryKey) || [];
      const isWishlisted = previous.includes(restaurantId);
      queryClient.setQueryData<string[]>(
        queryKey,
        isWishlisted
          ? previous.filter((id) => id !== restaurantId)
          : [...previous, restaurantId]
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (!userId || !context?.previous) return;
      queryClient.setQueryData([WISHLIST_KEY, userId], context.previous);
      Alert.alert('Error', "Could not update bucket list. Make sure you're signed in.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [WISHLIST_KEY, userId] });
    },
  });

  const mutate = useCallback(
    (restaurantId: string) => {
      if (!userId || isAnonymous) {
        showSignUpModal({
          action: 'add to your bucket list',
          onSuccess: () => {},
        });
        return;
      }
      mutation.mutate(restaurantId);
    },
    [userId, isAnonymous, showSignUpModal, mutation]
  );

  return { ...mutation, mutate };
}
