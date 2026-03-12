/**
 * AppConfig — the shape of every market app's brand configuration.
 * Each app provides its own values; shared code reads from context.
 */

export interface BrandPalette {
  background: string;
  navy: string;
  gold: string;
  green: string;
}

export interface AppBrand {
  // Core identity
  appName: string;
  cityName: string;
  cityPossessive: string;
  marketSlug: string;
  sampleAddress: string;

  // Badges & labels
  pickBadgeLabel: string;
  verifiedLabel: string;

  // Profile
  userTitle: string;
  userSubtitle: string;
  tagline: string;
  slogan: string;

  // URLs
  supportEmail: string;
  privacyUrl: string;
  termsUrl: string;
  websiteUrl: string;
  appStoreUrl: string;
  playStoreUrl: string;

  // Defaults
  defaultItineraryTitle: string;
  userAgent: string;

  // AI Assistant
  aiName: string;
  mollieGreeting: string;
  mollieSubtitle: string;
  mollieSamplePrompt: string;

  // Brand palette
  palette: BrandPalette;

  // Market-specific feature toggles (unset fields use defaults)
  features?: MarketFeatures;
}

export interface MarketFeatures {
  /** Show happy hours section on HomeScreen and restaurant detail. Defaults to true. */
  happyHours?: boolean;
  /** Show daily specials carousel on HomeScreen (replaces happy hours slot). Defaults to false. */
  dailySpecialsCarousel?: boolean;
}

export interface ColorTokens {
  // Primary backgrounds
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Accent
  accent: string;
  accentLight: string;
  accentDark: string;

  // Text
  text: string;
  textMuted: string;
  textSecondary: string;
  textOnAccent: string;
  textAccent: string;

  // Card backgrounds
  cardBg: string;
  cardBgElevated: string;
  cardBgSelected: string;
  cardBgHover: string;

  // Surfaces
  surface: string;
  surfaceElevated: string;
  surfaceBorder: string;

  // Utility (semantic)
  success: string;
  error: string;
  warning: string;
  info: string;

  // Gold
  gold: string;
  goldLight: string;
  goldMedium: string;
  goldBorder: string;

  // Value green
  valueGreen: string;
  valueGreenLight: string;
  valueGreenBorder: string;

  // Borders
  border: string;
  borderLight: string;
  borderAccent: string;

  // Tab bar
  tabBarBg: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;

  // Input
  inputBg: string;
  inputBorder: string;
  inputPlaceholder: string;

  // Overlay/Modal
  overlay: string;
  modalBg: string;

  // Legacy
  background: string;
  backgroundAlt: string;
}

/**
 * Full app configuration passed through context.
 * Assets are require()'d numbers because Metro requires static paths.
 */
export interface AppConfig {
  brand: AppBrand;
  colors: ColorTokens;
  assets: AppAssets;
}

export interface AppAssets {
  aiAvatar: number;        // require('../../assets/images/rosie.png')
  aiAnimated: number;      // require('../../assets/animations/rosie.mp4')
  appIcon: number;         // require('../../assets/icon.png')
  splashLogo?: number;     // optional splash screen logo
  splashVideo?: number;    // require('../../assets/animation/logo_spin.mp4')
  onboardingHero?: number; // require('../../assets/images/onboarding/soundfamiliar.png')
}
