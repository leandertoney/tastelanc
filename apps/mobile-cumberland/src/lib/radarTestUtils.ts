/**
 * Radar Test Utilities
 *
 * DEV-ONLY utilities for testing Radar geofence functionality
 * without being physically present at a restaurant location.
 *
 * These functions simulate Radar SDK events and record visits
 * to Supabase for testing the recommendation scoring system.
 */

import { supabase } from './supabase';
import { recordPassiveVisit } from './visits';

// Only enable in development mode
const IS_DEV = __DEV__;

export interface MockRadarEvent {
  type: 'user.entered_geofence' | 'user.exited_geofence';
  restaurantId: string;
  restaurantName?: string;
  confidence: 'high' | 'medium' | 'low';
  timestamp: string;
}

export interface TestVisitResult {
  success: boolean;
  message: string;
  event?: MockRadarEvent;
  visitId?: string;
  error?: string;
}

/**
 * Simulate a Radar geofence entry event for a restaurant
 *
 * DEV-ONLY: This function is only available in development mode.
 *
 * @param userId - The user ID to record the visit for
 * @param restaurantId - The restaurant UUID to simulate entering
 * @returns Result object with success status and details
 */
export async function simulateGeofenceEntry(
  userId: string,
  restaurantId: string
): Promise<TestVisitResult> {
  // Guard: Only allow in development
  if (!IS_DEV) {
    console.warn('[RadarTest] simulateGeofenceEntry is only available in development mode');
    return {
      success: false,
      message: 'Test utilities are only available in development mode',
    };
  }

  console.log('[RadarTest] Simulating geofence entry...');
  console.log(`  User ID:     ${userId}`);
  console.log(`  Restaurant:  ${restaurantId}`);

  try {
    // 1. Verify restaurant exists and get name
    const { data: restaurant, error: fetchError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single();

    if (fetchError || !restaurant) {
      console.error('[RadarTest] Restaurant not found:', fetchError);
      return {
        success: false,
        message: `Restaurant not found: ${restaurantId}`,
        error: fetchError?.message,
      };
    }

    console.log(`  Restaurant Name: ${restaurant.name}`);

    // 2. Create mock Radar event
    const mockEvent: MockRadarEvent = {
      type: 'user.entered_geofence',
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      confidence: 'high',
      timestamp: new Date().toISOString(),
    };

    console.log('[RadarTest] Mock event created:', mockEvent);

    // 3. Record the visit (same as real Radar callback would do)
    const { error: visitError, alreadyRecorded } = await recordPassiveVisit(
      userId,
      restaurantId,
      'manual' // Mark as manual for test visits
    );

    if (visitError) {
      console.error('[RadarTest] Failed to record visit:', visitError);
      return {
        success: false,
        message: 'Failed to record visit',
        event: mockEvent,
        error: visitError.message,
      };
    }

    if (alreadyRecorded) {
      console.log('[RadarTest] Visit already recorded today');
      return {
        success: true,
        message: `Visit already recorded today for "${restaurant.name}"`,
        event: mockEvent,
      };
    }

    console.log('[RadarTest] Visit recorded successfully!');
    return {
      success: true,
      message: `Simulated geofence entry for "${restaurant.name}"`,
      event: mockEvent,
    };
  } catch (error) {
    console.error('[RadarTest] Exception:', error);
    return {
      success: false,
      message: 'Exception during test',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a list of restaurants for testing
 *
 * DEV-ONLY: Returns a list of active restaurants that can be used for testing.
 *
 * @param limit - Maximum number of restaurants to return
 * @returns Array of restaurants with id and name
 */
export async function getTestRestaurants(
  limit: number = 10
): Promise<Array<{ id: string; name: string }>> {
  if (!IS_DEV) {
    console.warn('[RadarTest] getTestRestaurants is only available in development mode');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('is_active', true)
      .limit(limit);

    if (error) {
      console.error('[RadarTest] Failed to fetch restaurants:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[RadarTest] Exception:', error);
    return [];
  }
}

/**
 * Clear all test visits for a user
 *
 * DEV-ONLY: Removes all visits marked as 'manual' (test visits) for a user.
 *
 * @param userId - The user ID to clear test visits for
 * @returns Number of visits deleted
 */
export async function clearTestVisits(userId: string): Promise<number> {
  if (!IS_DEV) {
    console.warn('[RadarTest] clearTestVisits is only available in development mode');
    return 0;
  }

  try {
    const { data, error } = await supabase
      .from('visits')
      .delete()
      .eq('user_id', userId)
      .eq('source', 'manual')
      .select('id');

    if (error) {
      console.error('[RadarTest] Failed to clear test visits:', error);
      return 0;
    }

    const count = data?.length || 0;
    console.log(`[RadarTest] Cleared ${count} test visits for user ${userId}`);
    return count;
  } catch (error) {
    console.error('[RadarTest] Exception:', error);
    return 0;
  }
}

/**
 * Log recent Radar events (for debugging)
 *
 * DEV-ONLY: Fetches and logs the most recent visits for a user.
 *
 * @param userId - The user ID to fetch visits for
 * @param limit - Maximum number of visits to fetch
 */
export async function logRecentVisits(userId: string, limit: number = 10): Promise<void> {
  if (!IS_DEV) {
    console.warn('[RadarTest] logRecentVisits is only available in development mode');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('visits')
      .select(
        `
        id,
        restaurant_id,
        source,
        visited_at,
        restaurants (name)
      `
      )
      .eq('user_id', userId)
      .order('visited_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[RadarTest] Failed to fetch visits:', error);
      return;
    }

    console.log(`[RadarTest] Recent visits for user ${userId}:`);
    console.log('─'.repeat(60));

    if (!data || data.length === 0) {
      console.log('  No visits found');
      return;
    }

    data.forEach((visit, index) => {
      const restaurantName =
        (visit.restaurants as unknown as { name: string })?.name || 'Unknown';
      console.log(`  ${index + 1}. ${restaurantName}`);
      console.log(`     Source: ${visit.source}`);
      console.log(`     Time:   ${new Date(visit.visited_at).toLocaleString()}`);
      console.log('');
    });

    console.log('─'.repeat(60));
  } catch (error) {
    console.error('[RadarTest] Exception:', error);
  }
}
