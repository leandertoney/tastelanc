import Link from 'next/link';
import type { Metadata } from 'next';
import { BRAND } from '@/config/market';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

export const metadata: Metadata = {
  title: `Page Not Found | ${BRAND.name}`,
  description: `The page you're looking for doesn't exist. Explore restaurants, events, happy hours, and specials in ${BRAND.countyShort}, ${BRAND.state}.`,
  alternates: { canonical: `${siteUrl}/404` },
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-brand-accent mb-4">404</h1>
        <h2 className="text-xl font-semibold text-tastelanc-text-primary mb-2">
          Page Not Found
        </h2>
        <p className="text-tastelanc-text-muted text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors font-medium"
          >
            Go Home
          </Link>
          <Link
            href="/restaurants"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-tastelanc-border text-tastelanc-text-primary hover:bg-tastelanc-surface rounded-lg transition-colors font-medium"
          >
            Browse Restaurants
          </Link>
        </div>
      </div>
    </div>
  );
}
