/**
 * Market Notification Guard
 *
 * Runtime validation to prevent cross-market notification leaks.
 * Every push notification MUST pass through validateMarketScope() before sending.
 *
 * Created after a critical bug where TasteLanc users received notifications
 * counting happy hours from ALL markets instead of just Lancaster.
 */

// Canonical market → app_slug mapping. Update when adding new markets.
const VALID_MARKET_APP_SLUGS: Record<string, string> = {
  'lancaster-pa': 'tastelanc',
  'cumberland-pa': 'taste-cumberland',
};

export interface MarketScopeValidation {
  valid: boolean;
  marketSlug: string;
  appSlug: string;
  error?: string;
}

/**
 * Validate that a notification is properly scoped to a single market.
 *
 * Call this BEFORE sending any push notification to ensure:
 * 1. The market slug is recognized
 * 2. The app slug matches the market
 * 3. Tokens are filtered to the correct app
 *
 * @param marketSlug - The market this notification is for (e.g., 'lancaster-pa')
 * @param targetAppSlug - The app_slug being used to filter push tokens
 * @param tokenCount - Number of tokens about to be sent to (for logging)
 * @param context - Description of the notification type (for error messages)
 */
export function validateMarketScope(
  marketSlug: string,
  targetAppSlug: string,
  tokenCount: number,
  context: string,
): MarketScopeValidation {
  const expectedAppSlug = VALID_MARKET_APP_SLUGS[marketSlug];

  // Unknown market
  if (!expectedAppSlug) {
    const error = `[MARKET GUARD] BLOCKED: Unknown market "${marketSlug}" for ${context}. Known markets: ${Object.keys(VALID_MARKET_APP_SLUGS).join(', ')}`;
    console.error(error);
    return { valid: false, marketSlug, appSlug: targetAppSlug, error };
  }

  // App slug mismatch — would send to wrong app's users
  if (targetAppSlug !== expectedAppSlug) {
    const error = `[MARKET GUARD] BLOCKED: App slug mismatch for ${context}. Market "${marketSlug}" should use "${expectedAppSlug}" but got "${targetAppSlug}"`;
    console.error(error);
    return { valid: false, marketSlug, appSlug: targetAppSlug, error };
  }

  // Suspiciously high token count — may indicate unfiltered tokens
  const allAppSlugs = Object.values(VALID_MARKET_APP_SLUGS);
  if (allAppSlugs.length > 1 && tokenCount > 500) {
    console.warn(
      `[MARKET GUARD] WARNING: ${context} is sending to ${tokenCount} tokens for ${targetAppSlug}. Verify tokens are filtered by app_slug.`,
    );
  }

  console.log(
    `[MARKET GUARD] OK: ${context} → market=${marketSlug}, app=${targetAppSlug}, tokens=${tokenCount}`,
  );

  return { valid: true, marketSlug, appSlug: targetAppSlug };
}

/**
 * Get the expected app_slug for a market.
 * Returns null for unknown markets.
 */
export function getAppSlugForMarket(marketSlug: string): string | null {
  return VALID_MARKET_APP_SLUGS[marketSlug] || null;
}

/**
 * Get all known market slugs.
 */
export function getKnownMarketSlugs(): string[] {
  return Object.keys(VALID_MARKET_APP_SLUGS);
}
