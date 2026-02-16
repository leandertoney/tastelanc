'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Phone, Globe, Clock, Calendar, Sparkles, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatTime, getCurrentDayOfWeek, capitalizeWords } from '@/lib/utils';
import { ROSIE_STORAGE_KEYS } from '@/lib/rosie/types';
import { useRosieChat } from '@/lib/contexts/RosieChatContext';
import { useMarket } from '@/contexts/MarketContext';
import { BRAND } from '@/config/market';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  categories: string[];
  cover_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  hours: Array<{
    id: string;
    day_of_week: string;
    is_closed: boolean;
    open_time: string | null;
    close_time: string | null;
  }>;
  happy_hours: Array<{
    id: string;
    name: string;
    days_of_week: string[];
    start_time: string;
    end_time: string;
    happy_hour_items?: Array<{
      id: string;
      name: string;
      discounted_price: number;
    }>;
  }>;
  specials: Array<{
    id: string;
    name: string;
    description: string | null;
    days_of_week: string[];
    special_price: number | null;
  }>;
  events: Array<{
    id: string;
    name: string;
    event_type: string;
    start_time: string;
    performer_name: string | null;
  }>;
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function DiscoverRestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const { openChat } = useRosieChat();
  const { marketId } = useMarket();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  // Check Rosie access token
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem(ROSIE_STORAGE_KEYS.rosieAccessToken);
    if (token && token.startsWith('rosie-')) {
      // Token is valid - extract timestamp and check if within 24 hours
      const parts = token.split('-');
      if (parts.length >= 2) {
        const timestamp = parseInt(parts[1]);
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (now - timestamp < twentyFourHours) {
          setHasAccess(true);
        } else {
          // Token expired, remove it
          localStorage.removeItem(ROSIE_STORAGE_KEYS.rosieAccessToken);
          setHasAccess(false);
        }
      }
    }
    setLoading(false);
  }, []);

  // Fetch restaurant data
  useEffect(() => {
    if (!hasAccess || !slug || !marketId) return;

    async function fetchRestaurant() {
      const supabase = createClient();

      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('market_id', marketId)
        .eq('is_active', true)
        .single();

      if (!restaurantData) {
        router.push('/');
        return;
      }

      // Fetch related data
      const [hoursRes, happyHoursRes, specialsRes, eventsRes] = await Promise.all([
        supabase.from('restaurant_hours').select('*').eq('restaurant_id', restaurantData.id),
        supabase
          .from('happy_hours')
          .select('*, happy_hour_items(*)')
          .eq('restaurant_id', restaurantData.id)
          .eq('is_active', true),
        supabase
          .from('specials')
          .select('*')
          .eq('restaurant_id', restaurantData.id)
          .eq('is_active', true),
        supabase
          .from('events')
          .select('*')
          .eq('restaurant_id', restaurantData.id)
          .eq('is_active', true),
      ]);

      setRestaurant({
        ...restaurantData,
        hours: hoursRes.data || [],
        happy_hours: happyHoursRes.data || [],
        specials: specialsRes.data || [],
        events: eventsRes.data || [],
      });
    }

    fetchRestaurant();
  }, [hasAccess, slug, marketId, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tastelanc-accent"></div>
      </div>
    );
  }

  // No access - show prompt to chat with Rosie
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-tastelanc-card rounded-xl p-8 max-w-md text-center">
          <Image
            src="/images/rosie_dark_new.png"
            alt={BRAND.aiName}
            width={80}
            height={80}
            className="mx-auto mb-6 rounded-full animate-rosie"
          />
          <h1 className="text-2xl font-bold text-white mb-4">
            This page is exclusive to {BRAND.aiName}!
          </h1>
          <p className="text-gray-400 mb-6">
            Chat with {BRAND.aiName} to discover {BRAND.countyShort}&apos;s best restaurants, bars, and nightlife. She&apos;ll
            personally recommend spots and give you access to their details!
          </p>
          <button
            onClick={() => {
              router.push('/');
              // Small delay to allow navigation, then open chat
              setTimeout(() => openChat(), 100);
            }}
            className="bg-tastelanc-accent text-white px-6 py-3 rounded-lg font-medium hover:bg-tastelanc-accent/90 transition-colors"
          >
            Chat with {BRAND.aiName}
          </button>
        </div>
      </div>
    );
  }

  // Still loading restaurant data
  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tastelanc-accent"></div>
      </div>
    );
  }

  const today = getCurrentDayOfWeek();
  const todayHours = restaurant.hours.find((h) => h.day_of_week === today);
  const sortedHours = [...restaurant.hours].sort(
    (a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
  );

  return (
    <div>
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
          href="/"
          className="absolute top-4 left-4 flex items-center gap-2 bg-tastelanc-bg/80 backdrop-blur-sm px-3 py-2 rounded-lg text-white hover:bg-tastelanc-bg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {BRAND.aiName}
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
        {/* Header Info */}
        <div className="bg-tastelanc-card rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white">{restaurant.name}</h1>
                <Badge variant="accent" className="flex items-center gap-1">
                  <Image
                    src="/images/rosie_dark_new.png"
                    alt=""
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                  {BRAND.aiName} Pick
                </Badge>
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
                  {restaurant.happy_hours.map((hh) => (
                    <div
                      key={hh.id}
                      className="border-b border-tastelanc-surface-light pb-4 last:border-0 last:pb-0"
                    >
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
                          {hh.happy_hour_items.slice(0, 4).map((item) => (
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
                  {restaurant.specials.map((special) => (
                    <div
                      key={special.id}
                      className="border-b border-tastelanc-surface-light pb-4 last:border-0 last:pb-0"
                    >
                      <h3 className="font-medium text-white">{special.name}</h3>
                      {special.description && (
                        <p className="text-sm text-gray-400 mt-1">{special.description}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        {special.days_of_week.map((d: string) => capitalizeWords(d)).join(', ')}
                      </p>
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
                  {restaurant.events.map((event) => (
                    <div
                      key={event.id}
                      className="border-b border-tastelanc-surface-light pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-white">{event.name}</h3>
                          <p className="text-sm text-gray-400">
                            {capitalizeWords(event.event_type.replace('_', ' '))}
                            {event.performer_name && ` • ${event.performer_name}`}
                          </p>
                        </div>
                        <span className="text-tastelanc-accent text-sm">
                          {formatTime(event.start_time)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Hours */}
            {sortedHours.length > 0 && (
              <div className="bg-tastelanc-card rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Hours
                </h2>
                {todayHours && !todayHours.is_closed && (
                  <p className="text-sm text-green-400 mb-4">
                    Open today: {formatTime(todayHours.open_time)} -{' '}
                    {formatTime(todayHours.close_time)}
                  </p>
                )}
                <div className="space-y-2">
                  {sortedHours.map((hours) => (
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
            )}

            {/* Map */}
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

            {/* Ask Rosie for more */}
            <div className="bg-tastelanc-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/images/rosie_dark_new.png"
                  alt={BRAND.aiName}
                  width={40}
                  height={40}
                  className="rounded-full animate-rosie"
                />
                <h2 className="text-lg font-bold text-white">Need more suggestions?</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Ask {BRAND.aiName} for more recommendations based on your preferences!
              </p>
              <button
                onClick={() => {
                  router.push('/');
                  setTimeout(() => openChat(), 100);
                }}
                className="w-full bg-tastelanc-accent text-white py-2 rounded-lg font-medium hover:bg-tastelanc-accent/90 transition-colors"
              >
                Chat with {BRAND.aiName}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-12" />
    </div>
  );
}
