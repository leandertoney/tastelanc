export const MARKET_SLUG = 'fayetteville-nc' as const;

/**
 * Default map center for this market.
 * Used as fallback before Supabase market data loads.
 * Centered on downtown Fayetteville, NC.
 */
export const MARKET_CENTER = {
  latitude: 35.0527,
  longitude: -78.8784,
} as const;
