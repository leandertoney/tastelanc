import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'TasteLanc - Discover Lancaster\'s Best Dining & Nightlife',
  description: 'Find the best restaurants, happy hours, events, and nightlife in Lancaster, PA. TasteLanc is your guide to local dining and entertainment.',
  keywords: 'Lancaster PA restaurants, Lancaster happy hours, Lancaster events, Lancaster nightlife, dining Lancaster PA',
  authors: [{ name: 'TasteLanc' }],
  openGraph: {
    title: 'TasteLanc - Discover Lancaster\'s Best Dining & Nightlife',
    description: 'Find the best restaurants, happy hours, events, and nightlife in Lancaster, PA.',
    url: 'https://tastelanc.com',
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
