/**
 * Resolve market slug from the native binary — OTA-safe.
 *
 * For Expo Go compatibility, we avoid importing expo-constants at module load time.
 * This means Expo Go will always default to Lancaster, but production builds will
 * correctly resolve the market from the binary.
 */
export const MARKET_SLUG = 'lancaster-pa';

const MARKET_APP_NAMES: Record<string, string> = {
  'lancaster-pa': 'TasteLanc',
  'cumberland-pa': 'TasteCumberland',
};

export function getAppName(slug: string): string {
  return MARKET_APP_NAMES[slug] ?? 'TasteLanc';
}

const MARKET_DOMAINS: Record<string, string> = {
  'lancaster-pa': 'tastelanc.com',
  'cumberland-pa': 'cumberland.tastelanc.com',
};

export function getMarketDomain(slug: string): string {
  return MARKET_DOMAINS[slug] ?? 'tastelanc.com';
}

const MARKET_AI_NAMES: Record<string, string> = {
  'lancaster-pa': 'Rosie',
  'cumberland-pa': 'Mollie',
};

export function getAiName(slug: string): string {
  return MARKET_AI_NAMES[slug] ?? 'Rosie';
}

/**
 * Default map center for this market.
 * Used as fallback before Supabase market data loads.
 * Update this when forking for a new market.
 */
export const MARKET_CENTER = {
  latitude: 40.0379,
  longitude: -76.3055,
} as const;
