import Constants from 'expo-constants';

/**
 * Resolve market slug from the native binary — OTA-safe.
 *
 * Priority order:
 * 1. app.json `extra.marketSlug` (explicit, set at build time)
 * 2. app.json `name` — detect "TasteCumberland" → 'cumberland-pa'
 * 3. Default to Lancaster
 *
 * Because Constants.expoConfig is baked into the NATIVE BINARY (not the JS
 * bundle), this value is preserved across OTA updates. Each market's binary
 * will always identify itself correctly regardless of which OTA JS bundle
 * is running.
 */
function resolveMarketSlug(): string {
  const explicit = Constants.expoConfig?.extra?.marketSlug;
  if (explicit && typeof explicit === 'string') {
    return explicit;
  }
  if (Constants.expoConfig?.name === 'TasteCumberland') {
    return 'cumberland-pa';
  }
  return 'lancaster-pa';
}

export const MARKET_SLUG = resolveMarketSlug();

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
