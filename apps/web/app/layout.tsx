import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'TasteLanc - Discover Lancaster\'s Best Dining & Nightlife',
  description: 'Find the best restaurants, happy hours, events, and nightlife in Lancaster, PA. TasteLanc is your guide to local dining and entertainment.',
  keywords: 'Lancaster PA restaurants, Lancaster happy hours, Lancaster events, Lancaster nightlife, dining Lancaster PA',
  authors: [{ name: 'TasteLanc' }],
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
    title: 'TasteLanc - Discover Lancaster\'s Best Dining & Nightlife',
    description: 'Find the best restaurants, happy hours, events, and nightlife in Lancaster, PA.',
    url: siteUrl,
    siteName: 'TasteLanc',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TasteLanc - Discover Lancaster\'s Best Dining & Nightlife',
    description: 'Find the best restaurants, happy hours, events, and nightlife in Lancaster, PA.',
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
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
