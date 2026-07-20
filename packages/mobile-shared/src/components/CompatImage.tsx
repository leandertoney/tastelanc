import React from 'react';
import { Image as RNImage, ImageResizeMode } from 'react-native';

/**
 * expo-image was pinned at ^56.0.11 against Expo SDK 54 (expects ~3.0.11) —
 * a major-version mismatch that crashes ExpoImageModule at native init on
 * launch (NoClassDefFoundError: AnyTypeCache), caught by Google Play's
 * pre-launch report on the v1.0.10 Android release. The disk-caching/egress
 * benefit expo-image was added for never reached a shipped binary anyway
 * (see git history: "Fix Supabase Storage egress..."), so this drops the
 * dependency entirely rather than chasing a compatible version — same public
 * API surface, backed by the stock RN Image.
 */

const CONTENT_FIT_TO_RESIZE_MODE: Record<string, ImageResizeMode> = {
  cover: 'cover',
  contain: 'contain',
  fill: 'stretch',
  'scale-down': 'contain',
  none: 'center',
};

export const Image = ({ contentFit, cachePolicy, transition, placeholder, source, ...rest }: any) => {
  // Strip expo-image-only keys (e.g. cachePolicy added by storageImageSource)
  let rnSource = source;
  if (source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source) {
    const { cachePolicy: _omit, ...srcRest } = source;
    rnSource = srcRest;
  }
  return (
    <RNImage
      source={rnSource}
      resizeMode={CONTENT_FIT_TO_RESIZE_MODE[contentFit] ?? 'cover'}
      {...rest}
    />
  );
};
