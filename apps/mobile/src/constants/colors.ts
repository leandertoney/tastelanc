// TasteLanc Brand Colors
// Dark theme with charcoal backgrounds, white and red accent text
// Inspired by Apple's design language

import type { ColorSchemes } from '@tastelanc/mobile-shared/src/types/config';

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
  textOnAccent: '#FFFFFF',
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

/** Dim — slightly lifted charcoal; same accent/text, just less cave-like. */
export const dimColors = {
  primary: '#282828',
  primaryLight: '#303030',
  primaryDark: '#1E1E1E',
  accent: '#A41E22',
  accentLight: '#C42428',
  accentDark: '#8A1A1D',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.7)',
  textSecondary: 'rgba(255,255,255,0.5)',
  textOnAccent: '#FFFFFF',
  textAccent: '#A41E22',
  cardBg: '#333333',
  cardBgElevated: '#383838',
  cardBgSelected: '#404040',
  cardBgHover: '#3A3A3A',
  surface: '#2C2C2C',
  surfaceElevated: '#353535',
  surfaceBorder: 'rgba(255,255,255,0.1)',
  success: '#34C759',
  error: '#FF453A',
  warning: '#FFD60A',
  info: '#0A84FF',
  gold: '#FFD700',
  goldLight: 'rgba(255,215,0,0.15)',
  goldMedium: 'rgba(255,215,0,0.3)',
  goldBorder: 'rgba(255,215,0,0.4)',
  valueGreen: '#34C759',
  valueGreenLight: 'rgba(52,199,89,0.15)',
  valueGreenBorder: 'rgba(52,199,89,0.3)',
  border: 'rgba(255,255,255,0.15)',
  borderLight: 'rgba(255,255,255,0.08)',
  borderAccent: '#A41E22',
  tabBarBg: '#282828',
  tabBarBorder: 'rgba(255,255,255,0.1)',
  tabActive: '#A41E22',
  tabInactive: 'rgba(255,255,255,0.5)',
  inputBg: '#333333',
  inputBorder: 'rgba(255,255,255,0.15)',
  inputPlaceholder: 'rgba(255,255,255,0.4)',
  overlay: 'rgba(0,0,0,0.7)',
  modalBg: '#303030',
  background: '#282828',
  backgroundAlt: '#303030',
  statusBarStyle: 'light-content' as const,
};

/** Light — bright off-white with dark text; brand red accent preserved. */
export const lightColors = {
  primary: '#F5F5F5',
  primaryLight: '#FFFFFF',
  primaryDark: '#EBEBEB',
  accent: '#A41E22',
  accentLight: '#C42428',
  accentDark: '#8A1A1D',
  text: '#1A1A1A',
  textMuted: 'rgba(0,0,0,0.55)',
  textSecondary: 'rgba(0,0,0,0.4)',
  textOnAccent: '#FFFFFF',
  textAccent: '#A41E22',
  cardBg: '#FFFFFF',
  cardBgElevated: '#FAFAFA',
  cardBgSelected: '#FFE8E8',
  cardBgHover: '#F8F8F8',
  surface: '#F5F5F5',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: 'rgba(0,0,0,0.06)',
  success: '#28A745',
  error: '#DC3545',
  warning: '#FFC107',
  info: '#007BFF',
  gold: '#B8860B',
  goldLight: 'rgba(184,134,11,0.12)',
  goldMedium: 'rgba(184,134,11,0.25)',
  goldBorder: 'rgba(184,134,11,0.4)',
  valueGreen: '#28A745',
  valueGreenLight: 'rgba(40,167,69,0.12)',
  valueGreenBorder: 'rgba(40,167,69,0.3)',
  border: 'rgba(0,0,0,0.1)',
  borderLight: 'rgba(0,0,0,0.06)',
  borderAccent: '#A41E22',
  tabBarBg: '#FFFFFF',
  tabBarBorder: 'rgba(0,0,0,0.1)',
  tabActive: '#A41E22',
  tabInactive: 'rgba(0,0,0,0.4)',
  inputBg: '#FFFFFF',
  inputBorder: 'rgba(0,0,0,0.15)',
  inputPlaceholder: 'rgba(0,0,0,0.35)',
  overlay: 'rgba(0,0,0,0.5)',
  modalBg: '#FFFFFF',
  background: '#F5F5F5',
  backgroundAlt: '#EBEBEB',
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
