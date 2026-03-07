// POST /api/instagram/publish-approved
// Called by pg_cron at post time (11:30 AM ET / 5:30 PM ET).
// Finds today's approved post for the given market+slot and publishes it.

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { publishToInstagram, updatePostAfterPublish } from '@/lib/instagram/publish';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const isPgCron = body.source === 'pg_cron';
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isPgCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const marketSlug = body.market_slug || 'lancaster-pa';
  const postSlot = body.post_slot || 'am';
  const supabase = createServiceRoleClient();

  // Get today's date in Eastern time
  const now = new Date();
  const eastern = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const today = eastern; // YYYY-MM-DD format from en-CA locale

  // Get market
  const { data: market } = await supabase
    .from('markets')
    .select('id, slug')
    .eq('slug', marketSlug)
    .single();

  if (!market) {
    return NextResponse.json({ error: `Market not found: ${marketSlug}` }, { status: 404 });
  }

  // Find today's approved post for this slot
  const { data: post } = await supabase
    .from('instagram_posts')
    .select('*')
    .eq('market_id', market.id)
    .eq('post_date', today)
    .eq('post_slot', postSlot)
    .eq('status', 'approved')
    .maybeSingle();

  if (!post) {
    console.log(`[Instagram Publish] No approved ${postSlot} post for ${marketSlug} on ${today}`);
    return NextResponse.json({
      success: true,
      message: `No approved ${postSlot} post for ${today}`,
    });
  }

  // Get Instagram account
  const { data: account } = await supabase
    .from('instagram_accounts')
    .select('*')
    .eq('market_id', market.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!account) {
    console.log(`[Instagram Publish] No Instagram account for ${marketSlug}`);
    return NextResponse.json({
      success: false,
      error: 'No Instagram account configured',
    }, { status: 400 });
  }

  if (account.token_expires_at && new Date(account.token_expires_at) < now) {
    return NextResponse.json({
      success: false,
      error: 'Instagram token expired',
    }, { status: 400 });
  }

  if (!post.media_urls || post.media_urls.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'Post has no media',
    }, { status: 400 });
  }

  console.log(`[Instagram Publish] Publishing ${postSlot} post for ${marketSlug} (${post.content_type})...`);

  let publishResult = await publishToInstagram(account, post.caption, post.media_urls);

  // Retry once on failure
  if (!publishResult.success) {
    console.error(`[Instagram Publish] Failed: ${publishResult.error}. Retrying...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    publishResult = await publishToInstagram(account, post.caption, post.media_urls);
  }

  await updatePostAfterPublish(supabase, post.id, publishResult);

  if (!publishResult.success) {
    console.error(`[Instagram Publish] Failed after retry: ${publishResult.error}`);
    return NextResponse.json({
      success: false,
      post_id: post.id,
      error: publishResult.error,
    }, { status: 500 });
  }

  console.log(`[Instagram Publish] Published! ${publishResult.permalink}`);
  return NextResponse.json({
    success: true,
    post_id: post.id,
    content_type: post.content_type,
    permalink: publishResult.permalink,
  });
}
