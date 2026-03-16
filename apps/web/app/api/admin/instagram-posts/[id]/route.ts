import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  if (!profile || !['super_admin', 'co_founder', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const serviceClient = createServiceRoleClient();

  // Build update payload — support status, scheduled_publish_at, caption edits
  const updateData: Record<string, unknown> = {};

  if (body.status) {
    const validStatuses = ['draft', 'pending_review', 'approved', 'rejected', 'published', 'failed'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
    }
    updateData.status = body.status;
  }

  if (body.scheduled_publish_at !== undefined) {
    updateData.scheduled_publish_at = body.scheduled_publish_at;
  }

  if (body.caption !== undefined) {
    updateData.caption = body.caption;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from('instagram_posts')
    .update(updateData)
    .eq('id', params.id)
    .select('id, status, scheduled_publish_at, day_theme')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
