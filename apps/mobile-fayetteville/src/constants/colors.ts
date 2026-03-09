// Theme colors derived from BRAND.palette
// All UI tokens flow from the 4 brand colors defined in brand.ts
// Dark theme — Dreamville-inspired navy color system

import { BRAND } from '../config/brand';

const { background, navy: accentBlue, gold: red, green: blueAccent } = BRAND.palette;

export const colors = {
  // Primary background - dark navy
  primary: background,
  primaryLight: '#2A4060',
  primaryDark: '#111E2F',

  // Accent color - light blue (pin/highlight)
  accent: accentBlue,
  accentLight: '#A8C8E0',
  accentDark: '#7099B8',

  // Text colors (light text on dark background)
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.7)',
  textSecondary: 'rgba(255,255,255,0.5)',
  textOnAccent: '#FFFFFF',
  textAccent: accentBlue,

  // Card backgrounds (elevated surfaces on dark background)
  cardBg: '#253650',
  cardBgElevated: '#2C3F5C',
  cardBgSelected: '#334B6A',
  cardBgHover: '#2A4060',

  // Surface colors for layering
  surface: '#1E3044',
  surfaceElevated: '#253650',
  surfaceBorder: 'rgba(147,181,207,0.15)',

  // Utility colors (semantic)
  success: blueAccent,
  error: red,
  warning: '#FFD60A',
  info: accentBlue,

  // Premium/Red accent — fork red from logo (maps to "gold" slot in shared code)
  gold: red,
  goldLight: 'rgba(200,16,46,0.15)',
  goldMedium: 'rgba(200,16,46,0.3)',
  goldBorder: 'rgba(200,16,46,0.4)',

  // Value/Blue accent — bright blue (maps to "valueGreen" slot in shared code)
  valueGreen: blueAccent,
  valueGreenLight: 'rgba(74,144,217,0.15)',
  valueGreenBorder: 'rgba(74,144,217,0.3)',

  // Border colors
  border: 'rgba(147,181,207,0.2)',
  borderLight: 'rgba(147,181,207,0.1)',
  borderAccent: accentBlue,

  // Tab bar / Navigation
  tabBarBg: background,
  tabBarBorder: 'rgba(147,181,207,0.15)',
  tabActive: accentBlue,
  tabInactive: 'rgba(255,255,255,0.4)',

  // Input fields
  inputBg: '#253650',
  inputBorder: 'rgba(147,181,207,0.2)',
  inputPlaceholder: 'rgba(255,255,255,0.35)',

  // Overlay/Modal
  overlay: 'rgba(0,0,0,0.7)',
  modalBg: '#253650',

  // Legacy support
  background: background,
  backgroundAlt: '#253650',
};

// Spacing, typography, and radius are shared across all market apps
export { spacing, typography, radius } from '@tastelanc/mobile-shared';
