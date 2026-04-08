import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/party/check-in — admin-only, mark a QR token as checked in (single-use)
export async function POST(request: Request) {
  try {
    const { qr_token } = await request.json();

    if (!qr_token || typeof qr_token !== 'string') {
      return NextResponse.json({ error: 'qr_token is required' }, { status: 400 });
    }

    // Verify the caller is an admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile?.role || !['super_admin','co_founder','market_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    // Look up the RSVP with restaurant info (direct + fallback via invite code)
    const { data: rsvp, error: lookupError } = await serviceClient
      .from('party_rsvps')
      .select(`
        id, name, checked_in, restaurant_id,
        restaurants (name),
        party_invite_codes (restaurant_id, restaurants (name))
      `)
      .eq('qr_token', qr_token.trim())
      .single();

    if (lookupError || !rsvp) {
      return NextResponse.json({ error: 'Invalid QR code — ticket not found' }, { status: 404 });
    }

    // Resolve restaurant name: prefer direct, fallback to invite code
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

    if (rsvp.checked_in) {
      return NextResponse.json({
        error: 'Already checked in',
        already_checked_in: true,
        name: rsvp.name,
        restaurant_name: restaurantName,
      }, { status: 409 });
    }

    // Mark as checked in
    const { error: updateError } = await serviceClient
      .from('party_rsvps')
      .update({ checked_in: true, checked_in_at: new Date().toISOString() })
      .eq('id', rsvp.id);

    if (updateError) {
      console.error('[party/check-in] update error:', updateError);
      return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      name: rsvp.name,
      restaurant_name: restaurantName,
    });
  } catch (err) {
    console.error('[party/check-in] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
