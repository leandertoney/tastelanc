import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { MapPin, Database, RefreshCw } from 'lucide-react';
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

  // Merge base faqs + extra faqs for JSON-LD (so schema includes all questions)
  const allFaqItems = [
    ...config.faqs,
    ...(config.extraFaqs ?? []),
  ].map((f) => ({ question: f.q(BRAND), answer: f.a(BRAND) }));
  const faqLd = faqJsonLd(allFaqItems);

  // Base faqs (shown in the original section, unchanged)
  const baseFaqs = config.faqs.map((f) => ({ question: f.q(BRAND), answer: f.a(BRAND) }));

  // Extra faqs (shown in the editorial expanded section)
  const extraFaqs = (config.extraFaqs ?? []).map((f) => ({ question: f.q(BRAND), answer: f.a(BRAND) }));

  // Editorial editorial content
  const editorialIntro = config.editorialIntro?.(BRAND);
  const subcategories = config.subcategories ?? [];

  // Related pages
  const relatedPages = config.relatedSlugs
    .map((s) => getLandingPage(s))
    .filter(Boolean) as LandingPageConfig[];

  // Last-updated: use current revalidation window as the signal
  const lastUpdated = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <main className="max-w-5xl mx-auto px-4 py-10 text-tastelanc-text-primary">
        {/* H1 with target keyword */}
        <h1 className="text-4xl font-bold mb-3">{config.h1(BRAND)}</h1>
        <p className="text-tastelanc-text-muted text-lg mb-6 max-w-3xl">{config.intro(BRAND)}</p>

        {/* A. Editorial Intro — long-form paragraph with location + category keywords */}
        {editorialIntro && (
          <p className="text-tastelanc-text-secondary leading-relaxed mb-8 max-w-3xl text-base border-l-2 border-tastelanc-surface-light pl-4">
            {editorialIntro}
          </p>
        )}

        {/* D. Data Credibility Strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-tastelanc-text-faint mb-8 py-3 border-y border-tastelanc-surface-light">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            {totalCount} {isHappyHours ? 'happy hours' : 'restaurants'} in {BRAND.county}
          </span>
          <span className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Updated {lastUpdated} · based on real restaurant data
          </span>
        </div>

        {/* Visible items (UNCHANGED) */}
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

        {/* B. Subcategory Sections — H2 keyword variations with subset listings */}
        {subcategories.length > 0 && (
          <div className="mt-16 space-y-12">
            {subcategories.map((sub, i) => {
              // Subset the data: for restaurant pages, show up to 3 cards filtered by subcategory
              // if a filterCategory is specified, otherwise show first 3 from the main pool
              const subRestaurants = isHappyHours
                ? []
                : sub.filterCategory
                  ? restaurants.filter((r) => r.categories?.includes(sub.filterCategory!)).slice(0, 3)
                  : restaurants.slice(i * 2, i * 2 + 3);
              const subHH = isHappyHours ? happyHours.slice(i * 2, i * 2 + 3) : [];

              return (
                <section key={i} aria-labelledby={`subcategory-${i}`}>
                  <h2 id={`subcategory-${i}`} className="text-2xl font-bold mb-2">
                    {sub.heading(BRAND)}
                  </h2>
                  <p className="text-tastelanc-text-muted text-sm mb-5 max-w-2xl">{sub.body(BRAND)}</p>
                  {isHappyHours && subHH.length > 0 && (
                    <div className="space-y-4">
                      {subHH.map((hh, j) => (
                        <HappyHourCard key={hh.id} hh={hh} rank={j + 1} />
                      ))}
                    </div>
                  )}
                  {!isHappyHours && subRestaurants.length > 0 && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {subRestaurants.map((r, j) => (
                        <RestaurantCard key={r.id} restaurant={r} rank={j + 1} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* C. Internal Linking Block */}
        <section className="mt-16 bg-tastelanc-surface rounded-xl p-6" aria-labelledby="explore-more-heading">
          <h2 id="explore-more-heading" className="text-lg font-semibold text-tastelanc-text-primary mb-4">
            Explore More in {BRAND.countyShort}
          </h2>
          <div className="flex flex-wrap gap-3">
            {relatedPages.map((page) => (
              <Link
                key={page.slug}
                href={`/best/${page.slug}`}
                className="px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-card rounded-full text-sm text-tastelanc-text-secondary hover:text-tastelanc-text-primary transition-colors border border-tastelanc-surface-light hover:border-tastelanc-text-faint"
              >
                {page.h1(BRAND).replace(` in ${BRAND.countyShort}, ${BRAND.state}`, '')}
              </Link>
            ))}
            {/* Always include the hub links for breadth */}
            <Link
              href="/best/happy-hours"
              className="px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-card rounded-full text-sm text-tastelanc-text-secondary hover:text-tastelanc-text-primary transition-colors border border-tastelanc-surface-light hover:border-tastelanc-text-faint"
            >
              All Happy Hours
            </Link>
            <Link
              href="/restaurants"
              className="px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-card rounded-full text-sm text-tastelanc-text-secondary hover:text-tastelanc-text-primary transition-colors border border-tastelanc-surface-light hover:border-tastelanc-text-faint"
            >
              Browse All Restaurants
            </Link>
          </div>
        </section>

        {/* Original FAQ Section (UNCHANGED — base faqs only) */}
        {baseFaqs.length > 0 && (
          <section className="mt-16" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {baseFaqs.map((faq, i) => (
                <div key={i} className="bg-tastelanc-surface rounded-lg p-6">
                  <h3 className="font-semibold text-tastelanc-text-primary text-lg mb-2">{faq.question}</h3>
                  <p className="text-tastelanc-text-muted">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* E. Expanded FAQ Section — extra keyword-targeted questions */}
        {extraFaqs.length > 0 && (
          <section className="mt-8" aria-labelledby="faq-more-heading">
            <h2 id="faq-more-heading" className="text-xl font-semibold text-tastelanc-text-secondary mb-5">
              More Questions About {config.h1(BRAND).replace(` in ${BRAND.countyShort}, ${BRAND.state}`, '')} in {BRAND.countyShort}
            </h2>
            <div className="space-y-4">
              {extraFaqs.map((faq, i) => (
                <details
                  key={i}
                  className="bg-tastelanc-surface rounded-lg group"
                >
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-medium text-tastelanc-text-primary list-none select-none">
                    {faq.question}
                    <span className="text-tastelanc-text-faint text-lg leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="px-6 pb-5 text-tastelanc-text-muted text-sm">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Original Related Pages (UNCHANGED) */}
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
