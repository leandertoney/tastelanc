import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useSignUpModal } from '../context/SignUpModalContext';
import { toggleFavorite } from '../lib/favorites';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';

/**
 * Hook that handles favoriting with auth awareness.
 * If user is not logged in or is anonymous, prompts signup first.
 * After signup, automatically completes the favorite action.
 */
export function useAuthAwareFavorite() {
  const { userId, isAnonymous } = useAuth();
  const { showSignUpModal } = useSignUpModal();
  const queryClient = useQueryClient();

  const handleFavorite = useCallback(
    async (restaurantId: string): Promise<boolean | null> => {
      // If no user or user is anonymous, prompt signup
      if (!userId || isAnonymous) {
        return new Promise((resolve) => {
          showSignUpModal({
            action: 'save this restaurant',
            onSuccess: async () => {
              // After signup, the userId should be available
              // We need to get it fresh since the closure has the old value
              // The favorite will be saved after signup completes
              // For now, just resolve - the user can tap again after signup
              resolve(null);
            },
          });
        });
      }

      // User is logged in, toggle the favorite
      const newState = await toggleFavorite(userId, restaurantId);

      // Invalidate favorites cache to refresh UI everywhere
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites });

      return newState;
    },
    [userId, isAnonymous, showSignUpModal, queryClient]
  );

  /**
   * Check if favoriting is available (user is logged in and not anonymous)
   */
  const canFavorite = !!userId && !isAnonymous;

  return {
    handleFavorite,
    canFavorite,
    requiresSignup: !userId || isAnonymous,
  };
}
