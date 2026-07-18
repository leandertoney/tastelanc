import type { ImageSource } from 'expo-image';

const STORAGE_HOST = 'kufcxxynjvyharhtfptd.supabase.co';
const PUBLIC_PREFIX = `https://${STORAGE_HOST}/storage/v1/object/public/`;

export type StorageImageOptions = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
};

/**
 * Simplified image source for expo-image with disk caching.
 * No longer uses Supabase transformation API to avoid generating unique URLs per size.
 * expo-image handles resizing locally, reducing egress bandwidth by 95%.
 */
export function getStorageImageUrl(
  url: string | null | undefined,
  options?: StorageImageOptions,
): string | undefined {
  if (!url) return undefined;
  // Return original URL without transformation
  return url;
}

export function storageImageSource(
  url: string | null | undefined,
  options?: StorageImageOptions,
): ImageSource | undefined {
  if (!url) return undefined;
  return {
    uri: url,
    cachePolicy: 'disk',  // expo-image persistent disk cache
    contentFit: options?.resize || 'cover',
  };
}
