import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function generateCode(restaurantName: string, useLimit: number): string {
  const slug = restaurantName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `HEMP-${slug}-${useLimit}-${suffix}`;
}

// POST /api/party/admin/approve-request — approve a pending headcount request
// Updates the PENDING-... placeholder row in-place with a real invite code
export async function POST(request: Request) {
  try {
    const { pending_code_id, use_limit } = await request.json();

    if (!pending_code_id) {
      return NextResponse.json({ error: 'pending_code_id is required' }, { status: 400 });
    }
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

    // Fetch the pending code row
    const { data: pendingCode, error: fetchError } = await serviceClient
      .from('party_invite_codes')
      .select('id, code, use_limit, restaurant_id, party_event_id, restaurants(name)')
      .eq('id', pending_code_id)
      .single();

    if (fetchError || !pendingCode) {
      return NextResponse.json({ error: 'Pending request not found' }, { status: 404 });
    }

    if (pendingCode.use_limit !== 0 && !pendingCode.code.startsWith('PENDING-')) {
      return NextResponse.json({ error: 'This request has already been approved' }, { status: 400 });
    }

    // Resolve restaurant name for code generation
    const restaurantsData = pendingCode.restaurants as unknown as { name: string } | null;
    const restaurantName = restaurantsData?.name ?? 'GUEST';

    // Generate a unique code (retry up to 5 times on collision)
    let code = '';
    let attempts = 0;
    while (attempts < 5) {
      code = generateCode(restaurantName, use_limit);
      const { data: existing } = await serviceClient
        .from('party_invite_codes')
        .select('id')
        .eq('code', code)
        .single();
      if (!existing) break;
      attempts++;
    }

    // Update the existing row in-place
    const { data: updatedCode, error: updateError } = await serviceClient
      .from('party_invite_codes')
      .update({
        code,
        use_limit,
        channel: 'dashboard',
        notes: `Approved via admin panel`,
        status: 'approved',
        decline_reason: null,
      })
      .eq('id', pending_code_id)
      .select('*')
      .single();

    if (updateError || !updatedCode) {
      console.error('[party/admin/approve-request] update error:', updateError);
      return NextResponse.json({ error: 'Failed to approve request' }, { status: 500 });
    }

    return NextResponse.json({ success: true, code, invite_code: updatedCode });
  } catch (err) {
    console.error('[party/admin/approve-request] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
