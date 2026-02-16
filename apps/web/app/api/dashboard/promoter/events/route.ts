import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/auth/admin-access';

// Verify self-promoter access
async function verifySelfPromoterAccess(selfPromoterId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const isAdmin = await isUserAdmin(supabase);

  // Fetch self-promoter
  const { data: selfPromoter, error } = await supabase
    .from('self_promoters')
    .select('id, owner_id')
    .eq('id', selfPromoterId)
    .single();

  if (error || !selfPromoter) {
    return { error: 'Self-promoter not found', status: 404 };
  }

  const isOwner = selfPromoter.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return { error: 'Access denied', status: 403 };
  }

  return { selfPromoter, user, isAdmin, isOwner };
}

// GET - Fetch events for a self-promoter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selfPromoterId = searchParams.get('self_promoter_id');

    if (!selfPromoterId) {
      return NextResponse.json({ error: 'Missing self_promoter_id' }, { status: 400 });
    }

    const access = await verifySelfPromoterAccess(selfPromoterId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = await createClient();
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('self_promoter_id', selfPromoterId)
      .order('event_date', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({ events: events || [] });
  } catch (error) {
    console.error('Error in GET events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new event
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selfPromoterId = searchParams.get('self_promoter_id');

    if (!selfPromoterId) {
      return NextResponse.json({ error: 'Missing self_promoter_id' }, { status: 400 });
    }

    const access = await verifySelfPromoterAccess(selfPromoterId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const {
      name,
      description,
      event_type,
      event_date,
      start_time,
      end_time,
      performer_name,
      cover_charge,
      image_url,
    } = body;

    // Validate required fields
    if (!name || !event_type || !start_time || !event_date) {
      return NextResponse.json(
        { error: 'Missing required fields: name, event_type, event_date, start_time' },
        { status: 400 }
      );
    }

    // Validate event type - performance-based only
    const allowedTypes = ['live_music', 'dj', 'karaoke', 'comedy'];
    if (!allowedTypes.includes(event_type)) {
      return NextResponse.json(
        { error: 'Invalid event type. Allowed: live_music, dj, karaoke, comedy' },
        { status: 400 }
      );
    }

    // Validate image is provided (required for self-promoters)
    if (!image_url) {
      return NextResponse.json(
        { error: 'Event flyer image is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        self_promoter_id: selfPromoterId,
        restaurant_id: null, // Self-promoter events don't have a restaurant
        name,
        description,
        event_type,
        event_date,
        start_time,
        end_time,
        performer_name,
        cover_charge: cover_charge ? parseFloat(cover_charge) : null,
        image_url,
        is_recurring: false, // Self-promoters can only create one-time events
        days_of_week: [],
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error in POST event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
