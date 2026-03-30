import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/party/admin/decline-request — decline a pending headcount request with a reason
export async function POST(request: Request) {
  try {
    const { pending_code_id, reason } = await request.json();

    if (!pending_code_id) {
      return NextResponse.json({ error: 'pending_code_id is required' }, { status: 400 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
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

    if (!profile?.role || !['super_admin', 'co_founder', 'market_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    const { error } = await serviceClient
      .from('party_invite_codes')
      .update({
        status: 'declined',
        decline_reason: reason.trim(),
      })
      .eq('id', pending_code_id);

    if (error) {
      console.error('[party/admin/decline-request] update error:', error);
      return NextResponse.json({ error: 'Failed to decline request' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[party/admin/decline-request] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
