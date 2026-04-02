// Theme colors for TasteOceanCity
// 4-color vintage coastal palette (+ white as free fifth)
//   Sky Blue  #B8D8E8 — background
//   Salmon    #D4785A — primary accent (buttons, pins, badges, active states)
//   Sun Yellow #F5C842 — CTA, highlights, gold slot
//   Deep Teal  #1A4A5A — text, headers, dark elements
//   White      #FFFFFF — cards, surfaces, inputs (free fifth)

import type { ColorSchemes } from '@tastelanc/mobile-shared/src/types/config';

const skyBlue = '#B8D8E8';
const salmon = '#D4785A';
const sunYellow = '#F5C842';
const deepTeal = '#1A4A5A';

/** Light — sky blue background, salmon accent, yellow CTA */
export const colors = {
  // Primary background — sky blue
  primary: skyBlue,
  primaryLight: '#CCE8F4',
  primaryDark: '#9CC4D8',

  // Accent — salmon (primary buttons, active states, links)
  accent: salmon,
  accentLight: '#E09070',
  accentDark: '#B85E40',

  // Text — deep teal on sky blue
  text: deepTeal,
  textMuted: 'rgba(26,74,90,0.65)',
  textSecondary: 'rgba(26,74,90,0.5)',
  textOnAccent: '#FFFFFF',
  textAccent: salmon,

  // Cards — white surfaces popping off the sky blue bg
  cardBg: '#FFFFFF',
  cardBgElevated: '#F8FAFB',
  cardBgSelected: 'rgba(212,120,90,0.06)',
  cardBgHover: 'rgba(212,120,90,0.04)',

  // Surfaces
  surface: '#CCE8F4',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: 'rgba(26,74,90,0.08)',

  // Semantic
  success: '#4CAF7D',
  error: '#C0392B',
  warning: sunYellow,
  info: deepTeal,

  // Gold/CTA — sun yellow
  gold: sunYellow,
  goldLight: 'rgba(245,200,66,0.15)',
  goldMedium: 'rgba(245,200,66,0.30)',
  goldBorder: 'rgba(245,200,66,0.45)',

  // Value/positive
  valueGreen: '#4CAF7D',
  valueGreenLight: 'rgba(76,175,125,0.12)',
  valueGreenBorder: 'rgba(76,175,125,0.3)',

  // Borders — teal tint
  border: 'rgba(26,74,90,0.12)',
  borderLight: 'rgba(26,74,90,0.07)',
  borderAccent: salmon,

  // Tab bar — matches sky blue background, deep teal active tab
  tabBarBg: skyBlue,
  tabBarBorder: 'rgba(26,74,90,0.08)',
  tabActive: deepTeal,
  tabInactive: 'rgba(26,74,90,0.35)',

  // Inputs — white fields on sky blue bg
  inputBg: '#FFFFFF',
  inputBorder: 'rgba(26,74,90,0.15)',
  inputPlaceholder: 'rgba(26,74,90,0.4)',

  // Overlays
  overlay: 'rgba(26,74,90,0.6)',
  modalBg: '#FFFFFF',

  // Legacy aliases
  background: skyBlue,
  backgroundAlt: '#CCE8F4',


  // Salmon — map pins, badges, notification dots, highlights
  salmon,
  salmonLight: '#E8A090',
  salmonMuted: 'rgba(212,120,90,0.10)',
  pin: salmon,          // map pins
  badge: salmon,        // notification badges, "Pick" labels
  highlight: salmon,    // featured banners

  // Cobalt alias (legacy compat for shared components)
  cobalt: deepTeal,
  cobaltLight: '#2A6A7A',
  cobaltMuted: 'rgba(26,74,90,0.08)',

  statusBarStyle: 'dark-content' as const,
};

/** Dim — slightly deeper sky blue, same salmon accent */
export const dimColors = {
  primary: '#9CC4D8',
  primaryLight: skyBlue,
  primaryDark: '#80AECA',
  accent: salmon,
  accentLight: '#E09070',
  accentDark: '#B85E40',
  text: deepTeal,
  textMuted: 'rgba(26,74,90,0.6)',
  textSecondary: 'rgba(26,74,90,0.45)',
  textOnAccent: '#FFFFFF',
  textAccent: salmon,
  cardBg: '#FFFFFF',
  cardBgElevated: '#F8FAFB',
  cardBgSelected: 'rgba(212,120,90,0.06)',
  cardBgHover: 'rgba(212,120,90,0.04)',
  surface: '#80AECA',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: 'rgba(26,74,90,0.08)',
  success: '#4CAF7D',
  error: '#C0392B',
  warning: sunYellow,
  info: deepTeal,
  gold: sunYellow,
  goldLight: 'rgba(245,200,66,0.12)',
  goldMedium: 'rgba(245,200,66,0.25)',
  goldBorder: 'rgba(245,200,66,0.40)',
  valueGreen: '#4CAF7D',
  valueGreenLight: 'rgba(76,175,125,0.12)',
  valueGreenBorder: 'rgba(76,175,125,0.3)',
  border: 'rgba(26,74,90,0.12)',
  borderLight: 'rgba(26,74,90,0.07)',
  borderAccent: salmon,
  tabBarBg: '#9CC4D8',
  tabBarBorder: 'rgba(26,74,90,0.08)',
  tabActive: deepTeal,
  tabInactive: 'rgba(26,74,90,0.35)',
  inputBg: '#FFFFFF',
  inputBorder: 'rgba(26,74,90,0.12)',
  inputPlaceholder: 'rgba(26,74,90,0.35)',
  overlay: 'rgba(26,74,90,0.5)',
  modalBg: '#FFFFFF',
  background: '#9CC4D8',
  backgroundAlt: skyBlue,
  salmon,
  salmonLight: '#E8A090',
  salmonMuted: 'rgba(212,120,90,0.10)',
  pin: salmon,
  badge: salmon,
  highlight: salmon,
  cobalt: deepTeal,
  cobaltLight: '#2A6A7A',
  cobaltMuted: 'rgba(26,74,90,0.08)',
  statusBarStyle: 'dark-content' as const,
};

/** Dark — deep teal with sky blue, salmon, and yellow popping on dark background */
export const darkColors = {
  primary: deepTeal,
  primaryLight: '#2A6A7A',
  primaryDark: '#0F3040',
  accent: salmon,
  accentLight: '#E09070',
  accentDark: '#B85E40',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.70)',
  textSecondary: 'rgba(255,255,255,0.50)',
  textOnAccent: '#FFFFFF',
  textAccent: sunYellow,
  cardBg: '#2A6A7A',
  cardBgElevated: '#307888',
  cardBgSelected: '#368090',
  cardBgHover: '#1A4A5A',
  surface: '#143850',
  surfaceElevated: '#2A6A7A',
  surfaceBorder: 'rgba(212,120,90,0.15)',
  success: sunYellow,
  error: '#C0392B',
  warning: sunYellow,
  info: skyBlue,
  gold: sunYellow,
  goldLight: 'rgba(245,200,66,0.15)',
  goldMedium: 'rgba(245,200,66,0.30)',
  goldBorder: 'rgba(245,200,66,0.40)',
  valueGreen: sunYellow,
  valueGreenLight: 'rgba(245,200,66,0.15)',
  valueGreenBorder: 'rgba(245,200,66,0.30)',
  border: 'rgba(184,216,232,0.20)',
  borderLight: 'rgba(184,216,232,0.10)',
  borderAccent: salmon,
  tabBarBg: deepTeal,
  tabBarBorder: 'rgba(184,216,232,0.15)',
  tabActive: skyBlue,
  tabInactive: 'rgba(255,255,255,0.40)',
  inputBg: '#143850',
  inputBorder: 'rgba(184,216,232,0.20)',
  inputPlaceholder: 'rgba(255,255,255,0.35)',
  overlay: 'rgba(0,0,0,0.70)',
  modalBg: '#2A6A7A',
  background: deepTeal,
  backgroundAlt: '#2A6A7A',
  salmon,
  salmonLight: '#E8A090',
  salmonMuted: 'rgba(212,120,90,0.15)',
  pin: salmon,
  badge: salmon,
  highlight: sunYellow,
  cobalt: deepTeal,
  cobaltLight: '#2A6A7A',
  cobaltMuted: 'rgba(26,74,90,0.50)',
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
