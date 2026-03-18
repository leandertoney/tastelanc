// Theme colors derived from BRAND.palette
// All UI tokens flow from the 4 brand colors defined in brand.ts
// Dark theme — Fayetteville navy color system

import type { ColorSchemes } from '@tastelanc/mobile-shared/src/types/config';
import { BRAND } from '../config/brand';

const { background, navy: accentBlue, gold: red, green: blueAccent } = BRAND.palette;

export const colors = {
  // Primary background - dark navy
  primary: background,
  primaryLight: '#1E3044',
  primaryDark: '#050E1A',

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
  cardBg: '#162638',
  cardBgElevated: '#1E3044',
  cardBgSelected: '#253650',
  cardBgHover: '#1A2D40',

  // Surface colors for layering
  surface: '#0F1E2F',
  surfaceElevated: '#162638',
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
  inputBg: '#162638',
  inputBorder: 'rgba(147,181,207,0.2)',
  inputPlaceholder: 'rgba(255,255,255,0.35)',

  // Overlay/Modal
  overlay: 'rgba(0,0,0,0.7)',
  modalBg: '#162638',

  // Legacy support
  background: background,
  backgroundAlt: '#162638',
};

/** Dim — slightly lifted navy; same accent/text, less deep. */
export const dimColors = {
  primary: '#1A2D40',
  primaryLight: '#243A50',
  primaryDark: '#112030',
  accent: accentBlue,
  accentLight: '#A8C8E0',
  accentDark: '#7099B8',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.7)',
  textSecondary: 'rgba(255,255,255,0.5)',
  textOnAccent: '#FFFFFF',
  textAccent: accentBlue,
  cardBg: '#243A50',
  cardBgElevated: '#2C4560',
  cardBgSelected: '#344F6C',
  cardBgHover: '#263E56',
  surface: '#162030',
  surfaceElevated: '#1E3044',
  surfaceBorder: 'rgba(147,181,207,0.15)',
  success: blueAccent,
  error: red,
  warning: '#FFD60A',
  info: accentBlue,
  gold: red,
  goldLight: 'rgba(200,16,46,0.15)',
  goldMedium: 'rgba(200,16,46,0.3)',
  goldBorder: 'rgba(200,16,46,0.4)',
  valueGreen: blueAccent,
  valueGreenLight: 'rgba(74,144,217,0.15)',
  valueGreenBorder: 'rgba(74,144,217,0.3)',
  border: 'rgba(147,181,207,0.2)',
  borderLight: 'rgba(147,181,207,0.1)',
  borderAccent: accentBlue,
  tabBarBg: '#1A2D40',
  tabBarBorder: 'rgba(147,181,207,0.15)',
  tabActive: accentBlue,
  tabInactive: 'rgba(255,255,255,0.4)',
  inputBg: '#243A50',
  inputBorder: 'rgba(147,181,207,0.2)',
  inputPlaceholder: 'rgba(255,255,255,0.35)',
  overlay: 'rgba(0,0,0,0.7)',
  modalBg: '#243A50',
  background: '#1A2D40',
  backgroundAlt: '#243A50',
  statusBarStyle: 'light-content' as const,
};

/** Light — airy sky-blue/gray with dark text and light-blue accent. */
export const lightColors = {
  primary: '#F0F4F8',
  primaryLight: '#FFFFFF',
  primaryDark: '#E2EAF0',
  accent: '#1A5C8A',
  accentLight: '#2275AD',
  accentDark: '#134670',
  text: '#1A2838',
  textMuted: 'rgba(26,40,56,0.55)',
  textSecondary: 'rgba(26,40,56,0.4)',
  textOnAccent: '#FFFFFF',
  textAccent: '#1A5C8A',
  cardBg: '#FFFFFF',
  cardBgElevated: '#FAFBFD',
  cardBgSelected: '#D8E9F5',
  cardBgHover: '#F3F7FB',
  surface: '#F0F4F8',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: 'rgba(26,40,56,0.06)',
  success: '#28A745',
  error: '#C8102E',
  warning: '#FFC107',
  info: '#1A5C8A',
  gold: '#C8102E',
  goldLight: 'rgba(200,16,46,0.1)',
  goldMedium: 'rgba(200,16,46,0.2)',
  goldBorder: 'rgba(200,16,46,0.35)',
  valueGreen: '#28A745',
  valueGreenLight: 'rgba(40,167,69,0.12)',
  valueGreenBorder: 'rgba(40,167,69,0.3)',
  border: 'rgba(26,40,56,0.1)',
  borderLight: 'rgba(26,40,56,0.06)',
  borderAccent: '#1A5C8A',
  tabBarBg: '#FFFFFF',
  tabBarBorder: 'rgba(26,40,56,0.1)',
  tabActive: '#1A5C8A',
  tabInactive: 'rgba(26,40,56,0.4)',
  inputBg: '#FFFFFF',
  inputBorder: 'rgba(26,40,56,0.15)',
  inputPlaceholder: 'rgba(26,40,56,0.35)',
  overlay: 'rgba(0,0,0,0.5)',
  modalBg: '#FFFFFF',
  background: '#F0F4F8',
  backgroundAlt: '#E2EAF0',
  statusBarStyle: 'dark-content' as const,
};

export const colorSchemes: ColorSchemes = {
  dark: colors,
  dim: dimColors,
  light: lightColors,
  default: 'dark',
};

// Spacing, typography, and radius are shared across all market apps
export { spacing, typography, radius } from '@tastelanc/mobile-shared';
