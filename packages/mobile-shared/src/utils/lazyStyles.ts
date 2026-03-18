/**
 * Lazy style factory — defers StyleSheet.create() until first use.
 * Solves the module-level style problem: colors aren't available at import time
 * because initTheme() hasn't been called yet. Styles are created on first access.
 *
 * Also reactive to theme switches: calling useThemeKey() inside the returned hook
 * subscribes the component to ThemeContext, causing a re-render when the theme
 * changes. The cache is invalidated by key so fresh styles are generated.
 *
 * Usage:
 *   const useStyles = createLazyStyles((colors) => ({
 *     container: { flex: 1, backgroundColor: colors.primary },
 *     text: { color: colors.text },
 *   }));
 *
 *   // In component:
 *   const styles = useStyles();
 */

import { StyleSheet } from 'react-native';
import type { ColorTokens } from '../types/config';
import { getColors } from '../config/theme';
import { useThemeKey } from '../context/ThemeContext';

type StyleFactory<T extends StyleSheet.NamedStyles<T>> = (colors: ColorTokens) => T;

/**
 * Creates a lazy style hook that defers StyleSheet.create() until first call.
 * The factory receives the current ColorTokens and returns style definitions.
 * Styles are cached per theme key and regenerated when the theme changes.
 */
export function createLazyStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: StyleFactory<T>,
): () => T {
  let cached: T | null = null;
  let cachedKey: string | null = null;

  return () => {
    // Subscribing to ThemeContext causes re-renders when the theme changes,
    // which in turn invalidates the cache below and recomputes styles.
    const themeKey = useThemeKey();

    if (!cached || cachedKey !== themeKey) {
      cached = StyleSheet.create(factory(getColors()));
      cachedKey = themeKey;
    }
    return cached;
  };
}
