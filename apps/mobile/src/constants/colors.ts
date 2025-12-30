// TasteLanc Brand Colors
// Dark theme with charcoal backgrounds, white and red accent text
// Inspired by Apple's design language

export const colors = {
  // Primary background - deep charcoal
  primary: '#1A1A1A',
  primaryLight: '#222222',
  primaryDark: '#121212',

  // Accent color - brand red for CTAs, highlights, emphasis
  accent: '#A41E22',
  accentLight: '#C42428',
  accentDark: '#8A1A1D',

  // Text colors
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.7)',
  textSecondary: 'rgba(255,255,255,0.5)',
  textAccent: '#A41E22',

  // Card backgrounds (elevated surfaces on dark background)
  cardBg: '#252525',
  cardBgElevated: '#2A2A2A',
  cardBgSelected: '#333333',
  cardBgHover: '#2F2F2F',

  // Surface colors for layering
  surface: '#1E1E1E',
  surfaceElevated: '#262626',
  surfaceBorder: 'rgba(255,255,255,0.1)',

  // Utility colors
  success: '#34C759',
  error: '#FF453A',
  warning: '#FFD60A',
  info: '#0A84FF',

  // Premium/Gold accent - for victory, premium moments, achievements
  gold: '#FFD700',
  goldLight: 'rgba(255, 215, 0, 0.15)',
  goldMedium: 'rgba(255, 215, 0, 0.3)',
  goldBorder: 'rgba(255, 215, 0, 0.4)',

  // Value/Success green - for savings, checkmarks, value indicators
  valueGreen: '#34C759',
  valueGreenLight: 'rgba(52, 199, 89, 0.15)',
  valueGreenBorder: 'rgba(52, 199, 89, 0.3)',

  // Border colors
  border: 'rgba(255,255,255,0.15)',
  borderLight: 'rgba(255,255,255,0.08)',
  borderAccent: '#A41E22',

  // Tab bar / Navigation
  tabBarBg: '#1A1A1A',
  tabBarBorder: 'rgba(255,255,255,0.1)',
  tabActive: '#A41E22',
  tabInactive: 'rgba(255,255,255,0.5)',

  // Input fields
  inputBg: '#252525',
  inputBorder: 'rgba(255,255,255,0.15)',
  inputPlaceholder: 'rgba(255,255,255,0.4)',

  // Overlay/Modal
  overlay: 'rgba(0,0,0,0.7)',
  modalBg: '#222222',

  // Legacy support (keeping for backwards compatibility during transition)
  background: '#1A1A1A',
  backgroundAlt: '#222222',
};

// Spacing constants (Apple HIG inspired)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Typography sizes (Apple HIG inspired)
export const typography = {
  largeTitle: 34,
  title1: 28,
  title2: 22,
  title3: 20,
  headline: 17,
  body: 17,
  callout: 16,
  subhead: 15,
  footnote: 13,
  caption1: 12,
  caption2: 11,
};

// Border radius (Apple style)
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};
