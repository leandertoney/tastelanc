import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Verify lead exists and is in scope
    const { data: lead } = await serviceClient
      .from('business_leads')
      .select('id, market_id')
      .eq('id', id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (access.marketIds !== null && lead.market_id && !access.marketIds.includes(lead.market_id)) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Fetch replies
    const { data: replies, error } = await serviceClient
      .from('lead_email_replies')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching replies:', error);
      return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
    }

    // Mark unread replies as read
    const unreadIds = (replies || []).filter(r => !r.is_read).map(r => r.id);
    if (unreadIds.length > 0) {
      await serviceClient
        .from('lead_email_replies')
        .update({ is_read: true })
        .in('id', unreadIds);

      // Check if lead has any remaining unread replies (from other leads — shouldn't, but be safe)
      await serviceClient
        .from('business_leads')
        .update({ has_unread_replies: false })
        .eq('id', id);
    }

    return NextResponse.json({ replies: replies || [] });
  } catch (error) {
    console.error('Error in replies API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
