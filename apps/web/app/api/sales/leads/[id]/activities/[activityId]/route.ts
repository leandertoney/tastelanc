import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; activityId: string }> }
) {
  try {
    const { id, activityId } = await params;
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
    const { description } = body;

    // Verify activity exists and belongs to this lead
    const { data: existing } = await serviceClient
      .from('lead_activities')
      .select('id, lead_id, activity_type')
      .eq('id', activityId)
      .eq('lead_id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Don't allow editing auto-generated status_change activities
    if (existing.activity_type === 'status_change') {
      return NextResponse.json({ error: 'Cannot edit status change entries' }, { status: 400 });
    }

    const { data: activity, error } = await serviceClient
      .from('lead_activities')
      .update({ description: description || null })
      .eq('id', activityId)
      .select()
      .single();

    if (error) {
      console.error('Error updating activity:', error);
      return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
    }

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error in update activity API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; activityId: string }> }
) {
  try {
    const { id, activityId } = await params;
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Verify activity exists and belongs to this lead
    const { data: existing } = await serviceClient
      .from('lead_activities')
      .select('id, lead_id, activity_type')
      .eq('id', activityId)
      .eq('lead_id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Don't allow deleting auto-generated status_change activities
    if (existing.activity_type === 'status_change') {
      return NextResponse.json({ error: 'Cannot delete status change entries' }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('lead_activities')
      .delete()
      .eq('id', activityId);

    if (error) {
      console.error('Error deleting activity:', error);
      return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete activity API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
