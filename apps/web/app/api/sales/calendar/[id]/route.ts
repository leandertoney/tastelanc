import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';

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
    const { title, description, meeting_date, start_time, end_time, lead_id, restaurant_id } = body;

    // Validate title if provided
    if (title !== undefined && (!title || !title.trim())) {
      return NextResponse.json(
        { error: 'title cannot be empty' },
        { status: 400 }
      );
    }

    // Validate meeting_date if provided
    if (meeting_date !== undefined && (!meeting_date || isNaN(Date.parse(meeting_date)))) {
      return NextResponse.json(
        { error: 'Invalid meeting_date (use YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (meeting_date !== undefined) updateData.meeting_date = meeting_date;
    if (start_time !== undefined) updateData.start_time = start_time || null;
    if (end_time !== undefined) updateData.end_time = end_time || null;
    if (lead_id !== undefined) updateData.lead_id = lead_id || null;
    if (restaurant_id !== undefined) updateData.restaurant_id = restaurant_id || null;

    let query = serviceClient
      .from('sales_meetings')
      .update(updateData)
      .eq('id', id);

    // Non-admin can only update own meetings
    if (!access.isAdmin) {
      query = query.eq('created_by', access.userId);
    }

    const { data: meeting, error } = await query
      .select('*, business_leads(id, business_name, contact_name), restaurants(id, name)')
      .maybeSingle();

    if (error) {
      console.error('Error updating meeting:', error);
      return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
    }

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error('Error in update meeting API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // First verify the meeting exists and the user has access
    let checkQuery = serviceClient
      .from('sales_meetings')
      .select('id')
      .eq('id', id);

    if (!access.isAdmin) {
      checkQuery = checkQuery.eq('created_by', access.userId);
    }

    const { data: existing } = await checkQuery.maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Meeting not found or access denied' }, { status: 404 });
    }

    const { error } = await serviceClient
      .from('sales_meetings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting meeting:', error);
      return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete meeting API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
