import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/party/ticket/[qr_token] — return ticket details for display in the app
export async function GET(
  _request: Request,
  { params }: { params: { qr_token: string } }
) {
  try {
    const { qr_token } = params;

    if (!qr_token) {
      return NextResponse.json({ error: 'qr_token is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    const { data: rsvp, error } = await serviceClient
      .from('party_rsvps')
      .select(`
        id,
        name,
        qr_token,
        checked_in,
        checked_in_at,
        created_at,
        restaurant_id,
        party_events (
          name,
          date,
          venue,
          address
        ),
        restaurants (
          name
        ),
        party_invite_codes (
          restaurant_id,
          restaurants (
            name
          )
        )
      `)
      .eq('qr_token', qr_token)
      .single();

    if (error || !rsvp) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const event = Array.isArray(rsvp.party_events) ? rsvp.party_events[0] : rsvp.party_events;

    // Resolve restaurant name: prefer direct restaurant_id, fallback to invite_code join (old RSVPs)
    let restaurantName: string | null = null;
    const directRestaurant = Array.isArray(rsvp.restaurants) ? rsvp.restaurants[0] : rsvp.restaurants;
    if (directRestaurant?.name) {
      restaurantName = directRestaurant.name;
    } else {
      const code = Array.isArray(rsvp.party_invite_codes) ? rsvp.party_invite_codes[0] : rsvp.party_invite_codes;
      const codeRestaurant = code?.restaurants
        ? (Array.isArray(code.restaurants) ? code.restaurants[0] : code.restaurants)
        : null;
      restaurantName = codeRestaurant?.name ?? null;
    }

    return NextResponse.json({
      ticket: {
        id: rsvp.id,
        name: rsvp.name,
        qr_token: rsvp.qr_token,
        checked_in: rsvp.checked_in,
        checked_in_at: rsvp.checked_in_at,
        created_at: rsvp.created_at,
        restaurant_name: restaurantName,
        event: event ?? null,
      },
    });
  } catch (err) {
    console.error('[party/ticket] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
