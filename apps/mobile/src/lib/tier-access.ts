/**
 * Tier Access Control Utilities
 *
 * Provides functions to check if a restaurant's subscription tier
 * grants access to specific features.
 */

export type SubscriptionTier = 'basic' | 'premium' | 'elite';

/**
 * Tier hierarchy levels for comparison
 */
const TIER_LEVELS: Record<SubscriptionTier, number> = {
  basic: 0,
  premium: 1,
  elite: 2,
};

/**
 * Check if a given tier has access to features requiring a specific tier level
 *
 * @param currentTier - The restaurant's current subscription tier
 * @param requiredTier - The minimum tier required for access
 * @returns true if current tier meets or exceeds required tier
 *
 * @example
 * hasTierAccess('premium', 'premium') // true
 * hasTierAccess('basic', 'premium')   // false
 * hasTierAccess('elite', 'premium')   // true
 */
export function hasTierAccess(
  currentTier: SubscriptionTier | null,
  requiredTier: 'premium' | 'elite'
): boolean {
  if (!currentTier) return false;

  return TIER_LEVELS[currentTier] >= TIER_LEVELS[requiredTier];
}

/**
 * Check if restaurant has access to menu features
 *
 * @param tier - Current subscription tier
 * @returns true if Premium or Elite tier
 */
export function hasMenuAccess(tier: SubscriptionTier | null): boolean {
  return hasTierAccess(tier, 'premium');
}

/**
 * Check if restaurant has access to specials features
 *
 * @param tier - Current subscription tier
 * @returns true if Premium or Elite tier
 */
export function hasSpecialsAccess(tier: SubscriptionTier | null): boolean {
  return hasTierAccess(tier, 'premium');
}

/**
 * Check if restaurant has access to happy hour features
 *
 * @param tier - Current subscription tier
 * @returns true if Premium or Elite tier
 */
export function hasHappyHourAccess(tier: SubscriptionTier | null): boolean {
  return hasTierAccess(tier, 'premium');
}

/**
 * Check if restaurant has access to events features
 *
 * @param tier - Current subscription tier
 * @returns true if Premium or Elite tier
 */
export function hasEventsAccess(tier: SubscriptionTier | null): boolean {
  return hasTierAccess(tier, 'premium');
}

/**
 * Get the display name for a tier
 *
 * @param tier - Subscription tier
 * @returns Human-readable tier name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  const displayNames: Record<SubscriptionTier, string> = {
    basic: 'Basic',
    premium: 'Premium',
    elite: 'Elite',
  };

  return displayNames[tier];
}

/**
 * Get all features available for a given tier
 *
 * @param tier - Subscription tier
 * @returns Array of feature names available
 */
export function getAvailableFeatures(tier: SubscriptionTier): string[] {
  const baseFeatures = ['hours', 'location', 'photos', 'description'];
  const premiumFeatures = ['menu', 'specials', 'happy_hours', 'events', 'analytics', 'push_notifications'];
  const eliteFeatures = ['logo_on_map', 'advanced_analytics', 'daily_specials', 'social_content'];

  if (tier === 'basic') {
    return baseFeatures;
  } else if (tier === 'premium') {
    return [...baseFeatures, ...premiumFeatures];
  } else {
    return [...baseFeatures, ...premiumFeatures, ...eliteFeatures];
  }
}
