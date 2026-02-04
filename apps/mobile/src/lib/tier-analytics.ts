/**
 * Tier-based Analytics Tracking
 *
 * Tracks when users encounter locked content to measure conversion
 * opportunity for restaurants to upgrade their subscription tier.
 */

import { supabase } from './supabase';
import { SubscriptionTier } from './tier-access';

interface LockedContentView {
  restaurant_id: string;
  restaurant_name: string;
  tier: string;
  feature_name: string; // 'menu', 'happy_hours', 'specials', 'events'
  user_id?: string | null;
  timestamp: string;
}

/**
 * Track when a user views locked content
 *
 * This data can be used to:
 * - Show restaurants how many users wanted to see their content
 * - Measure conversion opportunity (potential revenue from upgrades)
 * - Analyze which features drive the most interest
 *
 * @param restaurantId - UUID of the restaurant
 * @param restaurantName - Name of the restaurant (for easy reporting)
 * @param tier - Current subscription tier
 * @param featureName - Name of the locked feature (menu, happy_hours, specials, events)
 * @param userId - Optional user ID if user is authenticated
 */
export async function trackLockedContentView(
  restaurantId: string,
  restaurantName: string,
  tier: SubscriptionTier,
  featureName: string,
  userId?: string | null
): Promise<void> {
  try {
    // Silent tracking - don't block UI if this fails
    await supabase
      .from('locked_content_views')
      .insert({
        restaurant_id: restaurantId,
        restaurant_name: restaurantName,
        tier,
        feature_name: featureName,
        user_id: userId,
        timestamp: new Date().toISOString(),
      });

    if (__DEV__) {
      console.log('[Tier Analytics] Tracked locked content view:', {
        restaurant: restaurantName,
        tier,
        feature: featureName,
      });
    }
  } catch (error) {
    // Silent fail - don't block user experience with analytics errors
    if (__DEV__) {
      console.error('[Tier Analytics] Failed to track locked content view:', error);
    }
  }
}

/**
 * Get analytics for a specific restaurant
 *
 * @param restaurantId - UUID of the restaurant
 * @param days - Number of days to look back (default 30)
 * @returns Summary of locked content views
 */
export async function getRestaurantLockedViews(
  restaurantId: string,
  days: number = 30
): Promise<{
  totalViews: number;
  viewsByFeature: Record<string, number>;
  uniqueUsers: number;
} | null> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('locked_content_views')
      .select('feature_name, user_id')
      .eq('restaurant_id', restaurantId)
      .gte('timestamp', startDate.toISOString());

    if (error) throw error;
    if (!data) return null;

    // Calculate metrics
    const viewsByFeature: Record<string, number> = {};
    const uniqueUserIds = new Set<string>();

    data.forEach((view) => {
      // Count by feature
      viewsByFeature[view.feature_name] = (viewsByFeature[view.feature_name] || 0) + 1;

      // Track unique users
      if (view.user_id) {
        uniqueUserIds.add(view.user_id);
      }
    });

    return {
      totalViews: data.length,
      viewsByFeature,
      uniqueUsers: uniqueUserIds.size,
    };
  } catch (error) {
    console.error('[Tier Analytics] Failed to get restaurant locked views:', error);
    return null;
  }
}

/**
 * Track when user clicks the "Upgrade Plan" button
 *
 * @param restaurantId - UUID of the restaurant
 * @param restaurantName - Name of the restaurant
 * @param featureName - Name of the locked feature that prompted the click
 */
export async function trackUpgradeButtonClick(
  restaurantId: string,
  restaurantName: string,
  featureName: string
): Promise<void> {
  try {
    await supabase
      .from('upgrade_button_clicks')
      .insert({
        restaurant_id: restaurantId,
        restaurant_name: restaurantName,
        feature_name: featureName,
        timestamp: new Date().toISOString(),
      });

    if (__DEV__) {
      console.log('[Tier Analytics] Tracked upgrade button click:', {
        restaurant: restaurantName,
        feature: featureName,
      });
    }
  } catch (error) {
    // Silent fail
    if (__DEV__) {
      console.error('[Tier Analytics] Failed to track upgrade click:', error);
    }
  }
}

/**
 * Track when user shares a request for content
 *
 * @param restaurantId - UUID of the restaurant
 * @param restaurantName - Name of the restaurant
 * @param featureName - Name of the feature being requested
 */
export async function trackContentShareRequest(
  restaurantId: string,
  restaurantName: string,
  featureName: string
): Promise<void> {
  try {
    await supabase
      .from('content_share_requests')
      .insert({
        restaurant_id: restaurantId,
        restaurant_name: restaurantName,
        feature_name: featureName,
        timestamp: new Date().toISOString(),
      });

    if (__DEV__) {
      console.log('[Tier Analytics] Tracked content share request:', {
        restaurant: restaurantName,
        feature: featureName,
      });
    }
  } catch (error) {
    // Silent fail
    if (__DEV__) {
      console.error('[Tier Analytics] Failed to track share request:', error);
    }
  }
}
