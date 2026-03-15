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
  replyDomain: string; // Inbound subdomain for reply-to routing (e.g., in.tastelanc.com)
  socialHandle: string;
  instagramUrl: string;

  // Assets
  logoPath: string;

  // App Store URLs (empty string = no app yet)
  appStoreUrls: {
    ios: string;
    android: string;
  };

  // Apple App Store ID (for Smart App Banner in Safari)
  iosAppId: string;

  // Web theme colors (mode-aware)
  colors: {
    // Accent colors — same in light & dark
    accent: string;
    accentHover: string;
    // Mode-specific palettes
    dark: {
      bg: string;
      card: string;
      surface: string;
      surfaceLight: string;
      headerBg: string;
      headerText: string;
      textPrimary: string;
      textSecondary: string;
      textMuted: string;
      textFaint: string;
      border: string;
      borderLight: string;
      inputBg: string;
      gold: string;
    };
    light: {
      bg: string;
      card: string;
      surface: string;
      surfaceLight: string;
      headerBg: string;
      headerText: string;
      textPrimary: string;
      textSecondary: string;
      textMuted: string;
      textFaint: string;
      border: string;
      borderLight: string;
      inputBg: string;
      gold: string;
    };
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
    replyDomain: 'in.tastelanc.com',
    socialHandle: '@tastelanc',
    instagramUrl: 'https://www.instagram.com/tastelanc/',

    logoPath: '/images/tastelanc_new_dark.png',

    appStoreUrls: {
      ios: 'https://apps.apple.com/us/app/tastelanc/id6755852717',
      android: 'https://play.google.com/store/apps/details?id=com.tastelanc.app',
    },

    iosAppId: '6755852717',

    colors: {
      accent: '#A41E22',
      accentHover: '#8B1A1D',
      dark: {
        bg: '#1A1A1A',
        card: '#252525',
        surface: '#1E1E1E',
        surfaceLight: '#2A2A2A',
        headerBg: '#1A1A1A',
        headerText: '#FFFFFF',
        textPrimary: '#FFFFFF',
        textSecondary: '#D1D5DB',
        textMuted: '#9CA3AF',
        textFaint: '#6B7280',
        border: '#374151',
        borderLight: '#4B5563',
        inputBg: '#1E1E1E',
        gold: '#D4AF37',
      },
      light: {
        bg: '#F3F4F6',
        card: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceLight: '#F0F1F3',
        headerBg: '#FFFFFF',
        headerText: '#111827',
        textPrimary: '#111827',
        textSecondary: '#374151',
        textMuted: '#6B7280',
        textFaint: '#9CA3AF',
        border: '#D1D5DB',
        borderLight: '#E5E7EB',
        inputBg: '#FFFFFF',
        gold: '#92700C',
      },
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
    replyDomain: 'in.tastelanc.com',
    socialHandle: '@tastecumberland',
    instagramUrl: 'https://www.instagram.com/tastecumberland/',

    logoPath: '/images/tastecumberland_logo.png',

    appStoreUrls: {
      ios: 'https://apps.apple.com/us/app/tastecumberland/id6759233248',
      android: 'https://play.google.com/store/apps/details?id=com.tastelanc.cumberland',
    },

    iosAppId: '6759233248',

    colors: {
      accent: '#3B7A57',
      accentHover: '#2D6043',
      dark: {
        bg: '#1A1A1A',
        card: '#252525',
        surface: '#1E1E1E',
        surfaceLight: '#2A2A2A',
        headerBg: '#F4EBDD',
        headerText: '#0F1E2E',
        textPrimary: '#FFFFFF',
        textSecondary: '#D1D5DB',
        textMuted: '#9CA3AF',
        textFaint: '#6B7280',
        border: '#374151',
        borderLight: '#4B5563',
        inputBg: '#1E1E1E',
        gold: '#C9A227',
      },
      light: {
        bg: '#F3F4F6',
        card: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceLight: '#F0F1F3',
        headerBg: '#F4EBDD',
        headerText: '#0F1E2E',
        textPrimary: '#111827',
        textSecondary: '#374151',
        textMuted: '#6B7280',
        textFaint: '#9CA3AF',
        border: '#D1D5DB',
        borderLight: '#E5E7EB',
        inputBg: '#FFFFFF',
        gold: '#856508',
      },
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

  'fayetteville-nc': {
    name: 'TasteFayetteville',
    tagline: "Discover Fayetteville's Best Dining & Nightlife",
    county: 'Cumberland County',
    countyShort: 'Fayetteville',
    state: 'NC',
    premiumName: 'TasteFayetteville+',

    aiName: 'Libertie',
    aiAvatarVideo: '/images/libertie_animated.mp4',
    aiAvatarImage: '/images/libertie_avatar.png',

    domain: 'fayetteville.tastelanc.com',
    replyDomain: 'in.tastelanc.com',
    socialHandle: '@tastefayetteville',
    instagramUrl: 'https://www.instagram.com/tastefayetteville/',

    logoPath: '/images/tastefayetteville_logo.png',

    appStoreUrls: {
      ios: '',
      android: '',
    },

    iosAppId: '6760276128',

    colors: {
      accent: '#93B5CF',
      accentHover: '#7A9BB5',
      dark: {
        bg: '#040F1A',
        card: '#0A1929',
        surface: '#071422',
        surfaceLight: '#0D1F33',
        headerBg: '#040F1A',
        headerText: '#FFFFFF',
        textPrimary: '#FFFFFF',
        textSecondary: '#D1D5DB',
        textMuted: '#9CA3AF',
        textFaint: '#6B7280',
        border: '#374151',
        borderLight: '#4B5563',
        inputBg: '#071422',
        gold: '#C9A227',
      },
      light: {
        bg: '#F3F4F6',
        card: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceLight: '#F0F1F3',
        headerBg: '#FFFFFF',
        headerText: '#111827',
        textPrimary: '#111827',
        textSecondary: '#374151',
        textMuted: '#6B7280',
        textFaint: '#9CA3AF',
        border: '#D1D5DB',
        borderLight: '#E5E7EB',
        inputBg: '#FFFFFF',
        gold: '#856508',
      },
    },

    seo: {
      title: "TasteFayetteville - Discover Fayetteville's Best Dining & Nightlife",
      description:
        'Find the best restaurants, happy hours, events, and nightlife in Fayetteville, NC. TasteFayetteville is your guide to local dining and entertainment.',
      keywords: [
        'Fayetteville NC restaurants',
        'Fort Liberty dining',
        'Fayetteville happy hours',
        'Fayetteville NC events',
        'Fayetteville nightlife',
        'dining Fayetteville NC',
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
