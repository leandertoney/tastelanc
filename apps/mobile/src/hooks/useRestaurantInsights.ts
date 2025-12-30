/**
 * Restaurant Insights Hook
 *
 * React Query hook for fetching restaurant insights data
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getRestaurantInsights,
  invalidateInsightsCache,
  type RestaurantInsights,
} from '../lib/restaurantInsights';

// Query key factory
const insightsKeys = {
  all: ['insights'] as const,
  restaurant: (id: string) => ['insights', 'restaurant', id] as const,
};

/**
 * Hook to fetch insights for a specific restaurant
 */
export function useRestaurantInsights(restaurantId: string | null) {
  return useQuery({
    queryKey: insightsKeys.restaurant(restaurantId || ''),
    queryFn: async (): Promise<RestaurantInsights | null> => {
      if (!restaurantId) return null;

      const { data, error } = await getRestaurantInsights(restaurantId);

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000, // 5 minutes (matches service cache)
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

/**
 * Hook to refresh insights data
 */
export function useRefreshInsights() {
  const queryClient = useQueryClient();

  return async (restaurantId?: string) => {
    // Clear the service-level cache
    invalidateInsightsCache(restaurantId);

    // Invalidate React Query cache
    if (restaurantId) {
      await queryClient.invalidateQueries({
        queryKey: insightsKeys.restaurant(restaurantId),
      });
    } else {
      await queryClient.invalidateQueries({
        queryKey: insightsKeys.all,
      });
    }
  };
}

// Re-export types for convenience
export type { RestaurantInsights } from '../lib/restaurantInsights';
