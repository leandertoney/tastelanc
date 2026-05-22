import { PixelRatio } from 'react-native';

const STORAGE_HOST = 'kufcxxynjvyharhtfptd.supabase.co';
const PUBLIC_PREFIX = `https://${STORAGE_HOST}/storage/v1/object/public/`;
const RENDER_PREFIX = `https://${STORAGE_HOST}/storage/v1/render/image/public/`;

export type StorageImageOptions = {
  width: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
};

export function getStorageImageUrl(
  url: string | null | undefined,
  options: StorageImageOptions,
): string | undefined {
  if (!url) return undefined;
  if (!url.startsWith(PUBLIC_PREFIX)) return url;

  const path = url.slice(PUBLIC_PREFIX.length);
  const dpr = Math.min(PixelRatio.get(), 3);
  const params = new URLSearchParams();
  params.set('width', String(Math.round(options.width * dpr)));
  if (options.height) params.set('height', String(Math.round(options.height * dpr)));
  params.set('quality', String(options.quality ?? 70));
  params.set('resize', options.resize ?? 'cover');
  return `${RENDER_PREFIX}${path}?${params.toString()}`;
}

export function storageImageSource(
  url: string | null | undefined,
  options: StorageImageOptions,
): { uri: string; cache: 'force-cache' } | undefined {
  const transformed = getStorageImageUrl(url, options);
  if (!transformed) return undefined;
  return { uri: transformed, cache: 'force-cache' };
}
