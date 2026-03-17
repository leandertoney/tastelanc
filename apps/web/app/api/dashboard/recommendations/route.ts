import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurantId);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch all visible recommendations for this restaurant
    const { data: recommendations, error: recError } = await serviceClient
      .from('restaurant_recommendations')
      .select('id, video_url, thumbnail_url, caption, caption_tag, duration_seconds, view_count, like_count, is_pinned, created_at, profiles:user_id(display_name, avatar_url)')
      .eq('restaurant_id', restaurantId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    if (recError) throw recError;

    const allRecs = recommendations || [];

    // Aggregate stats
    const totalVideos = allRecs.length;
    const totalViews = allRecs.reduce((sum, r) => sum + (r.view_count || 0), 0);
    const totalLikes = allRecs.reduce((sum, r) => sum + (r.like_count || 0), 0);
    const totalDuration = allRecs.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);

    // This week's new recs
    const thisWeekRecs = allRecs.filter(
      (r) => new Date(r.created_at) >= weekAgo
    ).length;
    const lastWeekRecs = allRecs.filter(
      (r) => new Date(r.created_at) >= twoWeeksAgo && new Date(r.created_at) < weekAgo
    ).length;

    // This week's views/likes (approximate from recs created this week)
    const thisWeekViews = allRecs
      .filter((r) => new Date(r.created_at) >= weekAgo)
      .reduce((sum, r) => sum + (r.view_count || 0), 0);

    // Most popular recs (top 5 by views)
    const topByViews = [...allRecs]
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5);

    // Most liked recs (top 5)
    const topByLikes = [...allRecs]
      .sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
      .slice(0, 5);

    // Average engagement per video
    const avgViews = totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0;
    const avgLikes = totalVideos > 0 ? Math.round((totalLikes / totalVideos) * 10) / 10 : 0;

    const calcChange = (current: number, previous: number) => {
      if (previous === 0 && current === 0) return '—';
      if (previous === 0) return `+${current}`;
      const change = Math.round(((current - previous) / previous) * 100);
      return change >= 0 ? `+${change}%` : `${change}%`;
    };

    return NextResponse.json({
      stats: {
        totalVideos,
        totalViews,
        totalLikes,
        totalDuration,
        avgViews,
        avgLikes,
        thisWeekRecs,
        recsChange: calcChange(thisWeekRecs, lastWeekRecs),
      },
      recommendations: allRecs.map((r) => ({
        id: r.id,
        thumbnailUrl: r.thumbnail_url,
        caption: r.caption,
        captionTag: r.caption_tag,
        durationSeconds: r.duration_seconds,
        viewCount: r.view_count || 0,
        likeCount: r.like_count || 0,
        isPinned: r.is_pinned,
        createdAt: r.created_at,
        author: {
          displayName: (r.profiles as any)?.display_name || 'Anonymous',
          avatarUrl: (r.profiles as any)?.avatar_url || null,
        },
      })),
      topByViews: topByViews.map((r) => ({
        id: r.id,
        caption: r.caption,
        captionTag: r.caption_tag,
        viewCount: r.view_count || 0,
        likeCount: r.like_count || 0,
        author: (r.profiles as any)?.display_name || 'Anonymous',
      })),
      topByLikes: topByLikes.map((r) => ({
        id: r.id,
        caption: r.caption,
        captionTag: r.caption_tag,
        viewCount: r.view_count || 0,
        likeCount: r.like_count || 0,
        author: (r.profiles as any)?.display_name || 'Anonymous',
      })),
    });
  } catch (error) {
    console.error('Error fetching recommendation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendation stats' },
      { status: 500 }
    );
  }
}
