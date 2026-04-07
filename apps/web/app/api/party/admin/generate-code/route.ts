import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Safe alphabet — no confusing chars (O/0, I/1, L)
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(restaurantName: string): string {
  // 4-letter restaurant prefix (recognizable) + 4 random chars (not guessable)
  const prefix = restaurantName
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X'); // pad short names like "Zig" → "ZIGX"
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  }
  return `${prefix}${suffix}`;
}

// POST /api/party/admin/generate-code — generate an invite code for a restaurant
export async function POST(request: Request) {
  try {
    const { restaurant_id, restaurant_name, use_limit, channel, notes, party_event_id } = await request.json();

    if (!use_limit || typeof use_limit !== 'number' || use_limit < 1) {
      return NextResponse.json({ error: 'use_limit must be a positive number' }, { status: 400 });
    }

    // Verify admin
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

    // Resolve party event
    let eventId = party_event_id;
    if (!eventId) {
      const { data: event } = await serviceClient
        .from('party_events')
        .select('id')
        .eq('is_active', true)
        .order('date', { ascending: true })
        .limit(1)
        .single();

      if (!event) {
        return NextResponse.json({ error: 'No active party event found' }, { status: 404 });
      }
      eventId = event.id;
    }

    // Resolve restaurant name for code generation
    let name = restaurant_name;
    if (!name && restaurant_id) {
      const { data: restaurant } = await serviceClient
        .from('restaurants')
        .select('name')
        .eq('id', restaurant_id)
        .single();
      name = restaurant?.name ?? 'GUEST';
    }
    name = name ?? 'GUEST';

    // Generate a unique code (retry up to 5 times on collision)
    let code = '';
    let attempts = 0;
    while (attempts < 5) {
      code = generateCode(name);
      const { data: existing } = await serviceClient
        .from('party_invite_codes')
        .select('id')
        .eq('code', code)
        .single();
      if (!existing) break;
      attempts++;
    }

    const { data: inviteCode, error } = await serviceClient
      .from('party_invite_codes')
      .insert({
        party_event_id: eventId,
        restaurant_id: restaurant_id ?? null,
        code,
        use_limit,
        channel: channel ?? 'manual',
        notes: notes ?? null,
      })
      .select('*')
      .single();

    if (error || !inviteCode) {
      console.error('[party/admin/generate-code] insert error:', error);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    return NextResponse.json({ success: true, invite_code: inviteCode });
  } catch (err) {
    console.error('[party/admin/generate-code] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
