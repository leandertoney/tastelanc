import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { onGeofenceEntry, setRadarUserId, type RadarVisit } from '../lib/radar';
import { recordPassiveVisit, getVisitedRestaurants, getVisitCounts, getRecentVisits } from '../lib/visits';
import { queryKeys } from '../lib/queryClient';

/**
 * Hook to handle Radar geofence events and record visits
 * Should be used once at the app level (in Navigation or App component)
 */
export function useRadarVisits(): void {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Set user ID in Radar for analytics
    setRadarUserId(userId);

    // Listen for geofence entry events
    cleanupRef.current = onGeofenceEntry(async (visit: RadarVisit) => {
      console.log('[useRadarVisits] Geofence entry detected:', visit.restaurantId);

      // Record the visit (won't duplicate if already visited today)
      const result = await recordPassiveVisit(userId, visit.restaurantId, 'radar');

      if (!result.error && !result.alreadyRecorded) {
        // Invalidate recommendations to reflect new visit data
        queryClient.invalidateQueries({ queryKey: queryKeys.restaurants.recommendations });

        // Invalidate visits cache
        queryClient.invalidateQueries({ queryKey: ['visits', userId] });

        console.log('[useRadarVisits] Visit recorded and caches invalidated');
      }
    });

    // Cleanup on unmount or userId change
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [userId, queryClient]);
}

/**
 * Hook to get user's visited restaurants
 */
export function useVisitedRestaurants(limit: number = 50) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['visits', userId, 'list', limit],
    queryFn: async () => {
      if (!userId) return { data: [], error: null };
      return getVisitedRestaurants(userId, limit);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get visit counts per restaurant
 * Useful for "Places You Love" scoring
 */
export function useVisitCounts() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['visits', userId, 'counts'],
    queryFn: async () => {
      if (!userId) return { counts: {}, error: null };
      return getVisitCounts(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get recently visited restaurant IDs
 */
export function useRecentVisits(days: number = 30) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['visits', userId, 'recent', days],
    queryFn: async () => {
      if (!userId) return { restaurantIds: [], error: null };
      return getRecentVisits(userId, days);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to manually record a visit
 * For use cases where user explicitly checks in
 */
export function useRecordVisit() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const recordVisit = useCallback(async (restaurantId: string) => {
    if (!userId) {
      return { error: new Error('User not authenticated') };
    }

    const result = await recordPassiveVisit(userId, restaurantId, 'manual');

    if (!result.error && !result.alreadyRecorded) {
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: queryKeys.restaurants.recommendations });
      queryClient.invalidateQueries({ queryKey: ['visits', userId] });
    }

    return result;
  }, [userId, queryClient]);

  return { recordVisit };
}
