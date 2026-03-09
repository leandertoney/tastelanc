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

// Spacing, typography, and radius are shared across all market apps
export { spacing, typography, radius } from '@tastelanc/mobile-shared';
