/**
 * AppConfigContext — React Context for accessing brand, colors, and assets
 * in shared components. Prefer this over the singleton in React code.
 */

import React, { createContext, useContext } from 'react';
import type { AppBrand, ColorTokens, AppAssets, AppConfig } from '../types/config';

const AppConfigContext = createContext<AppConfig | null>(null);

interface AppConfigProviderProps {
  brand: AppBrand;
  colors: ColorTokens;
  assets: AppAssets;
  children: React.ReactNode;
}

export function AppConfigProvider({ brand, colors, assets, children }: AppConfigProviderProps) {
  const value = React.useMemo(() => ({ brand, colors, assets }), [brand, colors, assets]);
  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

/** Access the full app config (brand + colors + assets). */
export function useAppConfig(): AppConfig {
  const ctx = useContext(AppConfigContext);
  if (!ctx) {
    throw new Error('useAppConfig() must be used within an <AppConfigProvider>');
  }
  return ctx;
}

/** Shorthand: access just the color tokens. */
export function useColors(): ColorTokens {
  return useAppConfig().colors;
}

/** Shorthand: access just the brand config. */
export function useBrand(): AppBrand {
  return useAppConfig().brand;
}

/** Shorthand: access just the app assets. */
export function useAssets(): AppAssets {
  return useAppConfig().assets;
}
