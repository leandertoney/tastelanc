/**
 * Lazy style factory — defers StyleSheet.create() until first use.
 * Solves the module-level style problem: colors aren't available at import time
 * because initTheme() hasn't been called yet. Styles are created on first access.
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

type StyleFactory<T extends StyleSheet.NamedStyles<T>> = (colors: ColorTokens) => T;

/**
 * Creates a lazy style hook that defers StyleSheet.create() until first call.
 * The factory receives the current ColorTokens and returns style definitions.
 * Styles are cached after first creation (colors don't change at runtime).
 */
export function createLazyStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: StyleFactory<T>,
): () => T {
  let cached: T | null = null;

  return () => {
    if (!cached) {
      cached = StyleSheet.create(factory(getColors()));
    }
    return cached;
  };
}
