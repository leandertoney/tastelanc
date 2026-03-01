import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getLeadAge } from '@/lib/utils/lead-aging';

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

    // Fetch lead with linked restaurant
    const { data: lead, error } = await serviceClient
      .from('business_leads')
      .select('*, restaurants(id, name, is_active, tier_id, tiers(name))')
      .eq('id', id)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Market scope verification
    if (access.marketIds !== null && lead.market_id && !access.marketIds.includes(lead.market_id)) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Resolve assigned_to name
    let assigned_to_name: string | null = null;
    if (lead.assigned_to) {
      const { data: rep } = await serviceClient
        .from('sales_reps')
        .select('name')
        .eq('id', lead.assigned_to)
        .single();
      assigned_to_name = rep?.name || null;
    }

    // Fetch activities for this lead
    const { data: activities } = await serviceClient
      .from('lead_activities')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false });

    // Compute ownership info for client
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
    console.error('Error fetching lead:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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
    const body = await request.json();

    // Ownership enforcement — fetch current lead
    const { data: currentLead } = await serviceClient
      .from('business_leads')
      .select('status, assigned_to, updated_at, created_at, market_id')
      .eq('id', id)
      .single();

    if (!currentLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Market scope verification
    if (access.marketIds !== null && currentLead.market_id && !access.marketIds.includes(currentLead.market_id)) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Check ownership: if assigned to another rep and caller isn't admin
    if (currentLead.assigned_to && currentLead.assigned_to !== access.userId && !access.isAdmin) {
      const aging = getLeadAge(currentLead);

      if (!aging.isStale) {
        // <14 days — locked
        return NextResponse.json(
          { error: 'This lead is owned by another sales rep. It will become available after 14 days of inactivity.' },
          { status: 403 }
        );
      }

      // 14+ days — stale, allow and auto-reassign
      // Will be set below via assigned_to override
    }

    const {
      business_name,
      contact_name,
      email,
      phone,
      website,
      address,
      city,
      state,
      zip_code,
      category,
      status,
      notes,
      tags,
      assigned_to,
    } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (business_name !== undefined) updateData.business_name = business_name;
    if (contact_name !== undefined) updateData.contact_name = contact_name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zip_code !== undefined) updateData.zip_code = zip_code;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) updateData.tags = tags;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

    // Auto-reassign stale leads when another rep edits
    if (
      currentLead.assigned_to &&
      currentLead.assigned_to !== access.userId &&
      !access.isAdmin
    ) {
      const aging = getLeadAge(currentLead);
      if (aging.isStale) {
        updateData.assigned_to = access.userId;
      }
    }

    // Update last_contacted_at on certain status changes
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

    // Auto-log status change as an activity
    if (status && currentLead && currentLead.status !== status) {
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
    console.error('Error in update lead API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
