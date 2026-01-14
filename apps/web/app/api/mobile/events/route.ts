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
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('events')
      .select('*, restaurant:restaurants!inner(id, name, slug, logo_url, tier_id)')
      .eq('is_active', true)
      .or(`event_date.gte.${today},is_recurring.eq.true`)
      .order('event_date', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (type) {
      query = query.eq('event_type', type);
    }

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    // Note: paid_only filter removed - show all events regardless of restaurant tier

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    // Add default image_url if not set
    const eventsWithImages = (events || []).map((event) => ({
      ...event,
      image_url: event.image_url || DEFAULT_EVENT_IMAGES[event.event_type] || DEFAULT_EVENT_IMAGES.other,
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
