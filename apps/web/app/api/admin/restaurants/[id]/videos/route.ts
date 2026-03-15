// GET /api/admin/restaurants/[id]/videos — fetch all videos for a restaurant (including hidden)
// POST /api/admin/restaurants/[id]/videos — hide/unhide/delete a video
// Auth: super_admin, co_founder, admin roles only

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

async function verifyAdmin() {
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: restaurantId } = await params;
  const serviceClient = createServiceRoleClient();

  const { data, error } = await serviceClient
    .from('restaurant_recommendations')
    .select(`
      id, video_url, thumbnail_url, caption, caption_tag, duration_seconds,
      view_count, like_count, is_visible, ig_status, ig_post_id,
      ai_review_notes, created_at,
      profiles:user_id(display_name, avatar_url)
    `)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching restaurant videos:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }

  return NextResponse.json({ videos: data || [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: restaurantId } = await params;
  const serviceClient = createServiceRoleClient();
  const body = await request.json();
  const { video_id, action } = body;

  if (!video_id || !action) {
    return NextResponse.json({ error: 'video_id and action required' }, { status: 400 });
  }

  if (!['hide', 'unhide', 'delete'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action. Must be: hide, unhide, delete' }, { status: 400 });
  }

  // Verify the video belongs to this restaurant
  const { data: rec } = await serviceClient
    .from('restaurant_recommendations')
    .select('id, video_url, thumbnail_url, restaurant_id')
    .eq('id', video_id)
    .eq('restaurant_id', restaurantId)
    .single();

  if (!rec) {
    return NextResponse.json({ error: 'Video not found for this restaurant' }, { status: 404 });
  }

  if (action === 'delete') {
    // Remove files from storage
    const filesToRemove: string[] = [];
    for (const url of [rec.video_url, rec.thumbnail_url]) {
      if (url) {
        const match = url.match(/recommendation-videos\/(.+)$/);
        if (match) filesToRemove.push(match[1]);
      }
    }
    if (filesToRemove.length > 0) {
      await serviceClient.storage.from('recommendation-videos').remove(filesToRemove);
    }

    // Delete likes first (FK constraint)
    await serviceClient
      .from('recommendation_likes')
      .delete()
      .eq('recommendation_id', video_id);

    // Delete the recommendation row
    const { error } = await serviceClient
      .from('restaurant_recommendations')
      .delete()
      .eq('id', video_id);

    if (error) {
      console.error('Error deleting video:', error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
  } else {
    const { error } = await serviceClient
      .from('restaurant_recommendations')
      .update({ is_visible: action === 'unhide' })
      .eq('id', video_id);

    if (error) {
      console.error('Error updating video visibility:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, action, video_id });
}
