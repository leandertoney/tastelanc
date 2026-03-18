// Theme colors derived from BRAND.palette
// All UI tokens flow from the 4 brand colors defined in brand.ts

import type { ColorSchemes } from '@tastelanc/mobile-shared/src/types/config';
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

/** Dim — warm medium-gray midpoint between the cream light and navy dark. */
export const dimColors = {
  primary: '#D4C5B0',
  primaryLight: '#DDD0BE',
  primaryDark: '#C8B89F',
  accent: navy,
  accentLight: '#1A3350',
  accentDark: '#0A1520',
  text: navy,
  textMuted: 'rgba(15,30,46,0.7)',
  textSecondary: 'rgba(15,30,46,0.5)',
  textOnAccent: '#FFFFFF',
  textAccent: green,
  cardBg: '#EBE0CE',
  cardBgElevated: '#F0E7D8',
  cardBgSelected: '#C8B89F',
  cardBgHover: '#E4D8C6',
  surface: '#CCBDA8',
  surfaceElevated: '#D9CBBA',
  surfaceBorder: 'rgba(15,30,46,0.12)',
  success: green,
  error: '#C62828',
  warning: gold,
  info: navy,
  gold: gold,
  goldLight: 'rgba(201,162,39,0.15)',
  goldMedium: 'rgba(201,162,39,0.3)',
  goldBorder: 'rgba(201,162,39,0.4)',
  valueGreen: green,
  valueGreenLight: 'rgba(46,125,50,0.15)',
  valueGreenBorder: 'rgba(46,125,50,0.3)',
  border: 'rgba(15,30,46,0.15)',
  borderLight: 'rgba(15,30,46,0.08)',
  borderAccent: navy,
  tabBarBg: '#D4C5B0',
  tabBarBorder: 'rgba(15,30,46,0.1)',
  tabActive: navy,
  tabInactive: 'rgba(15,30,46,0.4)',
  inputBg: '#EBE0CE',
  inputBorder: 'rgba(15,30,46,0.2)',
  inputPlaceholder: 'rgba(15,30,46,0.4)',
  overlay: 'rgba(15,30,46,0.5)',
  modalBg: '#DDD0BE',
  background: '#D4C5B0',
  backgroundAlt: '#C8B89F',
  statusBarStyle: 'dark-content' as const,
};

/** Dark — deep navy with cream text; the inverse of the default light theme. */
export const darkColors = {
  primary: '#0F1E2E',
  primaryLight: '#162638',
  primaryDark: '#07121E',
  accent: '#C9A227',
  accentLight: '#DAB840',
  accentDark: '#A88520',
  text: '#F4EBDD',
  textMuted: 'rgba(244,235,221,0.7)',
  textSecondary: 'rgba(244,235,221,0.5)',
  textOnAccent: '#0F1E2E',
  textAccent: '#C9A227',
  cardBg: '#162638',
  cardBgElevated: '#1E3044',
  cardBgSelected: '#253650',
  cardBgHover: '#1A2D40',
  surface: '#0B1828',
  surfaceElevated: '#162638',
  surfaceBorder: 'rgba(244,235,221,0.1)',
  success: '#34C759',
  error: '#FF453A',
  warning: '#C9A227',
  info: '#5BA4CF',
  gold: '#C9A227',
  goldLight: 'rgba(201,162,39,0.15)',
  goldMedium: 'rgba(201,162,39,0.3)',
  goldBorder: 'rgba(201,162,39,0.4)',
  valueGreen: '#34C759',
  valueGreenLight: 'rgba(52,199,89,0.15)',
  valueGreenBorder: 'rgba(52,199,89,0.3)',
  border: 'rgba(244,235,221,0.15)',
  borderLight: 'rgba(244,235,221,0.08)',
  borderAccent: '#C9A227',
  tabBarBg: '#0F1E2E',
  tabBarBorder: 'rgba(244,235,221,0.1)',
  tabActive: '#C9A227',
  tabInactive: 'rgba(244,235,221,0.5)',
  inputBg: '#162638',
  inputBorder: 'rgba(244,235,221,0.15)',
  inputPlaceholder: 'rgba(244,235,221,0.4)',
  overlay: 'rgba(0,0,0,0.7)',
  modalBg: '#162638',
  background: '#0F1E2E',
  backgroundAlt: '#162638',
  statusBarStyle: 'light-content' as const,
};

export const colorSchemes: ColorSchemes = {
  dark: darkColors,
  dim: dimColors,
  light: colors,
  default: 'light',
};

// Spacing, typography, and radius are shared across all market apps
export { spacing, typography, radius } from '@tastelanc/mobile-shared';
