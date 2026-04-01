import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Phone, Globe, Clock, Calendar, Sparkles, ChevronLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatTime, getCurrentDayOfWeek, capitalizeWords } from '@/lib/utils';
import type { Metadata } from 'next';
import PageViewTracker from '@/components/PageViewTracker';
import FavoriteButton from '@/components/FavoriteButton';
import { MARKET_SLUG, BRAND } from '@/config/market';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: marketRow } = await supabase
    .from('markets').select('id').eq('slug', MARKET_SLUG).eq('is_active', true).single();
  let metaQuery = supabase
    .from('restaurants')
    .select('name, description, custom_description')
    .eq('slug', slug);
  if (marketRow) metaQuery = metaQuery.eq('market_id', marketRow.id);
  const { data: restaurant } = await metaQuery.single();

  if (!restaurant) {
    return { title: `Restaurant Not Found | ${BRAND.name}` };
  }

  return {
    title: `${restaurant.name} | ${BRAND.name}`,
    description: restaurant.custom_description || restaurant.description || `Discover ${restaurant.name} in ${BRAND.countyShort}, ${BRAND.state}. View menu, hours, happy hours, and upcoming events.`,
  };
}

async function getRestaurant(slug: string) {
  const supabase = await createClient();

  const { data: marketRow } = await supabase
    .from('markets').select('id').eq('slug', MARKET_SLUG).eq('is_active', true).single();
  if (!marketRow) throw new Error(`Market "${MARKET_SLUG}" not found`);

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('market_id', marketRow.id)
    .eq('is_active', true)
    .single();

  if (!restaurant) return null;

  const [hoursRes, happyHoursRes, specialsRes, eventsRes, menusRes] = await Promise.all([
    supabase.from('restaurant_hours').select('*').eq('restaurant_id', restaurant.id),
    supabase.from('happy_hours').select('*, happy_hour_items(*)').eq('restaurant_id', restaurant.id).eq('is_active', true),
    supabase.from('specials').select('*').eq('restaurant_id', restaurant.id).eq('is_active', true),
    supabase.from('events').select('*').eq('restaurant_id', restaurant.id).eq('is_active', true),
    supabase.from('menus').select('*, menu_sections(*, menu_items(*))').eq('restaurant_id', restaurant.id).eq('is_active', true),
  ]);

  return {
    ...restaurant,
    hours: hoursRes.data || [],
    happy_hours: happyHoursRes.data || [],
    specials: specialsRes.data || [],
    events: eventsRes.data || [],
    menus: menusRes.data || [],
  };
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default async function RestaurantDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);

  if (!restaurant) notFound();

  const today = getCurrentDayOfWeek();
  const todayHours = restaurant.hours.find((h: { day_of_week: string; is_closed: boolean; open_time: string | null; close_time: string | null }) => h.day_of_week === today);
  const sortedHours = [...restaurant.hours].sort(
    (a: { day_of_week: string }, b: { day_of_week: string }) =>
      DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
  );

  const mapsUrl = restaurant.latitude && restaurant.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address} ${restaurant.city}`)}`;

  const embedUrl = restaurant.latitude && restaurant.longitude
    ? `https://maps.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}&z=15&output=embed`
    : null;

  return (
    <div>
      <PageViewTracker pagePath={`/restaurants/${slug}`} pageType="restaurant" restaurantId={restaurant.id} />

      {/* Cover Image */}
      <div className="relative h-56 md:h-72 bg-tastelanc-surface">
        {restaurant.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.cover_image_url}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-tastelanc-surface">
            <span className="text-8xl font-bold text-tastelanc-surface-light">
              {restaurant.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-tastelanc-bg via-transparent to-transparent" />

        <Link
          href="/restaurants"
          className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-sm hover:bg-black/80 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>

        <FavoriteButton restaurantId={restaurant.id} className="absolute top-4 right-4" />
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-10 relative z-10 pb-16">
        {/* Header Card */}
        <div className="bg-tastelanc-card rounded-xl p-5 mb-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary truncate">{restaurant.name}</h1>
                {restaurant.is_verified && <Badge variant="accent">Verified</Badge>}
              </div>

              <p className="text-tastelanc-text-muted text-sm flex items-center gap-1.5 mb-3">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {restaurant.address}, {restaurant.city}, {restaurant.state}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {restaurant.categories.slice(0, 4).map((cat: string) => (
                  <Badge key={cat}>{capitalizeWords(cat.replace(/_/g, ' '))}</Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-row sm:flex-col gap-3 sm:gap-2 text-sm flex-shrink-0">
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="flex items-center gap-1.5 text-tastelanc-text-secondary hover:text-tastelanc-text-primary transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {restaurant.phone}
                </a>
              )}
              {restaurant.website && (
                <a
                  href={restaurant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-tastelanc-text-secondary hover:text-tastelanc-text-primary transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Website
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {(restaurant.custom_description || restaurant.description) && (
            <p className="text-tastelanc-text-secondary text-sm mt-4 leading-relaxed border-t border-tastelanc-surface-light pt-4">
              {restaurant.custom_description || restaurant.description}
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Happy Hours */}
            {restaurant.happy_hours.length > 0 && (
              <section className="bg-tastelanc-card rounded-xl p-5">
                <h2 className="text-base font-bold text-tastelanc-text-primary mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-lancaster-gold" />
                  Happy Hours
                </h2>
                <div className="space-y-4">
                  {restaurant.happy_hours.map((hh: {
                    id: string;
                    name: string;
                    days_of_week: string[];
                    start_time: string;
                    end_time: string;
                    happy_hour_items?: { id: string; name: string; discounted_price: number }[];
                  }) => (
                    <div key={hh.id} className="border-b border-tastelanc-surface-light pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm text-tastelanc-text-primary">{hh.name}</span>
                        <span className="text-lancaster-gold text-sm font-medium">
                          {formatTime(hh.start_time)} – {formatTime(hh.end_time)}
                        </span>
                      </div>
                      <p className="text-xs text-tastelanc-text-faint mb-2">
                        {hh.days_of_week.map((d: string) => capitalizeWords(d)).join(' · ')}
                      </p>
                      {hh.happy_hour_items && hh.happy_hour_items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {hh.happy_hour_items.slice(0, 4).map((item) => (
                            <Badge key={item.id} variant="gold">
                              {item.name}{item.discounted_price ? ` $${item.discounted_price}` : ''}
                            </Badge>
                          ))}
                          {hh.happy_hour_items.length > 4 && (
                            <span className="text-xs text-tastelanc-text-faint self-center">+{hh.happy_hour_items.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Specials */}
            {restaurant.specials.length > 0 && (
              <section className="bg-tastelanc-card rounded-xl p-5">
                <h2 className="text-base font-bold text-tastelanc-text-primary mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-tastelanc-accent" />
                  Specials
                </h2>
                <div className="space-y-3">
                  {restaurant.specials.slice(0, 6).map((special: {
                    id: string;
                    name: string;
                    description: string | null;
                    days_of_week: string[];
                    start_time: string | null;
                    end_time: string | null;
                    special_price: number | null;
                    original_price: number | null;
                    image_url: string | null;
                  }) => (
                    <div key={special.id} className="flex gap-3 border-b border-tastelanc-surface-light pb-3 last:border-0 last:pb-0">
                      {special.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={special.image_url}
                          alt={special.name}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-medium text-sm text-tastelanc-text-primary">{special.name}</h3>
                          <div className="text-right flex-shrink-0">
                            {special.original_price && special.special_price ? (
                              <div className="text-xs">
                                <span className="line-through text-tastelanc-text-faint mr-1">${special.original_price.toFixed(2)}</span>
                                <span className="text-green-400 font-semibold">${special.special_price.toFixed(2)}</span>
                              </div>
                            ) : special.special_price ? (
                              <span className="text-green-400 text-xs font-semibold">${special.special_price.toFixed(2)}</span>
                            ) : null}
                            <p className="text-xs text-tastelanc-accent mt-0.5">
                              {special.start_time && special.end_time
                                ? `${formatTime(special.start_time)} – ${formatTime(special.end_time)}`
                                : 'All Day'}
                            </p>
                          </div>
                        </div>
                        {special.description && (
                          <p className="text-xs text-tastelanc-text-muted mt-0.5 line-clamp-2">{special.description}</p>
                        )}
                        {special.days_of_week.length > 0 && (
                          <p className="text-xs text-tastelanc-text-faint mt-1">
                            {special.days_of_week.map((d: string) => capitalizeWords(d)).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {restaurant.specials.length > 6 && (
                    <p className="text-xs text-tastelanc-text-faint text-center pt-1">
                      +{restaurant.specials.length - 6} more specials in the app
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Events */}
            {restaurant.events.length > 0 && (
              <section className="bg-tastelanc-card rounded-xl p-5">
                <h2 className="text-base font-bold text-tastelanc-text-primary mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-tastelanc-accent" />
                  Upcoming Events
                </h2>
                <div className="space-y-3">
                  {restaurant.events.slice(0, 4).map((event: {
                    id: string;
                    name: string;
                    event_type: string;
                    start_time: string;
                    performer_name: string | null;
                    is_recurring: boolean;
                    days_of_week: string[];
                    event_date: string | null;
                    image_url: string | null;
                  }) => (
                    <div key={event.id} className="flex gap-3 border-b border-tastelanc-surface-light pb-3 last:border-0 last:pb-0">
                      {event.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={event.image_url}
                          alt={event.name}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-medium text-sm text-tastelanc-text-primary">{event.name}</h3>
                          <span className="text-tastelanc-accent text-xs flex-shrink-0">{formatTime(event.start_time)}</span>
                        </div>
                        <p className="text-xs text-tastelanc-text-muted mt-0.5">
                          {capitalizeWords(event.event_type.replace(/_/g, ' '))}
                          {event.performer_name && ` · ${event.performer_name}`}
                        </p>
                        {event.is_recurring && event.days_of_week.length > 0 && (
                          <p className="text-xs text-tastelanc-text-faint mt-0.5">
                            Every {event.days_of_week.map((d: string) => capitalizeWords(d)).join(', ')}
                          </p>
                        )}
                        {event.event_date && (
                          <p className="text-xs text-tastelanc-text-faint mt-0.5">
                            {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {restaurant.events.length > 4 && (
                    <p className="text-xs text-tastelanc-text-faint text-center pt-1">
                      +{restaurant.events.length - 4} more events in the app
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Menu */}
            {restaurant.menus.length > 0 && (
              <section className="bg-tastelanc-card rounded-xl p-5">
                <h2 className="text-base font-bold text-tastelanc-text-primary mb-4">Menu</h2>
                {restaurant.menus.map((menu: {
                  id: string;
                  name: string;
                  menu_sections?: {
                    id: string;
                    name: string;
                    menu_items?: { id: string; name: string; description: string | null; price: number | null }[];
                  }[];
                }) => (
                  <div key={menu.id} className="mb-5 last:mb-0">
                    <h3 className="text-sm font-semibold text-tastelanc-text-secondary mb-3">{menu.name}</h3>
                    {menu.menu_sections?.map((section) => (
                      <div key={section.id} className="mb-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-tastelanc-accent mb-2">{section.name}</h4>
                        <div className="space-y-2">
                          {section.menu_items?.map((item) => (
                            <div key={item.id} className="flex justify-between gap-4">
                              <div className="min-w-0">
                                <span className="text-sm text-tastelanc-text-primary">{item.name}</span>
                                {item.description && (
                                  <p className="text-xs text-tastelanc-text-faint mt-0.5 line-clamp-1">{item.description}</p>
                                )}
                              </div>
                              {item.price && (
                                <span className="text-sm text-tastelanc-text-muted flex-shrink-0">${item.price.toFixed(2)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            {/* Hours */}
            <div className="bg-tastelanc-card rounded-xl p-5">
              <h2 className="text-sm font-bold text-tastelanc-text-primary mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Hours
              </h2>
              <div className="space-y-1.5">
                {sortedHours.map((hours: {
                  id: string;
                  day_of_week: string;
                  is_closed: boolean;
                  open_time: string | null;
                  close_time: string | null;
                }) => {
                  const isToday = hours.day_of_week === today;
                  return (
                    <div
                      key={hours.id}
                      className={`flex justify-between text-xs rounded px-2 py-1 ${
                        isToday
                          ? 'bg-tastelanc-surface text-tastelanc-text-primary font-semibold'
                          : 'text-tastelanc-text-muted'
                      }`}
                    >
                      <span>{capitalizeWords(hours.day_of_week)}</span>
                      <span>
                        {hours.is_closed
                          ? 'Closed'
                          : hours.open_time && hours.close_time
                          ? `${formatTime(hours.open_time)} – ${formatTime(hours.close_time)}`
                          : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
              {todayHours && !todayHours.is_closed && (
                <p className="text-xs text-green-400 mt-3 font-medium">
                  Open today · {formatTime(todayHours.open_time)} – {formatTime(todayHours.close_time)}
                </p>
              )}
              {todayHours?.is_closed && (
                <p className="text-xs text-tastelanc-text-faint mt-3">Closed today</p>
              )}
            </div>

            {/* Location */}
            <div className="bg-tastelanc-card rounded-xl overflow-hidden">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${restaurant.name}`}
                />
              ) : (
                <div className="h-40 bg-tastelanc-surface flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-tastelanc-text-faint" />
                </div>
              )}
              <div className="p-4">
                <p className="text-xs text-tastelanc-text-secondary mb-2">
                  {restaurant.address}, {restaurant.city}, {restaurant.state}
                </p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-tastelanc-accent hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Get directions
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
