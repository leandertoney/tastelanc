const STORAGE_HOST = 'kufcxxynjvyharhtfptd.supabase.co';
const PUBLIC_PREFIX = `https://${STORAGE_HOST}/storage/v1/object/public/`;

export type StorageImageOptions = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
};

export type StorageImageSource = {
  uri: string;
  contentFit: 'cover' | 'contain' | 'fill';
};

/**
 * No longer uses Supabase transformation API to avoid generating unique URLs per size.
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
): StorageImageSource | undefined {
  if (!url) return undefined;
  return {
    uri: url,
    contentFit: options?.resize || 'cover',
  };
}
