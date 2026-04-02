export const MARKET_SLUG = 'ocean-city-md' as const;

/**
 * Default map center for this market.
 * Used as fallback before Supabase market data loads.
 * Centered on the Boardwalk / downtown Ocean City, MD.
 */
export const MARKET_CENTER = {
  latitude: 38.3365,
  longitude: -75.0849,
} as const;
