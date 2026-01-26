import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TasteLanc',
    short_name: 'TasteLanc',
    description:
      "Discover Lancaster's best dining, happy hours, events, and nightlife.",
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
