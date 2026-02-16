import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import { BRAND } from '@/config/market';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

/** Convert hex color (#RRGGBB) to space-separated RGB for Tailwind opacity modifiers */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
}

const brandCssVars = `
:root {
  --brand-accent: ${hexToRgb(BRAND.colors.accent)};
  --brand-accent-hover: ${hexToRgb(BRAND.colors.accentHover)};
  --brand-gold: ${hexToRgb(BRAND.colors.gold)};
  --brand-bg: ${hexToRgb(BRAND.colors.bg)};
  --brand-card: ${hexToRgb(BRAND.colors.card)};
  --brand-surface: ${hexToRgb(BRAND.colors.surface)};
  --brand-surface-light: ${hexToRgb(BRAND.colors.surfaceLight)};
  --brand-accent-hex: ${BRAND.colors.accent};
  --brand-gold-hex: ${BRAND.colors.gold};
}
`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: BRAND.seo.title,
  description: BRAND.seo.description,
  keywords: BRAND.seo.keywords.join(', '),
  authors: [{ name: BRAND.name }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: BRAND.seo.title,
    description: BRAND.seo.description,
    url: siteUrl,
    siteName: BRAND.name,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND.seo.title,
    description: BRAND.seo.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandCssVars }} />
      </head>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
