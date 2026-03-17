import { NextResponse } from 'next/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const supabase = createMobileClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { venue_id, event_date, event_name, market_id } = await request.json();

    if (!market_id) {
      return NextResponse.json({ error: 'market_id is required' }, { status: 400 });
    }

    // Need at least venue + date or venue + name to check
    if (!venue_id || (!event_date && !event_name)) {
      return NextResponse.json({ is_duplicate: false });
    }

    const serviceClient = createServiceRoleClient();

    let query = serviceClient
      .from('events')
      .select('id, name, event_date, start_time, end_time, image_url, restaurant:restaurants(id, name)')
      .eq('restaurant_id', venue_id)
      .eq('is_active', true)
      .eq('market_id', market_id);

    if (event_date) {
      query = query.eq('event_date', event_date);
    }

    const { data: candidates, error } = await query.limit(20);

    if (error || !candidates || candidates.length === 0) {
      return NextResponse.json({ is_duplicate: false });
    }

    // Fuzzy title matching using keyword overlap
    if (event_name) {
      const searchWords = event_name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 2);

      const duplicates = candidates.filter(event => {
        const eventWords = event.name
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w: string) => w.length > 2);

        const overlap = searchWords.filter((w: string) => eventWords.includes(w));
        // Consider duplicate if >50% keyword overlap
        return searchWords.length > 0 && overlap.length / searchWords.length > 0.5;
      });

      if (duplicates.length > 0) {
        return NextResponse.json({
          is_duplicate: true,
          existing_event: duplicates[0],
        });
      }
    }

    // If same venue + same date but no name match, still flag if there's only one event
    if (event_date && candidates.length === 1) {
      return NextResponse.json({
        is_duplicate: true,
        existing_event: candidates[0],
      });
    }

    return NextResponse.json({ is_duplicate: false });
  } catch (error) {
    console.error('Error in duplicate check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
