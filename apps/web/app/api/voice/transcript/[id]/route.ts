export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/voice/transcript/[id]
 *
 * Get a single voice transcript with full conversation detail.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify user is authenticated and has admin/sales role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'co_founder', 'admin', 'market_admin', 'sales_rep'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('voice_transcripts')
      .select(`
        *,
        lead:business_leads(id, contact_name, business_name, email, phone, status),
        meetings:sales_meetings(id, meeting_date, start_time, end_time, meeting_type, status, notes)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Also fetch related agent activity
    const { data: activity } = await serviceClient
      .from('agent_activity_log')
      .select('*')
      .eq('transcript_id', id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      transcript: data,
      activity: activity || [],
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
