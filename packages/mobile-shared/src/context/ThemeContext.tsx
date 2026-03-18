/**
 * ThemeContext — manages the user's chosen appearance mode (Dark / Dim / Light / System).
 *
 * - Persists the preference in AsyncStorage ('@theme_preference').
 * - Resolves 'system' to 'dark' or 'light' via the OS Appearance API.
 * - Calls setActiveColors() on the singleton when the theme changes so that
 *   createLazyStyles cache-busting and getColors() both return the right tokens.
 * - useThemeKey() is called inside every createLazyStyles hook — this subscription
 *   causes all styled components to re-render automatically when the theme changes.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ColorSchemes, ThemeMode, ColorTokens } from '../types/config';
import { setActiveColors, getThemeKey } from '../config/theme';

export const THEME_PREF_KEY = '@theme_preference';

interface ThemeContextValue {
  /** The stored preference (may be 'system'). */
  themeMode: ThemeMode;
  /** The actual resolved mode — never 'system'. Used for styling decisions. */
  resolvedMode: 'dark' | 'dim' | 'light';
  /** Change the active theme and persist the choice. */
  setThemeMode: (mode: ThemeMode) => void;
  /** Which modes have defined color schemes for this app. */
  availableModes: ThemeMode[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  colorSchemes: ColorSchemes;
  children: React.ReactNode;
}

function resolveMode(
  mode: ThemeMode,
  schemes: ColorSchemes,
): 'dark' | 'dim' | 'light' {
  if (mode === 'system') {
    const systemScheme = Appearance.getColorScheme();
    // For 'system': prefer light if available, else fall back to dark
    if (systemScheme === 'light' && schemes.light) return 'light';
    return 'dark';
  }
  // If the requested mode has no scheme, fall back to default
  if (mode === 'dim' && !schemes.dim) return resolveMode(schemes.default, schemes);
  if (mode === 'light' && !schemes.light) return resolveMode(schemes.default, schemes);
  return mode as 'dark' | 'dim' | 'light';
}

function getSchemeColors(
  resolved: 'dark' | 'dim' | 'light',
  schemes: ColorSchemes,
): ColorTokens {
  if (resolved === 'dim' && schemes.dim) return schemes.dim;
  if (resolved === 'light' && schemes.light) return schemes.light;
  return schemes.dark;
}

export function ThemeProvider({ colorSchemes, children }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(colorSchemes.default);
  const [resolvedMode, setResolvedMode] = useState<'dark' | 'dim' | 'light'>(
    resolveMode(colorSchemes.default, colorSchemes),
  );

  const availableModes: ThemeMode[] = [
    'dark',
    ...(colorSchemes.dim ? ['dim' as ThemeMode] : []),
    ...(colorSchemes.light ? ['light' as ThemeMode] : []),
    'system',
  ];

  const applyMode = useCallback(
    (mode: ThemeMode) => {
      const resolved = resolveMode(mode, colorSchemes);
      const colors = getSchemeColors(resolved, colorSchemes);
      setActiveColors(colors, resolved);
      setThemeModeState(mode);
      setResolvedMode(resolved);
    },
    [colorSchemes],
  );

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_PREF_KEY)
      .then((saved) => {
        if (saved && availableModes.includes(saved as ThemeMode)) {
          applyMode(saved as ThemeMode);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-resolve when OS appearance changes (only matters when themeMode === 'system')
  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      if (themeMode === 'system') {
        const resolved = resolveMode('system', colorSchemes);
        const colors = getSchemeColors(resolved, colorSchemes);
        setActiveColors(colors, resolved);
        setResolvedMode(resolved);
      }
    });
    return () => sub.remove();
  }, [themeMode, colorSchemes]);

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      applyMode(mode);
      AsyncStorage.setItem(THEME_PREF_KEY, mode).catch(() => {});
    },
    [applyMode],
  );

  return (
    <ThemeContext.Provider
      value={{ themeMode, resolvedMode, setThemeMode, availableModes }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/** Access the full theme context (mode, setter, available modes). */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() requires a <ThemeProvider> ancestor');
  return ctx;
}

/**
 * Returns the current resolved theme key ('dark' | 'dim' | 'light').
 * Called inside createLazyStyles hooks to subscribe to theme changes,
 * which causes components to re-render and pick up fresh styles.
 * Safe to call without a ThemeProvider (falls back to singleton key).
 */
export function useThemeKey(): string {
  const ctx = useContext(ThemeContext);
  if (!ctx) return getThemeKey();
  return ctx.resolvedMode;
}
