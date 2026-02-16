import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { getFavorites, toggleFavorite, isFavorited } from '../lib/favorites';
import { useAuth } from './useAuth';
import { useSignUpModal } from '../context/SignUpModalContext';
import { trackClick } from '../lib/analytics';

/**
 * Hook to get all favorites for the current user
 */
export function useFavorites() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: userId ? [...queryKeys.favorites, userId] : queryKeys.favorites,
    queryFn: () => (userId ? getFavorites(userId) : Promise.resolve([])),
    enabled: !!userId,
    // Favorites change frequently, keep short stale time
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to check if a restaurant is favorited
 */
export function useIsFavorite(restaurantId: string) {
  const { data: favorites = [] } = useFavorites();
  return favorites.includes(restaurantId);
}

/**
 * Hook to toggle favorite status
 * Automatically prompts signup if user is anonymous
 */
export function useToggleFavorite() {
  const { userId, isAnonymous } = useAuth();
  const queryClient = useQueryClient();
  const { showSignUpModal } = useSignUpModal();

  const mutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const result = await toggleFavorite(userId, restaurantId);
      trackClick('favorite', restaurantId);
      return result;
    },
    onMutate: async (restaurantId) => {
      if (!userId) return;

      const queryKey = [...queryKeys.favorites, userId];

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData<string[]>(queryKey);

      // Optimistically update to the new value
      if (previousFavorites) {
        const isFav = previousFavorites.includes(restaurantId);
        queryClient.setQueryData<string[]>(
          queryKey,
          isFav
            ? previousFavorites.filter((id) => id !== restaurantId)
            : [...previousFavorites, restaurantId]
        );
      }

      return { previousFavorites };
    },
    onError: (_err, _restaurantId, context) => {
      if (!userId) return;

      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousFavorites) {
        queryClient.setQueryData([...queryKeys.favorites, userId], context.previousFavorites);
      }
    },
    onSettled: () => {
      if (!userId) return;

      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [...queryKeys.favorites, userId] });
    },
  });

  // Wrap mutate to check auth first
  const mutate = useCallback(
    (restaurantId: string) => {
      // If no user or user is anonymous, show signup modal
      if (!userId || isAnonymous) {
        console.log('useToggleFavorite: User needs to sign up - userId:', userId, 'isAnonymous:', isAnonymous);
        showSignUpModal({
          action: 'save this restaurant',
          onSuccess: () => {
            // After signup, the user can tap again to favorite
            // We don't auto-favorite because userId in this closure is stale
          },
        });
        return;
      }

      mutation.mutate(restaurantId);
    },
    [userId, isAnonymous, showSignUpModal, mutation]
  );

  return {
    ...mutation,
    mutate,
  };
}
