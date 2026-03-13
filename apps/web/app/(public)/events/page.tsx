import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Calendar, MapPin, Music, HelpCircle, Mic2, Disc3, Laugh, Trophy, Grid3x3, Music2, Spade } from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatTime, capitalizeWords } from '@/lib/utils';
import type { Metadata } from 'next';
import type { EventType } from '@/types/database';
import { BRAND, MARKET_SLUG } from '@/config/market';
import { buildMeta } from '@/lib/seo/meta';
import { AppGateCTA } from '@/components/seo/AppGateCTA';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

export async function generateMetadata(): Promise<Metadata> {
  return buildMeta({
    title: `Events in ${BRAND.countyShort}, ${BRAND.state} | ${BRAND.name}`,
    description: `Discover live music, trivia nights, karaoke, and more events at ${BRAND.countyShort}, ${BRAND.state} restaurants and bars.`,
    url: `${siteUrl}/events`,
  });
}

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

const EVENT_ICONS: Record<EventType, React.JSX.Element> = {
  live_music: <Music className="w-4 h-4" />,
  trivia: <HelpCircle className="w-4 h-4" />,
  karaoke: <Mic2 className="w-4 h-4" />,
  dj: <Disc3 className="w-4 h-4" />,
  comedy: <Laugh className="w-4 h-4" />,
  sports: <Trophy className="w-4 h-4" />,
  bingo: <Grid3x3 className="w-4 h-4" />,
  music_bingo: <Music2 className="w-4 h-4" />,
  poker: <Spade className="w-4 h-4" />,
  other: <Calendar className="w-4 h-4" />,
};

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'live_music', label: 'Live Music' },
  { value: 'trivia', label: 'Trivia' },
  { value: 'karaoke', label: 'Karaoke' },
  { value: 'dj', label: 'DJ' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'sports', label: 'Sports' },
  { value: 'bingo', label: 'Bingo' },
  { value: 'music_bingo', label: 'Music Bingo' },
  { value: 'poker', label: 'Poker' },
];

async function getEvents(type?: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // Resolve market
  const { data: marketRow } = await supabase
    .from('markets').select('id').eq('slug', MARKET_SLUG).eq('is_active', true).single();
  if (!marketRow) throw new Error(`Market "${MARKET_SLUG}" not found`);

  let query = supabase
    .from('events')
    .select('*, restaurant:restaurants!inner(*)')
    .eq('restaurant.market_id', marketRow.id)
    .eq('is_active', true)
    .or(`event_date.gte.${today},is_recurring.eq.true`)
    .order('event_date', { ascending: true, nullsFirst: false })
    .order('start_time', { ascending: true });

  if (type) {
    query = query.eq('event_type', type);
  }

  const { data } = await query;
  return data || [];
}

function getEventIcon(type: string): React.JSX.Element {
  const eventType = type as EventType;
  return EVENT_ICONS[eventType] || EVENT_ICONS.other;
}

export default async function EventsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const events = await getEvents(params.type);

  const VISIBLE_COUNT = 6;
  const visible = events.slice(0, VISIBLE_COUNT);
  const blurredPreview = events.slice(VISIBLE_COUNT, VISIBLE_COUNT + 3);
  const hiddenCount = Math.max(0, events.length - VISIBLE_COUNT);

  function renderCard(event: (typeof events)[number]) {
    return (
      <Link
        key={event.id}
        href={`/restaurants/${event.restaurant?.slug}`}
        className="bg-tastelanc-card rounded-xl overflow-hidden hover:ring-2 hover:ring-tastelanc-accent transition-all"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.image_url || `/images/events/${event.event_type}.png`}
          alt={event.name}
          className="w-full h-40 object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <Badge variant="accent" className="flex items-center gap-1">
              {getEventIcon(String(event.event_type))}
              {capitalizeWords(String(event.event_type).replace('_', ' '))}
            </Badge>
            <span className="text-tastelanc-accent text-sm font-medium">
              {formatTime(event.start_time)}
            </span>
          </div>

          <h3 className="font-semibold text-white text-lg mb-1">{event.name}</h3>

          <p className="text-gray-400 text-sm flex items-center gap-1 mb-2">
            <MapPin className="w-3 h-3" />
            {event.restaurant?.name}
          </p>

          {event.performer_name && (
            <p className="text-sm text-gray-300 mb-2">
              Featuring: {event.performer_name}
            </p>
          )}

          {event.description && (
            <p className="text-gray-500 text-sm line-clamp-2">{event.description}</p>
          )}

          <div className="mt-3 pt-3 border-t border-tastelanc-surface-light">
            {event.is_recurring ? (
              <p className="text-sm text-gray-400">
                Every {event.days_of_week.map((d: string) => capitalizeWords(d)).join(', ')}
              </p>
            ) : event.event_date ? (
              <p className="text-sm text-gray-400">
                {new Date(event.event_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            ) : null}

            {event.cover_charge && (
              <p className="text-sm text-lancaster-gold mt-1">
                Cover: ${event.cover_charge}
              </p>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Calendar className="w-10 h-10 text-tastelanc-accent" />
            Events
          </h1>
          <p className="text-gray-400">
            Discover live entertainment in {BRAND.countyShort}
          </p>
        </div>

        {/* Type Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <a
            href="/events"
            className={`px-4 py-2 rounded-full text-sm transition-colors flex items-center gap-2 ${
              !params.type
                ? 'bg-tastelanc-accent text-white'
                : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white'
            }`}
          >
            All Events
          </a>
          {EVENT_TYPES.map((type) => (
            <a
              key={type.value}
              href={`/events?type=${type.value}`}
              className={`px-4 py-2 rounded-full text-sm transition-colors flex items-center gap-2 ${
                params.type === type.value
                  ? 'bg-tastelanc-accent text-white'
                  : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white'
              }`}
            >
              {EVENT_ICONS[type.value]}
              {type.label}
            </a>
          ))}
        </div>

        {/* Results */}
        <p className="text-gray-400 mb-6">
          {events.length} event{events.length !== 1 ? 's' : ''} found
          {params.type && ` in ${capitalizeWords(params.type.replace('_', ' '))}`}
        </p>

        {visible.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((event) => renderCard(event))}
            </div>

            {/* Content Gate */}
            <AppGateCTA hiddenCount={hiddenCount} contentType="events">
              {blurredPreview.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {blurredPreview.map((event) => renderCard(event))}
                </div>
              )}
            </AppGateCTA>
          </>
        ) : (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No events found</p>
            <p className="text-gray-600 mt-2">Try checking a different category</p>
          </div>
        )}
      </div>
    </div>
  );
}
