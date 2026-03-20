import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/party/active — returns the currently active party event (for mobile app)
export async function GET() {
  try {
    const serviceClient = createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('party_events')
      .select('id, name, date, venue, address, capacity')
      .eq('is_active', true)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ event: null });
    }

    // Count total RSVPs for this event
    const { count } = await serviceClient
      .from('party_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('party_event_id', data.id);

    return NextResponse.json({
      event: {
        ...data,
        rsvp_count: count ?? 0,
        spots_remaining: data.capacity ? data.capacity - (count ?? 0) : null,
      },
    });
  } catch (err) {
    console.error('[party/active] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
