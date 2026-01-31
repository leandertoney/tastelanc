import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Phone, Globe, Clock, Calendar, Sparkles, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatTime, getCurrentDayOfWeek, capitalizeWords } from '@/lib/utils';
import type { Metadata } from 'next';
import PageViewTracker from '@/components/PageViewTracker';
import FavoriteButton from '@/components/FavoriteButton';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, description')
    .eq('slug', slug)
    .single();

  if (!restaurant) {
    return { title: 'Restaurant Not Found | TasteLanc' };
  }

  return {
    title: `${restaurant.name} | TasteLanc`,
    description: restaurant.description || `Discover ${restaurant.name} in Lancaster, PA. View menu, hours, happy hours, and upcoming events.`,
  };
}

async function getRestaurant(slug: string) {
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!restaurant) return null;

  // Fetch related data
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

  if (!restaurant) {
    notFound();
  }

  const today = getCurrentDayOfWeek();
  const todayHours = restaurant.hours.find((h: { day_of_week: string }) => h.day_of_week === today);
  const sortedHours = [...restaurant.hours].sort(
    (a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
  );

  return (
    <div>
      {/* Track page view */}
      <PageViewTracker pagePath={`/restaurants/${slug}`} pageType="restaurant" restaurantId={restaurant.id} />

      {/* Cover Image */}
      <div className="relative h-64 md:h-80 bg-tastelanc-surface">
        {restaurant.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.cover_image_url}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-8xl font-bold text-tastelanc-surface-light">
              {restaurant.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-tastelanc-bg to-transparent" />

        {/* Back Button */}
        <Link
          href="/restaurants"
          className="absolute top-4 left-4 flex items-center gap-2 bg-tastelanc-bg/80 backdrop-blur-sm px-3 py-2 rounded-lg text-white hover:bg-tastelanc-bg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Favorite Button */}
        <FavoriteButton
          restaurantId={restaurant.id}
          className="absolute top-4 right-4"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
        {/* Header Info */}
        <div className="bg-tastelanc-card rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white">{restaurant.name}</h1>
                {restaurant.is_verified && <Badge variant="accent">Verified</Badge>}
              </div>

              <p className="text-gray-400 flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4" />
                {restaurant.address}, {restaurant.city}, {restaurant.state}
              </p>

              {restaurant.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {restaurant.categories.map((cat: string) => (
                    <Badge key={cat}>{capitalizeWords(cat.replace('_', ' '))}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {restaurant.phone}
                </a>
              )}
              {restaurant.website && (
                <a
                  href={restaurant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Visit Website
                </a>
              )}
            </div>
          </div>

          {restaurant.description && (
            <p className="text-gray-300 mt-4">{restaurant.description}</p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Happy Hours */}
            {restaurant.happy_hours.length > 0 && (
              <section className="bg-tastelanc-card rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-lancaster-gold" />
                  Happy Hours
                </h2>
                <div className="space-y-4">
                  {restaurant.happy_hours.map((hh: { id: string; name: string; days_of_week: string[]; start_time: string; end_time: string; happy_hour_items?: { id: string; name: string; discounted_price: number }[] }) => (
                    <div key={hh.id} className="border-b border-tastelanc-surface-light pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-white">{hh.name}</h3>
                        <span className="text-lancaster-gold text-sm">
                          {formatTime(hh.start_time)} - {formatTime(hh.end_time)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        {hh.days_of_week.map((d: string) => capitalizeWords(d)).join(', ')}
                      </p>
                      {hh.happy_hour_items && hh.happy_hour_items.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {hh.happy_hour_items.slice(0, 4).map((item: { id: string; name: string; discounted_price: number }) => (
                            <Badge key={item.id} variant="gold">
                              {item.name} ${item.discounted_price}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Specials */}
            {restaurant.specials.length > 0 && (
              <section className="bg-tastelanc-card rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-tastelanc-accent" />
                  Specials
                </h2>
                <div className="space-y-4">
                  {restaurant.specials.map((special: { id: string; name: string; description: string | null; days_of_week: string[]; start_time: string | null; end_time: string | null; special_price: number | null; original_price: number | null; image_url: string | null }) => (
                    <div key={special.id} className="border-b border-tastelanc-surface-light pb-4 last:border-0 last:pb-0">
                      {special.image_url && (
                        <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={special.image_url}
                            alt={special.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-white">{special.name}</h3>
                          {special.description && (
                            <p className="text-sm text-gray-400 mt-1">{special.description}</p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">
                            {special.days_of_week.map((d: string) => capitalizeWords(d)).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          {special.start_time && special.end_time && (
                            <span className="text-tastelanc-accent text-sm">
                              {formatTime(special.start_time)} - {formatTime(special.end_time)}
                            </span>
                          )}
                          {!special.start_time && !special.end_time && (
                            <span className="text-tastelanc-accent text-sm">All Day</span>
                          )}
                          {special.original_price && special.special_price && (
                            <div className="text-sm mt-1">
                              <span className="line-through text-gray-500 mr-1">
                                ${special.original_price.toFixed(2)}
                              </span>
                              <span className="text-green-400 font-semibold">
                                ${special.special_price.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Events */}
            {restaurant.events.length > 0 && (
              <section className="bg-tastelanc-card rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-tastelanc-accent" />
                  Upcoming Events
                </h2>
                <div className="space-y-4">
                  {restaurant.events.map((event: { id: string; name: string; event_type: string; start_time: string; performer_name: string | null; is_recurring: boolean; days_of_week: string[]; event_date: string | null; image_url: string | null }) => (
                    <div key={event.id} className="border-b border-tastelanc-surface-light pb-4 last:border-0 last:pb-0">
                      {event.image_url && (
                        <div className="mb-3 rounded-lg overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={event.image_url}
                            alt={event.name}
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-white">{event.name}</h3>
                          <p className="text-sm text-gray-400">
                            {capitalizeWords(event.event_type.replace('_', ' '))}
                            {event.performer_name && ` • ${event.performer_name}`}
                          </p>
                        </div>
                        <span className="text-tastelanc-accent text-sm">{formatTime(event.start_time)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Menu */}
            {restaurant.menus.length > 0 && (
              <section className="bg-tastelanc-card rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Menu</h2>
                {restaurant.menus.map((menu: { id: string; name: string; menu_sections?: { id: string; name: string; menu_items?: { id: string; name: string; description: string | null; price: number | null }[] }[] }) => (
                  <div key={menu.id} className="mb-6 last:mb-0">
                    <h3 className="text-lg font-semibold text-white mb-4">{menu.name}</h3>
                    {menu.menu_sections?.map((section) => (
                      <div key={section.id} className="mb-4">
                        <h4 className="text-tastelanc-accent font-medium mb-2">{section.name}</h4>
                        <div className="space-y-2">
                          {section.menu_items?.map((item) => (
                            <div key={item.id} className="flex justify-between">
                              <div>
                                <span className="text-white">{item.name}</span>
                                {item.description && (
                                  <p className="text-sm text-gray-500">{item.description}</p>
                                )}
                              </div>
                              {item.price && (
                                <span className="text-gray-400">${item.price.toFixed(2)}</span>
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
          <div className="space-y-6">
            {/* Hours */}
            <div className="bg-tastelanc-card rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Hours
              </h2>
              {todayHours && !todayHours.is_closed && (
                <p className="text-sm text-green-400 mb-4">
                  Open today: {formatTime(todayHours.open_time)} - {formatTime(todayHours.close_time)}
                </p>
              )}
              <div className="space-y-2">
                {sortedHours.map((hours: { id: string; day_of_week: string; is_closed: boolean; open_time: string | null; close_time: string | null }) => (
                  <div
                    key={hours.id}
                    className={`flex justify-between text-sm ${
                      hours.day_of_week === today ? 'text-white font-medium' : 'text-gray-400'
                    }`}
                  >
                    <span>{capitalizeWords(hours.day_of_week)}</span>
                    <span>
                      {hours.is_closed
                        ? 'Closed'
                        : `${formatTime(hours.open_time)} - ${formatTime(hours.close_time)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Map Placeholder */}
            {restaurant.latitude && restaurant.longitude && (
              <div className="bg-tastelanc-card rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Location</h2>
                <div className="aspect-square bg-tastelanc-surface rounded-lg flex items-center justify-center">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tastelanc-accent hover:underline"
                  >
                    View on Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="py-12" />
    </div>
  );
}
