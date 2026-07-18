import React from 'react';
import { Image as RNImage, ImageResizeMode } from 'react-native';

/**
 * Binary-compatible Image.
 *
 * expo-image's native module (ExpoImage) only exists in binaries built after
 * 2026-06-20, but every store binary in the wild predates that. On those
 * binaries `require('expo-image')` throws at bundle load, which crashed every
 * OTA update published since June and made expo-updates roll devices back to
 * the last pre-expo-image bundle (the "updates keep reverting" bug).
 *
 * This wrapper uses expo-image (disk caching, less Supabase egress) when the
 * native module is present and falls back to the core <Image> when it isn't,
 * so a single OTA bundle runs on every binary. Once all store binaries include
 * expo-image, imports can move back to 'expo-image' directly.
 */

let ExpoImage: React.ComponentType<any> | null = null;
try {
  // Throws on binaries missing the ExpoImage native module
  ExpoImage = require('expo-image').Image;
} catch {
  ExpoImage = null;
}

const CONTENT_FIT_TO_RESIZE_MODE: Record<string, ImageResizeMode> = {
  cover: 'cover',
  contain: 'contain',
  fill: 'stretch',
  'scale-down': 'contain',
  none: 'center',
};

const FallbackImage = ({ contentFit, cachePolicy, transition, placeholder, source, ...rest }: any) => {
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

export const Image: React.ComponentType<any> = ExpoImage ?? FallbackImage;
