import { BRAND } from '@/config/market';
import { Metadata } from 'next';
import Link from 'next/link';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

export const metadata: Metadata = {
  title: `Download ${BRAND.name} | ${BRAND.countyShort} Restaurant Discovery App`,
  description: `Discover the best restaurants, happy hours, events, and specials in ${BRAND.countyShort}, ${BRAND.state}. Download ${BRAND.name} free.`,
  openGraph: {
    title: `Download ${BRAND.name}`,
    description: `Your guide to ${BRAND.countyShort} food & drink. Happy hours, events, specials — all in one app.`,
    url: `${siteUrl}/instagram`,
  },
};

export default function InstagramLandingPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  // Preserve UTM params for attribution
  const utmSource = searchParams.utm_source || 'instagram';
  const utmMedium = searchParams.utm_medium || 'social';
  const utmCampaign = searchParams.utm_campaign || 'bio';

  const appStoreUrl = BRAND.appStoreUrls.ios;
  const playStoreUrl = BRAND.appStoreUrls.android;

  // Append UTMs to store links if they support it
  const utmSuffix = `?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}`;

  return (
    <main className="min-h-screen bg-[rgb(var(--brand-bg))] text-tastelanc-text-primary flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo / Brand */}
        <div>
          <h1 className="text-4xl font-bold text-[rgb(var(--brand-accent))]">
            {BRAND.name}
          </h1>
          <p className="text-lg text-tastelanc-text-secondary mt-2">
            {BRAND.countyShort}&apos;s restaurant discovery app
          </p>
        </div>

        {/* Value props */}
        <div className="space-y-4 text-left">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🍻</span>
            <div>
              <p className="font-semibold">Happy Hours</p>
              <p className="text-sm text-tastelanc-text-muted">Find what&apos;s running right now</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎵</span>
            <div>
              <p className="font-semibold">Live Music & Events</p>
              <p className="text-sm text-tastelanc-text-muted">Tonight&apos;s lineup, every night</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="font-semibold">Specials & Deals</p>
              <p className="text-sm text-tastelanc-text-muted">Exclusive offers from local spots</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">📍</span>
            <div>
              <p className="font-semibold">100% Local</p>
              <p className="text-sm text-tastelanc-text-muted">Built for {BRAND.countyShort}, PA — not some generic app</p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          {appStoreUrl && (
            <a
              href={`${appStoreUrl}${utmSuffix}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[rgb(var(--brand-accent))] hover:bg-[rgb(var(--brand-accent-hover))] text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors"
            >
              Download on the App Store
            </a>
          )}
          {playStoreUrl && (
            <a
              href={`${playStoreUrl}${utmSuffix}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors border border-white/20"
            >
              Get it on Google Play
            </a>
          )}
        </div>

        {/* Explore web version */}
        <p className="text-sm text-tastelanc-text-faint">
          or{' '}
          <Link
            href={`/${utmSuffix}`}
            className="text-[rgb(var(--brand-accent))] hover:underline"
          >
            explore on the web
          </Link>
        </p>
      </div>
    </main>
  );
}
