import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id, jobId } = await params;

    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    const body = await request.json();
    const { status, admin_notes } = body;

    // Verify job belongs to this city
    const { data: existingJob, error: fetchError } = await serviceClient
      .from('expansion_job_listings')
      .select('id, city_id, status, title')
      .eq('id', jobId)
      .eq('city_id', id)
      .single();

    if (fetchError || !existingJob) {
      return NextResponse.json({ error: 'Job listing not found for this city' }, { status: 404 });
    }

    // Build update payload
    const updatePayload: Record<string, any> = {};
    if (status !== undefined) updatePayload.status = status;
    if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes;

    // If status changes to 'approved', set approved_by and approved_at
    if (status === 'approved') {
      updatePayload.approved_by = admin.userId;
      updatePayload.approved_at = new Date().toISOString();
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Update job listing
    const { data: job, error: updateError } = await serviceClient
      .from('expansion_job_listings')
      .update(updatePayload)
      .eq('id', jobId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating job listing:', updateError);
      return NextResponse.json({ error: 'Failed to update job listing' }, { status: 500 });
    }

    // Log activity for status changes
    if (status !== undefined && status !== existingJob.status) {
      const action = status === 'approved' ? 'job_listing_approved' : 'job_listing_rejected';
      const description = status === 'approved'
        ? `Approved job listing "${existingJob.title}"`
        : `Rejected job listing "${existingJob.title}"`;

      await serviceClient
        .from('expansion_activity_log')
        .insert({
          city_id: id,
          user_id: admin.userId,
          action,
          description,
          metadata: { job_id: jobId, old_status: existingJob.status, new_status: status },
        });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error updating job listing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id, jobId } = await params;

    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    // Verify job belongs to this city before deleting
    const { data: existingJob } = await serviceClient
      .from('expansion_job_listings')
      .select('id')
      .eq('id', jobId)
      .eq('city_id', id)
      .single();

    if (!existingJob) {
      return NextResponse.json({ error: 'Job listing not found for this city' }, { status: 404 });
    }

    const { error } = await serviceClient
      .from('expansion_job_listings')
      .delete()
      .eq('id', jobId);

    if (error) {
      console.error('Error deleting job listing:', error);
      return NextResponse.json({ error: 'Failed to delete job listing' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting job listing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
