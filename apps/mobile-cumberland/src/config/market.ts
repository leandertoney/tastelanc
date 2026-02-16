export const MARKET_SLUG = 'cumberland-pa' as const;

/**
 * Default map center for this market.
 * Used as fallback before Supabase market data loads.
 * Update this when forking for a new market.
 */
export const MARKET_CENTER = {
  latitude: 40.2015,
  longitude: -77.0080,
} as const;
