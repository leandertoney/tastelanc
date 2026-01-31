import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

// Default event images by type
const DEFAULT_EVENT_IMAGES: Record<string, string> = {
  trivia: `${SITE_URL}/images/events/trivia.png`,
  live_music: `${SITE_URL}/images/events/live_music.png`,
  karaoke: `${SITE_URL}/images/events/karaoke.png`,
  dj: `${SITE_URL}/images/events/dj.png`,
  comedy: `${SITE_URL}/images/events/comedy.png`,
  sports: `${SITE_URL}/images/events/sports.png`,
  music_bingo: `${SITE_URL}/images/events/music_bingo.jpg`,
  other: `${SITE_URL}/images/events/other.png`,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurantId);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    return NextResponse.json({ events: events || [] });
  } catch (error) {
    console.error('Error in events API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurantId);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      event_type,
      is_recurring,
      days_of_week,
      event_date,
      start_time,
      end_time,
      performer_name,
      cover_charge,
      image_url,
      is_active,
    } = body;

    // Use service role client for admin operations to bypass RLS
    const dbClient = accessResult.isAdmin ? createServiceRoleClient() : supabase;

    // Use default image based on event type if no custom image provided
    const eventType = event_type || 'other';
    const finalImageUrl = image_url || DEFAULT_EVENT_IMAGES[eventType] || DEFAULT_EVENT_IMAGES.other;

    const { data: event, error } = await dbClient
      .from('events')
      .insert({
        restaurant_id: restaurantId,
        name,
        description,
        event_type: eventType,
        is_recurring: is_recurring ?? true,
        days_of_week: days_of_week || [],
        event_date,
        start_time,
        end_time,
        performer_name,
        cover_charge,
        image_url: finalImageUrl,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return NextResponse.json(
        { error: `Failed to create event: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Error in create event API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
