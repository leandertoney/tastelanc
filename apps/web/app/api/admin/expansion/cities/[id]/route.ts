import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch city
    const { data: city, error } = await serviceClient
      .from('expansion_cities')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    // Fetch brand drafts count
    const { count: brand_drafts_count } = await serviceClient
      .from('expansion_brand_drafts')
      .select('*', { count: 'exact', head: true })
      .eq('city_id', id);

    // Fetch job listings count
    const { count: job_listings_count } = await serviceClient
      .from('expansion_job_listings')
      .select('*', { count: 'exact', head: true })
      .eq('city_id', id);

    return NextResponse.json({
      city,
      brand_drafts_count: brand_drafts_count || 0,
      job_listings_count: job_listings_count || 0,
    });
  } catch (error) {
    console.error('Error fetching expansion city:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    const body = await request.json();
    const { status, priority, admin_notes, rejected_reason } = body;

    // Fetch current city to detect changes
    const { data: currentCity, error: fetchError } = await serviceClient
      .from('expansion_cities')
      .select('status, admin_notes')
      .eq('id', id)
      .single();

    if (fetchError || !currentCity) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    // Build update payload — only include fields that were provided
    const updatePayload: Record<string, any> = {};
    if (status !== undefined) updatePayload.status = status;
    if (priority !== undefined) updatePayload.priority = priority;
    if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes;
    if (rejected_reason !== undefined) updatePayload.rejected_reason = rejected_reason;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Update city
    const { data: city, error: updateError } = await serviceClient
      .from('expansion_cities')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating expansion city:', updateError);
      return NextResponse.json({ error: 'Failed to update city' }, { status: 500 });
    }

    // Log activity for status changes
    if (status !== undefined && status !== currentCity.status) {
      await serviceClient
        .from('expansion_activity_log')
        .insert({
          city_id: id,
          user_id: admin.userId,
          action: 'status_changed',
          description: `Status changed from "${currentCity.status}" to "${status}"`,
          metadata: { old_status: currentCity.status, new_status: status },
        });
    }

    // Log activity for note changes
    if (admin_notes !== undefined && admin_notes !== currentCity.admin_notes) {
      await serviceClient
        .from('expansion_activity_log')
        .insert({
          city_id: id,
          user_id: admin.userId,
          action: 'note_added',
          description: 'Admin notes updated',
        });
    }

    return NextResponse.json({ city });
  } catch (error) {
    console.error('Error updating expansion city:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    // Delete city (ON DELETE CASCADE will clean up brand_drafts, job_listings, activity_log)
    const { error } = await serviceClient
      .from('expansion_cities')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting expansion city:', error);
      return NextResponse.json({ error: 'Failed to delete city' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expansion city:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
