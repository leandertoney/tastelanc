import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui';
import {
  Music,
  Calendar,
  Instagram,
  Globe,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

interface SelfPromoter {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  genre: string | null;
  profile_image_url: string | null;
  website: string | null;
  instagram: string | null;
  is_active: boolean;
}

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_type: string;
  event_date: string | null;
  start_time: string;
  end_time: string | null;
  cover_charge: number | null;
  image_url: string | null;
  is_active: boolean;
}

async function getArtist(slug: string): Promise<SelfPromoter | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('self_promoters')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as SelfPromoter;
}

async function getArtistEvents(artistId: string): Promise<Event[]> {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('self_promoter_id', artistId)
    .eq('is_active', true)
    .gte('event_date', today)
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Error fetching artist events:', error);
    return [];
  }

  return (data || []) as Event[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtist(slug);

  if (!artist) {
    return {
      title: 'Artist Not Found | TasteLanc',
    };
  }

  return {
    title: `${artist.name} | TasteLanc`,
    description: artist.bio || `Check out upcoming events from ${artist.name} on TasteLanc`,
    openGraph: {
      title: `${artist.name} | TasteLanc`,
      description: artist.bio || `Check out upcoming events from ${artist.name}`,
      images: artist.profile_image_url ? [{ url: artist.profile_image_url }] : [],
    },
  };
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = await getArtist(slug);

  if (!artist) {
    notFound();
  }

  const events = await getArtistEvents(artist.id);

  return (
    <div className="min-h-screen bg-tastelanc-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-tastelanc-bg/95 backdrop-blur border-b border-tastelanc-surface-light">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-tastelanc-accent">
            TasteLanc
          </Link>
          <Link
            href="/events"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            All Events
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Artist Profile */}
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
          {artist.profile_image_url ? (
            <img
              src={artist.profile_image_url}
              alt={artist.name}
              className="w-32 h-32 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Music className="w-12 h-12 text-purple-400" />
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{artist.name}</h1>
            {artist.genre && (
              <p className="text-purple-400 mb-3">{artist.genre}</p>
            )}
            {artist.bio && (
              <p className="text-gray-400 mb-4">{artist.bio}</p>
            )}

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {artist.website && (
                <a
                  href={artist.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-sm">Website</span>
                </a>
              )}
              {artist.instagram && (
                <a
                  href={`https://instagram.com/${artist.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                  <span className="text-sm">{artist.instagram}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Upcoming Events</h2>

          {events.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No upcoming events scheduled</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const formattedDate = event.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : 'TBA';

  return (
    <Card className="overflow-hidden hover:border-purple-500/50 transition-colors cursor-pointer group">
      {/* Event Image - Spotify card style */}
      <div className="aspect-square relative">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-purple-500/20 flex items-center justify-center">
            <Music className="w-16 h-16 text-purple-400" />
          </div>
        )}

        {/* Overlay with date badge */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-semibold text-lg truncate">{event.name}</h3>
          <div className="flex items-center gap-3 text-gray-300 text-sm mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {event.start_time}
            </span>
          </div>
          {event.cover_charge && (
            <p className="text-purple-400 text-sm mt-1">${event.cover_charge} cover</p>
          )}
        </div>
      </div>
    </Card>
  );
}
