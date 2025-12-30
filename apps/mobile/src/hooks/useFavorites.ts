import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { getFavorites, toggleFavorite, isFavorited } from '../lib/favorites';
import { useAuth } from './useAuth';

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
 */
export function useToggleFavorite() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (restaurantId: string) => {
      if (!userId) {
        throw new Error('User not authenticated');
      }
      return toggleFavorite(userId, restaurantId);
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
}
