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
  aiAvatarVideo: string; // animated avatar video path (empty = show icon fallback)
  aiAvatarImage: string; // static avatar image path (empty = show icon fallback)

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
    headerBg: string; // navbar background (defaults to bg if same)
    headerText: string; // navbar text color (light on dark bg, dark on light bg)
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
    aiAvatarVideo: '/images/rosie_dark_animated.mp4',
    aiAvatarImage: '/images/rosie_dark_new.png',

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
      headerBg: '#1A1A1A',
      headerText: '#FFFFFF',
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
    aiAvatarVideo: '/images/mollie_animated.mp4',
    aiAvatarImage: '/images/mollie_avatar.png',

    domain: 'cumberland.tastelanc.com',
    socialHandle: '@tastecumberland',
    instagramUrl: 'https://www.instagram.com/tastecumberland/',

    logoPath: '/images/tastecumberland_logo.png',

    appStoreUrls: {
      ios: '',
      android: '',
    },

    colors: {
      accent: '#3B7A57',
      accentHover: '#2D6043',
      gold: '#C9A227',
      bg: '#1A1A1A',
      card: '#252525',
      surface: '#1E1E1E',
      surfaceLight: '#2A2A2A',
      headerBg: '#F4EBDD',
      headerText: '#0F1E2E',
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
