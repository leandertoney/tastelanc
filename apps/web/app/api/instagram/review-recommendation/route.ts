// POST /api/instagram/review-recommendation
// Triggered after a new video recommendation is created.
// Runs AI review on the caption and sets ig_status accordingly.
// Auth: CRON_SECRET or Supabase anon key (mobile app calls with anon key)

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { reviewAndUpdateRecommendation } from '@/lib/instagram/review';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  // Auth check: accept CRON_SECRET or Supabase anon key
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = authHeader?.replace('Bearer ', '');

  const isAuthorized = token === cronSecret || token === anonKey;
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { recommendation_id } = body;
  if (!recommendation_id) {
    return NextResponse.json({ error: 'recommendation_id required' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Fetch the recommendation including video URL and thumbnail
  const { data: rec, error: fetchError } = await supabase
    .from('restaurant_recommendations')
    .select('id, caption, caption_tag, video_url, thumbnail_url, ig_status, restaurant_id, market_id')
    .eq('id', recommendation_id)
    .single();

  if (fetchError || !rec) {
    return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
  }

  if (rec.ig_status !== 'pending') {
    return NextResponse.json({ message: 'Already reviewed', ig_status: rec.ig_status });
  }

  // Run full AI review: caption + audio transcription (Whisper) + visual analysis (GPT-4o)
  const result = await reviewAndUpdateRecommendation(
    supabase,
    rec.id,
    rec.caption,
    rec.caption_tag,
    rec.video_url,
    rec.thumbnail_url
  );

  return NextResponse.json({
    recommendation_id: rec.id,
    approved: result.approved,
    notes: result.notes,
    flags: result.flags,
    transcript: result.transcript || null,
    ig_status: result.approved ? 'ai_approved' : 'rejected',
  });
}
