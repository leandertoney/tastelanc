/**
 * Market Notification Guard
 *
 * Runtime validation to prevent cross-market notification leaks.
 * Every push notification MUST pass through validateMarketScope() before sending.
 *
 * Market → app_slug mappings are loaded from the `markets` table at runtime.
 * No code changes needed when adding new markets.
 */

import { createClient } from '@supabase/supabase-js';

// Cached market → app_slug mapping, loaded once from DB per process
let _cachedMarketAppSlugs: Record<string, string> | null = null;

/**
 * Load market → app_slug mappings from the database.
 * Cached per process so it only queries once.
 */
async function loadMarketAppSlugs(): Promise<Record<string, string>> {
  if (_cachedMarketAppSlugs) return _cachedMarketAppSlugs;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: markets } = await supabase
    .from('markets')
    .select('slug, app_slug')
    .eq('is_active', true);

  _cachedMarketAppSlugs = {};
  if (markets) {
    for (const m of markets) {
      if (m.slug && m.app_slug) {
        _cachedMarketAppSlugs[m.slug] = m.app_slug;
      }
    }
  }

  return _cachedMarketAppSlugs;
}

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
export async function validateMarketScope(
  marketSlug: string,
  targetAppSlug: string,
  tokenCount: number,
  context: string,
): Promise<MarketScopeValidation> {
  const marketAppSlugs = await loadMarketAppSlugs();
  const expectedAppSlug = marketAppSlugs[marketSlug];

  // Unknown market
  if (!expectedAppSlug) {
    const error = `[MARKET GUARD] BLOCKED: Unknown market "${marketSlug}" for ${context}. Known markets: ${Object.keys(marketAppSlugs).join(', ')}`;
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
  const allAppSlugs = Object.values(marketAppSlugs);
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
export async function getAppSlugForMarket(marketSlug: string): Promise<string | null> {
  const marketAppSlugs = await loadMarketAppSlugs();
  return marketAppSlugs[marketSlug] || null;
}

/**
 * Get all known market slugs.
 */
export async function getKnownMarketSlugs(): Promise<string[]> {
  const marketAppSlugs = await loadMarketAppSlugs();
  return Object.keys(marketAppSlugs);
}
