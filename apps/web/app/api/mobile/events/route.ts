import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

// Default event images by type
const DEFAULT_EVENT_IMAGES: Record<string, string> = {
  trivia: `${SITE_URL}/images/events/trivia.png`,
  live_music: `${SITE_URL}/images/events/live_music.png`,
  karaoke: `${SITE_URL}/images/events/karaoke.png`,
  dj: `${SITE_URL}/images/events/dj.png`,
  comedy: `${SITE_URL}/images/events/comedy.png`,
  sports: `${SITE_URL}/images/events/sports.png`,
  other: `${SITE_URL}/images/events/other.png`,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const restaurantId = searchParams.get('restaurant_id');
    const selfPromoterId = searchParams.get('self_promoter_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Build separate queries for restaurant events and self-promoter events
    const results: Array<Record<string, unknown>> = [];

    // Query 1: Restaurant events (unless filtering by self_promoter_id)
    if (!selfPromoterId) {
      let restaurantQuery = supabase
        .from('events')
        .select('*, restaurant:restaurants!inner(id, name, slug, logo_url, tier_id)')
        .eq('is_active', true)
        .not('restaurant_id', 'is', null)
        .or(`event_date.gte.${today},is_recurring.eq.true`)
        .order('event_date', { ascending: true, nullsFirst: false })
        .limit(limit);

      if (type) {
        restaurantQuery = restaurantQuery.eq('event_type', type);
      }

      if (restaurantId) {
        restaurantQuery = restaurantQuery.eq('restaurant_id', restaurantId);
      }

      const { data: restaurantEvents, error: restaurantError } = await restaurantQuery;

      if (restaurantError) {
        console.error('Error fetching restaurant events:', restaurantError);
      } else if (restaurantEvents) {
        results.push(...restaurantEvents.map((event) => ({
          ...event,
          source_type: 'restaurant',
        })));
      }
    }

    // Query 2: Self-promoter events (unless filtering by restaurant_id)
    if (!restaurantId) {
      let selfPromoterQuery = supabase
        .from('events')
        .select('*, self_promoter:self_promoters!inner(id, name, slug, profile_image_url)')
        .eq('is_active', true)
        .not('self_promoter_id', 'is', null)
        .gte('event_date', today) // Self-promoter events are never recurring
        .order('event_date', { ascending: true, nullsFirst: false })
        .limit(limit);

      if (type) {
        selfPromoterQuery = selfPromoterQuery.eq('event_type', type);
      }

      if (selfPromoterId) {
        selfPromoterQuery = selfPromoterQuery.eq('self_promoter_id', selfPromoterId);
      }

      const { data: selfPromoterEvents, error: selfPromoterError } = await selfPromoterQuery;

      if (selfPromoterError) {
        console.error('Error fetching self-promoter events:', selfPromoterError);
      } else if (selfPromoterEvents) {
        results.push(...selfPromoterEvents.map((event) => ({
          ...event,
          source_type: 'self_promoter',
        })));
      }
    }

    // Sort combined results by event_date
    results.sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date as string).getTime() : Infinity;
      const dateB = b.event_date ? new Date(b.event_date as string).getTime() : Infinity;
      return dateA - dateB;
    });

    // Limit total results
    const limitedResults = results.slice(0, limit);

    // Add default image_url if not set (only for restaurant events - self-promoter events require images)
    const eventsWithImages = limitedResults.map((event) => ({
      ...event,
      image_url: event.image_url || DEFAULT_EVENT_IMAGES[event.event_type as string] || DEFAULT_EVENT_IMAGES.other,
    }));

    return NextResponse.json({ events: eventsWithImages });
  } catch (error) {
    console.error('Error in mobile events API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
