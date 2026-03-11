// GET /api/admin/recommendation-queue — fetch pending/approved/posted recommendations
// POST /api/admin/recommendation-queue — approve, reject, or edit a recommendation
// Auth: super_admin, co_founder, admin roles only

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

async function verifyAdmin(supabase: ReturnType<typeof createServiceRoleClient>) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['super_admin', 'co_founder', 'admin'].includes(profile.role)) {
    return null;
  }
  return user;
}

export async function GET(request: Request) {
  const serviceClient = createServiceRoleClient();
  const user = await verifyAdmin(serviceClient);
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 'pending', 'ai_approved', 'posted', 'rejected', or null for all
  const marketSlug = searchParams.get('market');

  let query = serviceClient
    .from('restaurant_recommendations')
    .select(`
      id, video_url, thumbnail_url, caption, caption_tag, duration_seconds,
      view_count, like_count, ig_status, ig_scheduled_at, ig_post_id,
      ai_review_notes, ig_caption_override, ig_reviewed_by, created_at,
      profiles:user_id(display_name, avatar_url),
      restaurant:restaurants!inner(name, slug, market:markets!inner(slug, name))
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (status) {
    query = query.eq('ig_status', status);
  }

  if (marketSlug) {
    query = query.eq('restaurant.market.slug', marketSlug);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recommendation queue:', error);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }

  return NextResponse.json({ recommendations: data || [] });
}

export async function POST(request: Request) {
  const serviceClient = createServiceRoleClient();
  const user = await verifyAdmin(serviceClient);
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { recommendation_id, action, ig_caption_override } = body;

  if (!recommendation_id || !action) {
    return NextResponse.json({ error: 'recommendation_id and action required' }, { status: 400 });
  }

  if (!['approve', 'reject', 'reset'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action. Must be: approve, reject, reset' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    ig_reviewed_by: user.id,
  };

  if (action === 'approve') {
    updates.is_visible = true; // Make visible in app
    updates.ig_status = 'admin_approved';
    updates.ig_scheduled_at = new Date().toISOString(); // Post to IG immediately
    if (ig_caption_override) {
      updates.ig_caption_override = ig_caption_override;
    }
  } else if (action === 'reject') {
    updates.is_visible = false; // Hide from app
    updates.ig_status = 'rejected';
    updates.ig_scheduled_at = null;
  } else if (action === 'reset') {
    updates.is_visible = false; // Hide until re-reviewed
    updates.ig_status = 'pending';
    updates.ig_scheduled_at = null;
    updates.ai_review_notes = null;
    updates.ig_reviewed_by = null;
  }

  const { error } = await serviceClient
    .from('restaurant_recommendations')
    .update(updates)
    .eq('id', recommendation_id);

  if (error) {
    console.error('Error updating recommendation:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ success: true, action, recommendation_id });
}
