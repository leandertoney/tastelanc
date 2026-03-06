import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getLeadAge } from '@/lib/utils/lead-aging';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createMobileClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await verifySalesAccess(supabase);
    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    const { data: lead, error } = await serviceClient
      .from('business_leads')
      .select('*, restaurants(id, name, is_active, tier_id, tiers(name))')
      .eq('id', id)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (access.marketIds !== null && lead.market_id && !access.marketIds.includes(lead.market_id)) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    let assigned_to_name: string | null = null;
    if (lead.assigned_to) {
      const { data: rep } = await serviceClient
        .from('sales_reps')
        .select('name')
        .eq('id', lead.assigned_to)
        .single();
      assigned_to_name = rep?.name || null;
    }

    const { data: activities } = await serviceClient
      .from('lead_activities')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false });

    const aging = getLeadAge(lead);
    const isOwner = lead.assigned_to === access.userId;
    const isLocked = !access.isAdmin && lead.assigned_to && !isOwner && !aging.isStale;

    return NextResponse.json({
      lead: { ...lead, assigned_to_name },
      activities: activities || [],
      ownership: {
        isOwner,
        isLocked,
        isNudge: aging.isNudge,
        isStale: aging.isStale,
        daysSinceUpdate: aging.daysSinceUpdate,
        currentUserId: access.userId,
        isAdmin: access.isAdmin,
      },
    });
  } catch (error) {
    console.error('Error fetching mobile lead:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createMobileClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await verifySalesAccess(supabase);
    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const body = await request.json();

    const { data: currentLead } = await serviceClient
      .from('business_leads')
      .select('status, assigned_to, updated_at, created_at, market_id')
      .eq('id', id)
      .single();

    if (!currentLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (access.marketIds !== null && currentLead.market_id && !access.marketIds.includes(currentLead.market_id)) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Ownership check
    if (currentLead.assigned_to && currentLead.assigned_to !== access.userId && !access.isAdmin) {
      const aging = getLeadAge(currentLead);
      if (!aging.isStale) {
        return NextResponse.json(
          { error: 'This lead is owned by another sales rep.' },
          { status: 403 }
        );
      }
    }

    const { status, notes, tags, assigned_to } = body;
    const updateData: Record<string, unknown> = {};

    const VALID_STATUSES = ['new', 'contacted', 'interested', 'not_interested', 'converted'];
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      updateData.status = status;
    }
    if (notes !== undefined) updateData.notes = typeof notes === 'string' ? notes.substring(0, 10000) : notes;
    if (tags !== undefined && Array.isArray(tags)) updateData.tags = tags;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

    // Auto-reassign stale leads
    if (currentLead.assigned_to && currentLead.assigned_to !== access.userId && !access.isAdmin) {
      const aging = getLeadAge(currentLead);
      if (aging.isStale) updateData.assigned_to = access.userId;
    }

    if (status && ['contacted', 'interested'].includes(status)) {
      updateData.last_contacted_at = new Date().toISOString();
    }

    const { data: lead, error } = await serviceClient
      .from('business_leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead:', error);
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }

    // Log status change
    if (status && currentLead.status !== status) {
      await serviceClient.from('lead_activities').insert({
        lead_id: id,
        user_id: access.userId,
        activity_type: 'status_change',
        description: `Status changed from "${currentLead.status}" to "${status}"`,
        metadata: { old_status: currentLead.status, new_status: status },
      });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error in mobile update lead API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
