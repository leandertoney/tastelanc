import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { MapPin } from 'lucide-react';
import { BRAND } from '@/config/market';
import { buildMeta } from '@/lib/seo/meta';
import { getLandingPage, getAllLandingPageSlugs, type LandingPageConfig } from '@/lib/seo/landing-pages';
import { fetchRestaurants, fetchRestaurantsByCategory, fetchHappyHoursWithRestaurants } from '@/lib/seo/data';
import { itemListJsonLd } from '@/lib/seo/structured';
import { faqJsonLd } from '@/lib/seo/faq-schema';
import { AppGateCTA } from '@/components/seo/AppGateCTA';
import type { Restaurant } from '@/lib/seo/types';

export const revalidate = 3600; // Regenerate every hour

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

// ── Static Params ──────────────────────────────────────

export function generateStaticParams() {
  return getAllLandingPageSlugs().map((slug) => ({ slug }));
}

// ── Metadata ───────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = getLandingPage(slug);
  if (!config) return {};

  return buildMeta({
    title: config.title(BRAND),
    description: config.description(BRAND),
    url: `${siteUrl}/best/${slug}`,
  });
}

// ── Data Fetching ──────────────────────────────────────

async function fetchLandingData(config: LandingPageConfig) {
  if (config.dataType === 'restaurants') {
    if (config.filter.category) {
      return { restaurants: await fetchRestaurantsByCategory(config.filter.category), happyHours: [] };
    }
    return { restaurants: await fetchRestaurants(true), happyHours: [] };
  }

  if (config.dataType === 'happy-hours') {
    const happyHours = await fetchHappyHoursWithRestaurants(config.filter.day);
    return { restaurants: [], happyHours };
  }

  return { restaurants: [], happyHours: [] };
}

// ── Page ───────────────────────────────────────────────

export default async function BestOfPage({ params }: PageProps) {
  const { slug } = await params;
  const config = getLandingPage(slug);
  if (!config) notFound();

  const { restaurants, happyHours } = await fetchLandingData(config);

  // Determine what to show
  const isHappyHours = config.dataType === 'happy-hours';
  const totalCount = isHappyHours ? happyHours.length : restaurants.length;

  const VISIBLE_COUNT = 6;
  const visibleRestaurants = restaurants.slice(0, VISIBLE_COUNT);
  const blurredRestaurants = restaurants.slice(VISIBLE_COUNT, VISIBLE_COUNT + 2);
  const visibleHH = happyHours.slice(0, VISIBLE_COUNT);
  const blurredHH = happyHours.slice(VISIBLE_COUNT, VISIBLE_COUNT + 2);
  const hiddenCount = Math.max(0, totalCount - VISIBLE_COUNT);

  // JSON-LD
  const urls = isHappyHours
    ? visibleHH.map((hh) => `${siteUrl}/restaurants/${hh.restaurant?.slug}`)
    : visibleRestaurants.map((r) => `${siteUrl}/restaurants/${r.slug}`);
  const listJsonLd = itemListJsonLd(urls);

  const faqs = config.faqs.map((f) => ({ question: f.q(BRAND), answer: f.a(BRAND) }));
  const faqLd = faqJsonLd(faqs);

  // Related pages
  const relatedPages = config.relatedSlugs
    .map((s) => getLandingPage(s))
    .filter(Boolean) as LandingPageConfig[];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <main className="max-w-5xl mx-auto px-4 py-10 text-tastelanc-text-primary">
        {/* H1 with target keyword */}
        <h1 className="text-4xl font-bold mb-3">{config.h1(BRAND)}</h1>
        <p className="text-tastelanc-text-muted text-lg mb-8 max-w-3xl">{config.intro(BRAND)}</p>

        {/* Item count */}
        <p className="text-sm text-tastelanc-text-faint mb-6">
          {totalCount} {isHappyHours ? 'happy hours' : 'restaurants'} in {BRAND.county}
        </p>

        {/* Visible items */}
        {isHappyHours ? (
          <>
            <div className="space-y-4">
              {visibleHH.map((hh, i) => (
                <HappyHourCard key={hh.id} hh={hh} rank={i + 1} />
              ))}
            </div>
            <AppGateCTA hiddenCount={hiddenCount} contentType="happy hours">
              {blurredHH.length > 0 && (
                <div className="space-y-4">
                  {blurredHH.map((hh, i) => (
                    <HappyHourCard key={hh.id} hh={hh} rank={VISIBLE_COUNT + i + 1} />
                  ))}
                </div>
              )}
            </AppGateCTA>
          </>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleRestaurants.map((r, i) => (
                <RestaurantCard key={r.id} restaurant={r} rank={i + 1} />
              ))}
            </div>
            <AppGateCTA hiddenCount={hiddenCount} contentType="restaurants">
              {blurredRestaurants.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {blurredRestaurants.map((r, i) => (
                    <RestaurantCard key={r.id} restaurant={r} rank={VISIBLE_COUNT + i + 1} />
                  ))}
                </div>
              )}
            </AppGateCTA>
          </>
        )}

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-tastelanc-surface rounded-lg p-6">
                  <h3 className="font-semibold text-tastelanc-text-primary text-lg mb-2">{faq.question}</h3>
                  <p className="text-tastelanc-text-muted">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Pages (Internal Links) */}
        {relatedPages.length > 0 && (
          <section className="mt-12 pt-8 border-t border-tastelanc-surface-light">
            <h2 className="text-lg font-semibold text-tastelanc-text-secondary mb-4">You might also like</h2>
            <div className="flex flex-wrap gap-3">
              {relatedPages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/best/${page.slug}`}
                  className="px-4 py-2 bg-tastelanc-surface hover:bg-tastelanc-surface-light rounded-full text-sm text-tastelanc-text-secondary hover:text-tastelanc-text-primary transition-colors"
                >
                  {page.h1(BRAND).replace(` in ${BRAND.countyShort}, ${BRAND.state}`, '')}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

// ── Card Components ────────────────────────────────────

function RestaurantCard({ restaurant, rank }: { restaurant: Restaurant; rank: number }) {
  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="bg-tastelanc-card rounded-xl overflow-hidden hover:ring-2 hover:ring-tastelanc-accent transition-all"
    >
      {restaurant.cover_image_url && (
        <div className="aspect-video relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={restaurant.cover_image_url}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
            #{rank}
          </div>
        </div>
      )}
      <div className="p-5">
        <h3 className="font-semibold text-tastelanc-text-primary text-lg mb-1">
          {!restaurant.cover_image_url && <span className="text-tastelanc-accent mr-1">#{rank}</span>}
          {restaurant.name}
        </h3>
        <p className="text-tastelanc-text-muted text-sm flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {restaurant.address}, {restaurant.city}
        </p>
        {restaurant.custom_description && (
          <p className="text-tastelanc-text-faint text-sm mt-2 line-clamp-2">{restaurant.custom_description}</p>
        )}
        {restaurant.categories && restaurant.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {restaurant.categories.slice(0, 3).map((cat) => (
              <span key={cat} className="text-xs bg-tastelanc-surface px-2 py-0.5 rounded text-tastelanc-text-muted">
                {cat.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function HappyHourCard({ hh, rank }: { hh: any; rank: number }) {
  return (
    <Link
      href={`/restaurants/${hh.restaurant?.slug}`}
      className="block bg-tastelanc-card rounded-xl p-5 hover:ring-2 hover:ring-lancaster-gold transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="bg-lancaster-gold/20 text-lancaster-gold font-bold text-lg w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-tastelanc-text-primary text-lg">{hh.restaurant?.name}</h3>
          <p className="text-tastelanc-text-muted text-sm flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {hh.restaurant?.address}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-sm text-lancaster-gold font-medium">
              {hh.start_time && hh.end_time
                ? `${formatTimeSimple(hh.start_time)} - ${formatTimeSimple(hh.end_time)}`
                : 'See app for times'}
            </span>
            {hh.name && <span className="text-sm text-tastelanc-text-faint">{hh.name}</span>}
          </div>
          {hh.happy_hour_items && hh.happy_hour_items.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {hh.happy_hour_items.slice(0, 3).map((item: any) => (
                <span key={item.id} className="text-xs text-lancaster-gold bg-lancaster-gold/10 px-2 py-0.5 rounded">
                  {item.name} {item.price ? `$${item.price}` : item.discounted_price ? `$${item.discounted_price}` : ''}
                </span>
              ))}
              {hh.happy_hour_items.length > 3 && (
                <span className="text-xs text-tastelanc-text-faint">+{hh.happy_hour_items.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function formatTimeSimple(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, '0')}${ampm}` : `${hour}${ampm}`;
}
