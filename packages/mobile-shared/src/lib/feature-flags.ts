/**
 * Feature Flags
 *
 * Controls gradual rollout of new features to allow safe testing
 * without affecting production users.
 */

// Feature flags for gradual rollout and testing
export const FEATURE_FLAGS = {
  /**
   * Tier-based content visibility
   *
   * When enabled, restaurants on Basic (free) tier will have their
   * premium content (menu, happy hours, specials, events) hidden
   * with encouraging messages to upgrade.
   *
   * - Development: Enabled by default (__DEV__)
   * - Production: Controlled by EXPO_PUBLIC_ENABLE_TIER_GATING env var
   */
  TIER_CONTENT_GATING: __DEV__, // Only enabled in development by default

  // Can be overridden via environment variable for testing
  get tierContentGating() {
    return process.env.EXPO_PUBLIC_ENABLE_TIER_GATING === 'true' || this.TIER_CONTENT_GATING;
  }
};

/**
 * Check if tier-based content gating is enabled
 *
 * @returns true if feature is enabled, false otherwise
 */
export function isTierGatingEnabled(): boolean {
  return FEATURE_FLAGS.tierContentGating;
}

/**
 * Log feature flag status (useful for debugging)
 */
export function logFeatureFlags() {
  if (__DEV__) {
    console.log('[Feature Flags]', {
      tierGating: isTierGatingEnabled(),
      environment: __DEV__ ? 'development' : 'production',
      envVar: process.env.EXPO_PUBLIC_ENABLE_TIER_GATING,
    });
  }
}
