import type { MetadataRoute } from 'next';
import { BRAND } from '@/config/market';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.seo.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#121212',
    theme_color: '#C4A962',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
