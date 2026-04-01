import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Search, Clock, Calendar, Sparkles, ChevronRight, Star } from 'lucide-react';
import type { Restaurant } from '@/types/database';
import type { Metadata } from 'next';
import { BRAND, MARKET_SLUG } from '@/config/market';
import { buildMeta } from '@/lib/seo/meta';
import { getCurrentDayOfWeek, capitalizeWords, formatTime } from '@/lib/utils';
import RestaurantCard from '@/components/restaurants/RestaurantCard';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

export const revalidate = 1800;

export async function generateMetadata(): Promise<Metadata> {
  return buildMeta({
    title: `Restaurants in ${BRAND.countyShort}, ${BRAND.state} | ${BRAND.name}`,
    description: `Browse ${BRAND.countyShort}'s best restaurants, bars, and dining spots — with live happy hours, events, and specials. Updated daily.`,
    url: `${siteUrl}/restaurants`,
  });
}

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}

const PAGE_SIZE = 24;

// ── Section definitions — each maps to a /best/* page ────

const DIRECTORY_SECTIONS = [
  { label: 'Happy Hours Today',     category: null,           bestSlug: 'happy-hours',          icon: 'clock',    isHappyHours: true },
  { label: 'Date Night',            category: 'date_night',   bestSlug: 'date-night-restaurants', icon: 'star',   isHappyHours: false },
  { label: 'Bars & Nightlife',      category: 'bars',         bestSlug: 'bars',                 icon: 'sparkles', isHappyHours: false },
  { label: 'Breweries',             category: 'brewery',      bestSlug: 'breweries',            icon: 'sparkles', isHappyHours: false },
  { label: 'Outdoor Dining',        category: 'outdoor_dining', bestSlug: 'outdoor-dining',     icon: 'star',     isHappyHours: false },
  { label: 'Late Night',            category: 'late_night',   bestSlug: 'late-night-food',      icon: 'clock',    isHappyHours: false },
] as const;

const QUICK_LINKS = [
  { label: 'Best Rooftops',    href: '/best/rooftop-restaurants' },
  { label: 'Cocktail Bars',    href: '/best/cocktail-bars' },
  { label: 'Live Music',       href: '/best/live-music' },
  { label: 'Friday HH',        href: '/best/friday-happy-hours' },
  { label: 'Italian',          href: '/best/italian-restaurants' },
  { label: 'Brunch',           href: '/best/brunch-restaurants' },
  { label: 'Pizza',            href: '/best/pizza-restaurants' },
  { label: 'Sushi',            href: '/best/sushi-restaurants' },
];

async function getData(category?: string, query?: string, page = 1) {
  const supabase = await createClient();

  const { data: marketRow } = await supabase
    .from('markets').select('id').eq('slug', MARKET_SLUG).eq('is_active', true).single();
  if (!marketRow) return { restaurants: [], total: 0, featured: [], happyHoursToday: [], upcomingEvents: [], sectionData: {} };

  const marketId = marketRow.id;
  const today = getCurrentDayOfWeek();

  // ── Filtered / search mode ────────────────────────────
  if (category || query) {
    let q = supabase.from('restaurants').select('*', { count: 'exact' })
      .eq('market_id', marketId).eq('is_active', true);
    if (category) q = q.contains('categories', [category]);
    if (query) q = q.ilike('name', `%${query}%`);
    q = q.order('name').range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const { data, count } = await q;
    return { restaurants: (data || []) as Restaurant[], total: count || 0, featured: [], happyHoursToday: [], upcomingEvents: [], sectionData: {} };
  }

  // ── Directory mode — fetch everything in parallel ─────
  const [featuredRes, happyHoursTodayRes, eventsRes, ...sectionResults] = await Promise.all([
    // Featured: verified restaurants with a cover image, ordered by tier (elite first via join)
    supabase.from('restaurants').select('*, tiers(name)')
      .eq('market_id', marketId).eq('is_active', true).eq('is_verified', true)
      .not('cover_image_url', 'is', null)
      .limit(6),

    // Happy hours running today
    supabase.from('happy_hours')
      .select('*, restaurant:restaurants!inner(id, name, slug, address, city, cover_image_url, categories)')
      .eq('restaurant.market_id', marketId)
      .eq('is_active', true)
      .contains('days_of_week', [today])
      .order('start_time')
      .limit(6),

    // Upcoming events (next 7 days or recurring)
    supabase.from('events')
      .select('*, restaurant:restaurants!inner(id, name, slug, address, city, cover_image_url)')
      .eq('restaurant.market_id', marketId)
      .eq('is_active', true)
      .limit(4),

    // Section data: one query per section
    ...DIRECTORY_SECTIONS.filter(s => !s.isHappyHours && s.category).map(s =>
      supabase.from('restaurants').select('*')
        .eq('market_id', marketId).eq('is_active', true)
        .contains('categories', [s.category as string])
        .not('cover_image_url', 'is', null)
        .limit(6)
    ),
  ]);

  // Map section results back by index
  const sectionData: Record<string, Restaurant[]> = {};
  const filteredSections = DIRECTORY_SECTIONS.filter(s => !s.isHappyHours && s.category);
  filteredSections.forEach((s, i) => {
    sectionData[s.category as string] = (sectionResults[i]?.data || []) as Restaurant[];
  });

  // Sort featured: elite > premium > verified
  const featured = ((featuredRes.data || []) as any[]).sort((a, b) => {
    const tierOrder: Record<string, number> = { elite: 0, premium: 1, basic: 2 };
    const aT = tierOrder[a.tiers?.name] ?? 3;
    const bT = tierOrder[b.tiers?.name] ?? 3;
    return aT - bT;
  }) as Restaurant[];

  return {
    restaurants: [] as Restaurant[],
    total: 0,
    featured,
    happyHoursToday: (happyHoursTodayRes.data || []) as any[],
    upcomingEvents: (eventsRes.data || []) as any[],
    sectionData: sectionData as Record<string, Restaurant[]>,
  };
}

export default async function RestaurantsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page || 1);
  const isFiltered = !!(params.category || params.q);
  const today = getCurrentDayOfWeek();

  const { restaurants, total, featured, happyHoursToday, upcomingEvents, sectionData } = await getData(
    params.category, params.q, page
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen">
      {/* ── Hero / Search Bar ──────────────────────────── */}
      <div className="bg-tastelanc-card border-b border-tastelanc-surface-light px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-tastelanc-text-primary mb-1">
            Dining in {BRAND.countyShort}, {BRAND.state}
          </h1>
          <p className="text-tastelanc-text-muted text-sm mb-5">
            Live happy hours, specials, and events — all from real restaurant data
          </p>

          <form className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tastelanc-text-faint" />
            <input
              type="text"
              name="q"
              defaultValue={params.q}
              placeholder={`Search restaurants in ${BRAND.countyShort}...`}
              className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </form>

          {/* Quick-access category pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1 bg-tastelanc-surface hover:bg-tastelanc-surface-light text-tastelanc-text-secondary hover:text-tastelanc-text-primary text-xs rounded-full border border-tastelanc-surface-light transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">

        {/* ── FILTERED / SEARCH RESULTS ──────────────── */}
        {isFiltered && (
          <>
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm text-tastelanc-text-muted">
                    {total} result{total !== 1 ? 's' : ''}
                    {params.category && ` · ${capitalizeWords(params.category.replace(/_/g, ' '))}`}
                    {params.q && ` for "${params.q}"`}
                  </p>
                </div>
                <Link href="/restaurants" className="text-xs text-tastelanc-accent hover:underline">
                  Clear filters
                </Link>
              </div>

              {restaurants.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {restaurants.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
                </div>
              ) : (
                <p className="text-tastelanc-text-faint text-sm py-12 text-center">No restaurants found.</p>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {page > 1 && (
                    <Link
                      href={`/restaurants?${params.category ? `category=${params.category}&` : ''}${params.q ? `q=${params.q}&` : ''}page=${page - 1}`}
                      className="px-4 py-2 text-sm bg-tastelanc-surface rounded-lg text-tastelanc-text-secondary hover:text-tastelanc-text-primary"
                    >
                      ← Previous
                    </Link>
                  )}
                  <span className="px-4 py-2 text-sm text-tastelanc-text-faint">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link
                      href={`/restaurants?${params.category ? `category=${params.category}&` : ''}${params.q ? `q=${params.q}&` : ''}page=${page + 1}`}
                      className="px-4 py-2 text-sm bg-tastelanc-surface rounded-lg text-tastelanc-text-secondary hover:text-tastelanc-text-primary"
                    >
                      Next →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── DIRECTORY MODE ─────────────────────────── */}
        {!isFiltered && (
          <>
            {/* Featured Spotlight */}
            {featured.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-lancaster-gold" />
                  <h2 className="text-base font-bold text-tastelanc-text-primary">Featured in {BRAND.countyShort}</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {featured.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
                </div>
              </section>
            )}

            {/* Happy Hours Today */}
            {happyHoursToday.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-lancaster-gold" />
                    <h2 className="text-base font-bold text-tastelanc-text-primary">
                      Happy Hours — {capitalizeWords(today)}
                    </h2>
                    <span className="text-xs bg-lancaster-gold/20 text-lancaster-gold px-2 py-0.5 rounded-full">
                      {happyHoursToday.length} today
                    </span>
                  </div>
                  <Link href="/best/happy-hours" className="text-xs text-tastelanc-accent hover:underline flex items-center gap-1">
                    See all <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {happyHoursToday.slice(0, 5).map((hh: any) => (
                    <Link
                      key={hh.id}
                      href={`/restaurants/${hh.restaurant?.slug}`}
                      className="flex items-center gap-3 bg-tastelanc-card rounded-xl p-3 hover:ring-1 hover:ring-lancaster-gold transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-tastelanc-surface overflow-hidden flex-shrink-0">
                        {hh.restaurant?.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={hh.restaurant.cover_image_url} alt={hh.restaurant.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-tastelanc-text-faint text-sm font-bold">
                            {hh.restaurant?.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-tastelanc-text-primary truncate">{hh.restaurant?.name}</p>
                        <p className="text-xs text-tastelanc-text-faint">{hh.restaurant?.city}</p>
                      </div>
                      <span className="text-xs text-lancaster-gold font-medium flex-shrink-0">
                        {formatTime(hh.start_time)} – {formatTime(hh.end_time)}
                      </span>
                    </Link>
                  ))}
                </div>
                {happyHoursToday.length > 5 && (
                  <Link
                    href={`/best/${today}-happy-hours`}
                    className="flex items-center justify-center gap-1 mt-3 text-xs text-tastelanc-accent hover:underline"
                  >
                    +{happyHoursToday.length - 5} more happy hours today <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </section>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-tastelanc-accent" />
                    <h2 className="text-base font-bold text-tastelanc-text-primary">Upcoming Events</h2>
                  </div>
                  <Link href="/best/live-music" className="text-xs text-tastelanc-accent hover:underline flex items-center gap-1">
                    See all <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {upcomingEvents.slice(0, 4).map((event: any) => (
                    <Link
                      key={event.id}
                      href={`/restaurants/${event.restaurant?.slug}`}
                      className="flex gap-3 bg-tastelanc-card rounded-xl p-3 hover:ring-1 hover:ring-tastelanc-accent transition-all"
                    >
                      <div className="w-12 h-12 rounded-lg bg-tastelanc-surface overflow-hidden flex-shrink-0">
                        {event.image_url || event.restaurant?.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={event.image_url || event.restaurant?.cover_image_url}
                            alt={event.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-tastelanc-text-faint" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-tastelanc-text-primary truncate">{event.name}</p>
                        <p className="text-xs text-tastelanc-text-muted truncate">{event.restaurant?.name}</p>
                        <p className="text-xs text-tastelanc-accent mt-0.5">{formatTime(event.start_time)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Category Sections */}
            {DIRECTORY_SECTIONS.filter(s => !s.isHappyHours && s.category).map((section) => {
              const items: Restaurant[] = sectionData[section.category as string] || [];
              if (items.length === 0) return null;
              return (
                <section key={section.category}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-tastelanc-accent" />
                      <h2 className="text-base font-bold text-tastelanc-text-primary">{section.label}</h2>
                    </div>
                    <Link
                      href={`/best/${section.bestSlug}`}
                      className="text-xs text-tastelanc-accent hover:underline flex items-center gap-1"
                    >
                      See all <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {items.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
                  </div>
                </section>
              );
            })}

            {/* App CTA — woven between sections */}
            <div className="bg-tastelanc-surface rounded-xl p-6 text-center border border-tastelanc-surface-light">
              <p className="text-sm font-semibold text-tastelanc-text-primary mb-1">
                Full menus, live specials, and real-time deals
              </p>
              <p className="text-xs text-tastelanc-text-muted mb-4">
                Everything on this page comes from restaurant-verified data in the {BRAND.name} app.
                Download for real-time push alerts, personalized picks, and the full picture.
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                {BRAND.appStoreUrls.ios && (
                  <a
                    href={BRAND.appStoreUrls.ios}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-tastelanc-accent text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Download on iOS
                  </a>
                )}
                {BRAND.appStoreUrls.android && (
                  <a
                    href={BRAND.appStoreUrls.android}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-tastelanc-surface-light text-tastelanc-text-primary text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity border border-tastelanc-surface-light"
                  >
                    Get on Android
                  </a>
                )}
              </div>
            </div>

            {/* Browse All link — directory footer */}
            <div className="text-center pb-4">
              <p className="text-xs text-tastelanc-text-faint mb-3">Looking for something specific?</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { label: 'All Happy Hours', href: '/best/happy-hours' },
                  { label: 'Date Night', href: '/best/date-night-restaurants' },
                  { label: 'Late Night Food', href: '/best/late-night-food' },
                  { label: 'Rooftop Bars', href: '/best/rooftop-restaurants' },
                  { label: 'Cocktail Bars', href: '/best/cocktail-bars' },
                  { label: 'Breweries', href: '/best/breweries' },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="px-3 py-1.5 text-xs bg-tastelanc-surface border border-tastelanc-surface-light rounded-full text-tastelanc-text-secondary hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
