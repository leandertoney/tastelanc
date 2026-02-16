/**
 * Market Configuration
 *
 * Single source of truth for per-market branding.
 * Reads NEXT_PUBLIC_MARKET_SLUG env var (defaults to 'lancaster-pa').
 *
 * To add a new city:
 * 1. Add entry to MARKET_CONFIG below
 * 2. Seed market row in Supabase `markets` table
 * 3. Create Netlify site with NEXT_PUBLIC_MARKET_SLUG=<slug>
 */

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export interface MarketBrand {
  // Identity
  name: string;
  tagline: string;
  county: string;
  countyShort: string;
  state: string;
  premiumName: string;

  // AI Assistant
  aiName: string;

  // Domain & Social
  domain: string;
  socialHandle: string;
  instagramUrl: string;

  // Assets
  logoPath: string;

  // App Store URLs (empty string = no app yet)
  appStoreUrls: {
    ios: string;
    android: string;
  };

  // Web theme colors (dark theme)
  colors: {
    accent: string;
    accentHover: string;
    gold: string;
    bg: string;
    card: string;
    surface: string;
    surfaceLight: string;
  };

  // SEO defaults
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
}

// ─────────────────────────────────────────────────────────
// MARKET SLUG (from env var, defaults to Lancaster)
// ─────────────────────────────────────────────────────────

export const MARKET_SLUG = process.env.NEXT_PUBLIC_MARKET_SLUG || 'lancaster-pa';

// ─────────────────────────────────────────────────────────
// MARKET CONFIGS
// ─────────────────────────────────────────────────────────

export const MARKET_CONFIG: Record<string, MarketBrand> = {
  'lancaster-pa': {
    name: 'TasteLanc',
    tagline: "Discover Lancaster's Best Dining & Nightlife",
    county: 'Lancaster County',
    countyShort: 'Lancaster',
    state: 'PA',
    premiumName: 'TasteLanc+',

    aiName: 'Rosie',

    domain: 'tastelanc.com',
    socialHandle: '@tastelanc',
    instagramUrl: 'https://www.instagram.com/tastelanc/',

    logoPath: '/images/tastelanc_new_dark.png',

    appStoreUrls: {
      ios: 'https://apps.apple.com/us/app/tastelanc/id6755852717',
      android: 'https://play.google.com/store/apps/details?id=com.tastelanc.app',
    },

    colors: {
      accent: '#A41E22',
      accentHover: '#8B1A1D',
      gold: '#D4AF37',
      bg: '#1A1A1A',
      card: '#252525',
      surface: '#1E1E1E',
      surfaceLight: '#2A2A2A',
    },

    seo: {
      title: "TasteLanc - Discover Lancaster's Best Dining & Nightlife",
      description:
        'Find the best restaurants, happy hours, events, and nightlife in Lancaster, PA. TasteLanc is your guide to local dining and entertainment.',
      keywords: [
        'Lancaster PA restaurants',
        'Lancaster happy hours',
        'Lancaster events',
        'Lancaster nightlife',
        'dining Lancaster PA',
      ],
    },
  },

  'cumberland-pa': {
    name: 'TasteCumberland',
    tagline: "Discover Cumberland County's Best Dining & Nightlife",
    county: 'Cumberland County',
    countyShort: 'Cumberland',
    state: 'PA',
    premiumName: 'TasteCumberland+',

    aiName: 'Mollie',

    domain: 'cumberland.tastelanc.com',
    socialHandle: '@tastecumberland',
    instagramUrl: 'https://www.instagram.com/tastecumberland/',

    logoPath: '/images/tastecumberland_logo.png',

    appStoreUrls: {
      ios: '',
      android: '',
    },

    colors: {
      accent: '#0F1E2E',
      accentHover: '#1A2D40',
      gold: '#C9A227',
      bg: '#1A1A1A',
      card: '#252525',
      surface: '#1E1E1E',
      surfaceLight: '#2A2A2A',
    },

    seo: {
      title: "TasteCumberland - Discover Cumberland County's Best Dining & Nightlife",
      description:
        'Find the best restaurants, happy hours, events, and nightlife in Cumberland County, PA. TasteCumberland is your guide to local dining and entertainment.',
      keywords: [
        'Cumberland County PA restaurants',
        'Carlisle PA restaurants',
        'Mechanicsburg PA dining',
        'Cumberland County happy hours',
        'Cumberland County events',
        'dining Cumberland County PA',
      ],
    },
  },
};

// ─────────────────────────────────────────────────────────
// BRAND (current market's config)
// ─────────────────────────────────────────────────────────

export const BRAND: MarketBrand = MARKET_CONFIG[MARKET_SLUG] || MARKET_CONFIG['lancaster-pa'];

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

/** Get all configured market slugs */
export function getAllMarketSlugs(): string[] {
  return Object.keys(MARKET_CONFIG);
}

/** Get config for a specific market slug (returns null if unknown) */
export function getMarketConfig(slug: string): MarketBrand | null {
  return MARKET_CONFIG[slug] || null;
}
