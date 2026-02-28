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

    const { data: activities, error } = await serviceClient
      .from('lead_activities')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    return NextResponse.json({ activities: activities || [] });
  } catch (error) {
    console.error('Error in activities API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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

    const body = await request.json();
    const { activity_type, description } = body;

    if (!activity_type) {
      return NextResponse.json(
        { error: 'activity_type is required' },
        { status: 400 }
      );
    }

    const validTypes = ['call', 'email', 'meeting', 'note', 'follow_up'];
    if (!validTypes.includes(activity_type)) {
      return NextResponse.json(
        { error: `Invalid activity_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Verify lead exists and check ownership
    const { data: lead } = await serviceClient
      .from('business_leads')
      .select('id, assigned_to, updated_at, created_at')
      .eq('id', id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Ownership enforcement
    if (lead.assigned_to && lead.assigned_to !== access.userId && !access.isAdmin) {
      const aging = getLeadAge(lead);
      if (!aging.isStale) {
        return NextResponse.json(
          { error: 'This lead is owned by another sales rep' },
          { status: 403 }
        );
      }
    }

    // Create activity
    const { data: activity, error } = await serviceClient
      .from('lead_activities')
      .insert({
        lead_id: id,
        user_id: access.userId,
        activity_type,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
    }

    // Update last_contacted_at on outreach activities
    if (['call', 'email', 'meeting'].includes(activity_type)) {
      await serviceClient
        .from('business_leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', id);
    }

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error in create activity API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
