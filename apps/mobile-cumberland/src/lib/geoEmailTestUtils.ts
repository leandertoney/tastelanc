/**
 * Geo Email Test Utilities
 *
 * Dev-only utilities for testing the geo-triggered email system
 * without requiring actual geofence entry/exit events.
 *
 * WARNING: Only use in development/testing environments!
 */

import { supabase } from './supabase';

/**
 * Simulate a geofence exit event to trigger geo emails
 * This calls the webhook in test mode
 */
export async function simulateGeoExit(
  userId: string,
  restaurantId: string
): Promise<{ success: boolean; message: string; emailsSent?: number; error?: string }> {
  if (!__DEV__) {
    console.warn('[GeoEmailTest] Test utilities should only be used in development');
  }

  try {
    const { data, error } = await supabase.functions.invoke('radar_visit_webhook', {
      body: {
        userId,
        restaurantId,
        eventType: 'user.exited_geofence',
      },
      headers: {
        'x-test-mode': 'true',
      },
    });

    if (error) {
      console.error('[GeoEmailTest] Error simulating geo exit:', error);
      return { success: false, message: 'Function invocation failed', error: error.message };
    }

    console.log('[GeoEmailTest] Simulation result:', data);
    return data;
  } catch (error) {
    console.error('[GeoEmailTest] Exception:', error);
    return {
      success: false,
      message: 'Exception during simulation',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Simulate a geofence entry event (for completeness - no email sent)
 */
export async function simulateGeoEntry(
  userId: string,
  restaurantId: string
): Promise<{ success: boolean; message: string }> {
  if (!__DEV__) {
    console.warn('[GeoEmailTest] Test utilities should only be used in development');
  }

  try {
    const { data, error } = await supabase.functions.invoke('radar_visit_webhook', {
      body: {
        userId,
        restaurantId,
        eventType: 'user.entered_geofence',
      },
      headers: {
        'x-test-mode': 'true',
      },
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get recent email logs for a user (for testing/verification)
 */
export async function getEmailLogs(
  userId: string,
  limit: number = 10
): Promise<{
  logs: Array<{
    id: string;
    restaurant_id: string;
    email_type: string;
    sent_at: string;
  }>;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('visit_email_log')
      .select('id, restaurant_id, email_type, sent_at')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { logs: [], error: error.message };
    }

    return { logs: data || [] };
  } catch (error) {
    return {
      logs: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear email throttle for a user/restaurant pair (for testing)
 * WARNING: This should NEVER be used in production!
 */
export async function clearEmailThrottle(
  userId: string,
  restaurantId: string
): Promise<{ success: boolean; deleted: number; error?: string }> {
  if (!__DEV__) {
    console.warn('[GeoEmailTest] clearEmailThrottle should only be used in development!');
    return { success: false, deleted: 0, error: 'Not allowed in production' };
  }

  try {
    const { data, error } = await supabase
      .from('visit_email_log')
      .delete()
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .select('id');

    if (error) {
      return { success: false, deleted: 0, error: error.message };
    }

    return { success: true, deleted: data?.length || 0 };
  } catch (error) {
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get restaurants with geo emails enabled (for testing)
 */
export async function getGeoEmailEnabledRestaurants(
  limit: number = 10
): Promise<{
  restaurants: Array<{
    id: string;
    name: string;
    geo_email_templates: string[];
  }>;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, geo_email_templates')
      .eq('geo_emails_enabled', true)
      .limit(limit);

    if (error) {
      return { restaurants: [], error: error.message };
    }

    return { restaurants: data || [] };
  } catch (error) {
    return {
      restaurants: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Enable geo emails for a restaurant (for testing)
 */
export async function enableGeoEmailsForRestaurant(
  restaurantId: string,
  templates: string[] = ['post_visit']
): Promise<{ success: boolean; error?: string }> {
  if (!__DEV__) {
    console.warn('[GeoEmailTest] This should only be used in development!');
  }

  try {
    const { error } = await supabase
      .from('restaurants')
      .update({
        geo_emails_enabled: true,
        geo_email_templates: templates,
      })
      .eq('id', restaurantId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run a full test of the geo email system
 */
export async function runGeoEmailTest(
  userId: string,
  restaurantId: string
): Promise<{
  step: string;
  success: boolean;
  details: Record<string, unknown>;
}[]> {
  const results: {
    step: string;
    success: boolean;
    details: Record<string, unknown>;
  }[] = [];

  // Step 1: Enable geo emails for the restaurant
  console.log('[GeoEmailTest] Step 1: Enabling geo emails for restaurant...');
  const enableResult = await enableGeoEmailsForRestaurant(restaurantId, ['post_visit', 'favorite_suggestion']);
  results.push({
    step: 'Enable geo emails',
    success: enableResult.success,
    details: enableResult,
  });

  // Step 2: Clear any existing throttle
  console.log('[GeoEmailTest] Step 2: Clearing email throttle...');
  const clearResult = await clearEmailThrottle(userId, restaurantId);
  results.push({
    step: 'Clear throttle',
    success: clearResult.success,
    details: clearResult,
  });

  // Step 3: Simulate geo exit
  console.log('[GeoEmailTest] Step 3: Simulating geo exit...');
  const exitResult = await simulateGeoExit(userId, restaurantId);
  results.push({
    step: 'Simulate exit',
    success: exitResult.success,
    details: exitResult,
  });

  // Step 4: Verify email logs
  console.log('[GeoEmailTest] Step 4: Verifying email logs...');
  const logsResult = await getEmailLogs(userId, 5);
  results.push({
    step: 'Verify logs',
    success: logsResult.logs.length > 0,
    details: { logCount: logsResult.logs.length, logs: logsResult.logs },
  });

  // Step 5: Test throttle (should be blocked now)
  console.log('[GeoEmailTest] Step 5: Testing throttle (should be blocked)...');
  const throttleResult = await simulateGeoExit(userId, restaurantId);
  results.push({
    step: 'Test throttle',
    success: throttleResult.message.includes('throttled'),
    details: throttleResult,
  });

  console.log('[GeoEmailTest] Test complete!');
  return results;
}
