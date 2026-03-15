import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import { BRAND } from '@/config/market';
import { ThemedToaster } from '@/components/ui/ThemedToaster';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

/** Convert hex color (#RRGGBB) to space-separated RGB for Tailwind opacity modifiers */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
}

/** Shared accent variables (same in light & dark) */
const accentVars = `
  --brand-accent: ${hexToRgb(BRAND.colors.accent)};
  --brand-accent-hover: ${hexToRgb(BRAND.colors.accentHover)};
  --brand-accent-hex: ${BRAND.colors.accent};
`;

function modeVars(m: typeof BRAND.colors.dark) {
  return `
  --brand-bg: ${hexToRgb(m.bg)};
  --brand-card: ${hexToRgb(m.card)};
  --brand-surface: ${hexToRgb(m.surface)};
  --brand-surface-light: ${hexToRgb(m.surfaceLight)};
  --brand-header-bg: ${hexToRgb(m.headerBg)};
  --brand-header-text: ${hexToRgb(m.headerText)};
  --brand-text-primary: ${hexToRgb(m.textPrimary)};
  --brand-text-secondary: ${hexToRgb(m.textSecondary)};
  --brand-text-muted: ${hexToRgb(m.textMuted)};
  --brand-text-faint: ${hexToRgb(m.textFaint)};
  --brand-border: ${hexToRgb(m.border)};
  --brand-border-light: ${hexToRgb(m.borderLight)};
  --brand-input-bg: ${hexToRgb(m.inputBg)};
  --brand-gold: ${hexToRgb(m.gold)};
  --brand-gold-hex: ${m.gold};
  `;
}

const brandCssVars = `
[data-theme="dark"], :root {
  ${accentVars}
  ${modeVars(BRAND.colors.dark)}
}
[data-theme="light"] {
  ${accentVars}
  ${modeVars(BRAND.colors.light)}
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandCssVars }} />
        {/* Smart App Banner — Safari on iOS auto-shows "Open in App" */}
        {BRAND.appStoreUrls.ios && (
          <meta name="apple-itunes-app" content={`app-id=${BRAND.iosAppId}`} />
        )}
        {/* SoftwareApplication schema — enables app install cards in search results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: BRAND.name,
              description: BRAND.seo.description,
              url: siteUrl,
              operatingSystem: 'iOS, Android',
              applicationCategory: 'LifestyleApplication',
              ...(BRAND.appStoreUrls.ios && {
                installUrl: BRAND.appStoreUrls.ios,
              }),
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
        <ThemedToaster />
      </body>
    </html>
  );
}
