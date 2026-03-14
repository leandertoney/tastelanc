/**
 * Theme singleton — holds brand, colors, and assets for the current app.
 * Must be initialized via initTheme() before any shared component renders.
 *
 * Non-React code (lib utilities, StyleSheet factories) uses getColors()/getBrand()/getAssets().
 * React code should prefer useAppConfig() from context.tsx for reactivity.
 */

import type { AppBrand, ColorTokens, AppAssets, MarketFeatures } from '../types/config';
import type { NeighborhoodBoundary } from '../data/neighborhoodBoundaries';
import type { SupabaseClient } from '@supabase/supabase-js';

let _brand: AppBrand | null = null;
let _colors: ColorTokens | null = null;
let _assets: AppAssets | null = null;
let _supabase: SupabaseClient | null = null;
let _anonKey: string | null = null;
let _neighborhoodBoundaries: NeighborhoodBoundary[] = [];
let _marketCenter: { latitude: number; longitude: number } | null = null;

/**
 * Initialize the theme singleton. Call this once at app startup,
 * BEFORE importing any shared components.
 */
export function initTheme(
  brand: AppBrand,
  colors: ColorTokens,
  assets: AppAssets,
  supabaseClient: SupabaseClient,
  anonKey?: string,
  neighborhoodBoundaries?: NeighborhoodBoundary[],
  marketCenter?: { latitude: number; longitude: number }
): void {
  _brand = brand;
  _colors = colors;
  _assets = assets;
  _supabase = supabaseClient;
  _anonKey = anonKey || null;
  _neighborhoodBoundaries = neighborhoodBoundaries || [];
  _marketCenter = marketCenter || null;
}

/** Get the current color tokens. Throws if initTheme() hasn't been called. */
export function getColors(): ColorTokens {
  if (!_colors) throw new Error('[mobile-shared] initTheme() must be called before getColors()');
  return _colors;
}

/** Get the current brand config. Throws if initTheme() hasn't been called. */
export function getBrand(): AppBrand {
  if (!_brand) throw new Error('[mobile-shared] initTheme() must be called before getBrand()');
  return _brand;
}

/** Get the current assets. Throws if initTheme() hasn't been called. */
export function getAssets(): AppAssets {
  if (!_assets) throw new Error('[mobile-shared] initTheme() must be called before getAssets()');
  return _assets;
}

/** Get the supabase client. Throws if initTheme() hasn't been called. */
export function getSupabase(): SupabaseClient {
  if (!_supabase) throw new Error('[mobile-shared] initTheme() must be called before getSupabase()');
  return _supabase;
}

/** Get the Supabase anon key (for edge function auth). */
export function getAnonKey(): string {
  if (!_anonKey) throw new Error('[mobile-shared] initTheme() must be called with anonKey before getAnonKey()');
  return _anonKey;
}

const FEATURE_DEFAULTS: Record<keyof MarketFeatures, boolean> = {
  happyHours: true,
  dailySpecialsCarousel: false,
};

/** Check if a market feature is enabled. Uses defaults when not explicitly set. */
export function hasFeature(feature: keyof MarketFeatures): boolean {
  const brand = getBrand();
  return brand.features?.[feature] ?? FEATURE_DEFAULTS[feature];
}

/** Get the neighborhood boundaries for the current market. Returns empty array if none configured. */
export function getNeighborhoodBoundaries(): NeighborhoodBoundary[] {
  return _neighborhoodBoundaries;
}

/**
 * Get the market center coordinates for the current app.
 * Falls back to Lancaster, PA if not set via initTheme().
 */
export function getMarketCenter(): { latitude: number; longitude: number } {
  if (_marketCenter) return _marketCenter;
  // Ultimate fallback — Lancaster, PA
  return { latitude: 40.0379, longitude: -76.3055 };
}

/** Check if theme has been initialized (safe check without throwing). */
export function isThemeInitialized(): boolean {
  return _brand !== null && _colors !== null && _assets !== null && _supabase !== null;
}
