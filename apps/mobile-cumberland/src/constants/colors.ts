// Theme colors derived from BRAND.palette
// All UI tokens flow from the 4 brand colors defined in brand.ts

import { BRAND } from '../config/brand';

const { background, navy, gold, green } = BRAND.palette;

export const colors = {
  // Primary background - warm cream
  primary: background,
  primaryLight: '#FAF6F0',
  primaryDark: '#EDE3D2',

  // Accent color - deep midnight navy
  accent: navy,
  accentLight: '#1A3350',
  accentDark: '#0A1520',

  // Text colors (dark text on light background)
  text: navy,
  textMuted: 'rgba(15,30,46,0.7)',
  textSecondary: 'rgba(15,30,46,0.5)',
  textOnAccent: '#FFFFFF',
  textAccent: green,

  // Card backgrounds (white/near-white on cream)
  cardBg: '#FFFFFF',
  cardBgElevated: '#FFFFFF',
  cardBgSelected: '#EDE3D2',
  cardBgHover: '#F7F1E7',

  // Surface colors for layering
  surface: '#F0E7D8',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: 'rgba(15,30,46,0.12)',

  // Utility colors (semantic — not brand-specific)
  success: green,
  error: '#C62828',
  warning: gold,
  info: navy,

  // Premium/Gold accent - heritage gold from logo
  gold: gold,
  goldLight: 'rgba(201,162,39,0.15)',
  goldMedium: 'rgba(201,162,39,0.3)',
  goldBorder: 'rgba(201,162,39,0.4)',

  // Value/Success green - grass green from logo
  valueGreen: green,
  valueGreenLight: 'rgba(46,125,50,0.15)',
  valueGreenBorder: 'rgba(46,125,50,0.3)',

  // Border colors
  border: 'rgba(15,30,46,0.15)',
  borderLight: 'rgba(15,30,46,0.08)',
  borderAccent: navy,

  // Tab bar / Navigation
  tabBarBg: background,
  tabBarBorder: 'rgba(15,30,46,0.1)',
  tabActive: navy,
  tabInactive: 'rgba(15,30,46,0.4)',

  // Input fields
  inputBg: '#FFFFFF',
  inputBorder: 'rgba(15,30,46,0.2)',
  inputPlaceholder: 'rgba(15,30,46,0.4)',

  // Overlay/Modal
  overlay: 'rgba(15,30,46,0.5)',
  modalBg: '#FFFFFF',

  // Legacy support
  background: background,
  backgroundAlt: '#F0E7D8',
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
