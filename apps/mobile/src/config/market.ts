export const MARKET_SLUG = 'lancaster-pa' as const;

/**
 * Default map center for this market.
 * Used as fallback before Supabase market data loads.
 * Update this when forking for a new market.
 */
export const MARKET_CENTER = {
  latitude: 40.0379,
  longitude: -76.3055,
} as const;
