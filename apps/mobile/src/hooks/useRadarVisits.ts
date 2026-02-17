import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { onGeofenceEntry, onAreaGeofenceEntry, setRadarUserId, type RadarVisit, type RadarAreaVisit } from '../lib/radar';
import { recordPassiveVisit, getVisitedRestaurants, getVisitCounts, getRecentVisits } from '../lib/visits';
import { recordAreaVisit, markNotificationSent } from '../lib/areaVisits';
import { triggerAreaNotification } from '../lib/notifications';
import { queryKeys } from '../lib/queryClient';

/**
 * Hook to handle Radar geofence events and record visits
 * Handles both restaurant geofences and area (neighborhood) geofences
 * Should be used once at the app level (in Navigation or App component)
 */
export function useRadarVisits(): void {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const restaurantCleanupRef = useRef<(() => void) | null>(null);
  const areaCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Set user ID in Radar for analytics
    setRadarUserId(userId);

    // Listen for restaurant geofence entry events
    restaurantCleanupRef.current = onGeofenceEntry(async (visit: RadarVisit) => {
      console.log('[useRadarVisits] Restaurant geofence entry detected:', visit.restaurantId);

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

    // Listen for area geofence entry events (neighborhoods/districts)
    areaCleanupRef.current = onAreaGeofenceEntry(async (visit: RadarAreaVisit) => {
      console.log('[useRadarVisits] Area geofence entry detected:', visit.areaId, visit.areaName);

      // Record the area visit and check if it's the first visit
      const result = await recordAreaVisit(userId, visit.areaId);

      if (!result.error && result.isFirstVisit) {
        // First visit to this area - send notification
        console.log('[useRadarVisits] First visit to area, sending notification');

        // Trigger the push notification (pass 0 for count to use generic message)
        const notificationSent = await triggerAreaNotification(
          userId,
          visit.areaId,
          visit.areaName,
          0
        );

        if (notificationSent) {
          // Mark notification as sent to prevent duplicates
          await markNotificationSent(userId, visit.areaId);
          console.log('[useRadarVisits] Area notification sent successfully');
        }

        // Invalidate area visits cache
        queryClient.invalidateQueries({ queryKey: ['areaVisits', userId] });
      }
    });

    // Cleanup on unmount or userId change
    return () => {
      if (restaurantCleanupRef.current) {
        restaurantCleanupRef.current();
        restaurantCleanupRef.current = null;
      }
      if (areaCleanupRef.current) {
        areaCleanupRef.current();
        areaCleanupRef.current = null;
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
      // Invalidate voting eligibility so VoteRestaurantScreen reflects the new visit
      queryClient.invalidateQueries({ queryKey: ['voting', 'eligibility'] });
    }

    return result;
  }, [userId, queryClient]);

  return { recordVisit };
}
