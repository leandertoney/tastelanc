// POST /api/instagram/review-recommendation
// Triggered after a new video recommendation is created.
// Runs AI review on the caption and sets ig_status accordingly.
// Auth: CRON_SECRET or Supabase anon key (mobile app calls with anon key)

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { reviewAndUpdateRecommendation } from '@/lib/instagram/review';
import { sendEmail } from '@/lib/resend';

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

  // Fetch the recommendation including video URL, thumbnail, restaurant name, and poster name
  const { data: rec, error: fetchError } = await supabase
    .from('restaurant_recommendations')
    .select('id, caption, caption_tag, video_url, thumbnail_url, ig_status, restaurant_id, market_id, user_id, restaurant:restaurants!inner(name), poster:profiles!user_id(display_name)')
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

  // Notify admin so the queue doesn't back up
  const restaurantName = (rec.restaurant as any)?.name || 'Unknown Restaurant';
  const posterName = (rec.poster as any)?.display_name || 'Anonymous';
  const queueUrl = 'https://tastelanc.com/admin/recommendation-queue';
  const statusColor = result.approved ? '#22c55e' : '#ef4444';
  const statusLabel = result.approved ? '✅ AI Approved — needs your sign-off' : '❌ AI Rejected — review if needed';

  await sendEmail({
    to: 'leandertoney@gmail.com',
    subject: `New rec needs review: ${restaurantName} by ${posterName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#111;color:#eee;border-radius:12px;overflow:hidden;">
        <div style="background:#1a1a1a;padding:24px 28px;border-bottom:1px solid #333;">
          <p style="margin:0;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:1px;">Recommendation Queue</p>
          <h2 style="margin:6px 0 0;font-size:20px;">${restaurantName}</h2>
          <p style="margin:4px 0 0;color:#aaa;font-size:14px;">Posted by ${posterName}</p>
        </div>
        ${rec.thumbnail_url ? `<img src="${rec.thumbnail_url}" style="width:100%;max-height:280px;object-fit:cover;display:block;" />` : ''}
        <div style="padding:24px 28px;">
          ${rec.caption ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;">"${rec.caption}"</p>` : ''}
          <div style="background:#1e1e1e;border-left:3px solid ${statusColor};border-radius:4px;padding:12px 16px;margin-bottom:20px;">
            <p style="margin:0;font-size:14px;font-weight:600;color:${statusColor};">${statusLabel}</p>
            ${result.notes ? `<p style="margin:8px 0 0;font-size:13px;color:#bbb;">${result.notes}</p>` : ''}
          </div>
          <a href="${queueUrl}" style="display:inline-block;background:#f97316;color:#fff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">Open Recommendation Queue →</a>
        </div>
      </div>
    `,
  }).catch((err) => {
    // Non-fatal — don't fail the review if email fails
    console.error('[review-recommendation] Failed to send admin notification:', err);
  });

  return NextResponse.json({
    recommendation_id: rec.id,
    approved: result.approved,
    notes: result.notes,
    flags: result.flags,
    transcript: result.transcript || null,
    ig_status: result.approved ? 'ai_approved' : 'rejected',
  });
}
