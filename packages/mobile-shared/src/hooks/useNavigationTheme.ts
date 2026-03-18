/**
 * Returns a React Navigation Theme object derived from the current app color tokens.
 * Pass this to the `theme` prop on <NavigationContainer> so that all navigation
 * headers, tab bars, and modals automatically update when the user switches themes.
 *
 * Usage:
 *   const navTheme = useNavigationTheme();
 *   <NavigationContainer theme={navTheme} ...>
 */

import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import { getColors } from '../config/theme';
import { useThemeKey } from '../context/ThemeContext';

export function useNavigationTheme(): Theme {
  const themeKey = useThemeKey();
  const colors = getColors();

  const isDark = themeKey === 'dark' || themeKey === 'dim';
  const base = isDark ? DarkTheme : DefaultTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.primary,
      card: colors.primary,       // header and tab bar background
      text: colors.text,          // header title and tab label color
      border: colors.tabBarBorder,
      notification: colors.accent,
    },
  };
}
