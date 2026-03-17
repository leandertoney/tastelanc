// POST /api/instagram/publish-approved
// V2: Unified publish cron. Called every 15 minutes by pg_cron.
// Finds posts where scheduled_publish_at <= now() AND status is 'pending_review' or 'approved'.
// - pending_review = no human action taken → auto-publish (timeout expired)
// - approved = human explicitly approved → publish
// - rejected = human rejected → skip (never publish)
// Also supports the legacy flow (find today's approved post for a specific slot).

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { publishToInstagram, publishToFacebook, updatePostAfterPublish } from '@/lib/instagram/publish';
import { cleanupOldSlides } from '@/lib/instagram/overlay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const isPgCron = body.source === 'pg_cron';
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isPgCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();

  // V2 flow: find ALL posts across all markets that are ready to publish
  // (scheduled_publish_at <= now AND status IN ('pending_review', 'approved'))
  const marketSlug = body.market_slug; // optional — if provided, scope to one market
  const postSlot = body.post_slot; // optional — legacy support

  let query = supabase
    .from('instagram_posts')
    .select('*, market:markets!inner(id, slug)')
    .in('status', ['pending_review', 'approved'])
    .not('scheduled_publish_at', 'is', null)
    .lte('scheduled_publish_at', now.toISOString())
    .order('scheduled_publish_at', { ascending: true })
    .limit(10);

  // If market_slug provided, scope to that market
  if (marketSlug) {
    const { data: market } = await supabase
      .from('markets')
      .select('id')
      .eq('slug', marketSlug)
      .single();

    if (market) {
      query = supabase
        .from('instagram_posts')
        .select('*')
        .eq('market_id', market.id)
        .in('status', ['pending_review', 'approved'])
        .not('scheduled_publish_at', 'is', null)
        .lte('scheduled_publish_at', now.toISOString())
        .order('scheduled_publish_at', { ascending: true })
        .limit(10);
    }
  }

  // Legacy fallback: if post_slot provided and no scheduled_publish_at posts found,
  // fall back to looking for today's approved post by slot
  if (postSlot && marketSlug) {
    const eastern = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    const { data: market } = await supabase
      .from('markets')
      .select('id')
      .eq('slug', marketSlug)
      .single();

    if (market) {
      // Check for scheduled posts first
      const { data: scheduledPosts } = await supabase
        .from('instagram_posts')
        .select('*')
        .eq('market_id', market.id)
        .in('status', ['pending_review', 'approved'])
        .not('scheduled_publish_at', 'is', null)
        .lte('scheduled_publish_at', now.toISOString())
        .limit(5);

      if (scheduledPosts && scheduledPosts.length > 0) {
        // Use scheduled posts (V2 flow)
        return await publishPosts(supabase, scheduledPosts);
      }

      // Legacy fallback: find today's approved post by slot
      const { data: legacyPost } = await supabase
        .from('instagram_posts')
        .select('*')
        .eq('market_id', market.id)
        .eq('post_date', eastern)
        .eq('post_slot', postSlot)
        .eq('status', 'approved')
        .maybeSingle();

      if (legacyPost) {
        return await publishPosts(supabase, [legacyPost]);
      }

      return NextResponse.json({
        success: true,
        message: `No posts ready to publish for ${marketSlug}`,
        published: 0,
      });
    }
  }

  const { data: postsToPublish, error } = await query;

  if (error) {
    console.error('[Instagram Publish] Query error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (!postsToPublish || postsToPublish.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No posts ready to publish',
      published: 0,
    });
  }

  return await publishPosts(supabase, postsToPublish);
}

async function publishPosts(
  supabase: ReturnType<typeof createServiceRoleClient>,
  posts: any[]
) {
  const results: any[] = [];

  for (const post of posts) {
    // Get the market_id to find the Instagram account
    const marketId = post.market_id;

    // Get Instagram account for this market
    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('market_id', marketId)
      .eq('is_active', true)
      .maybeSingle();

    if (!account) {
      console.log(`[Instagram Publish] No Instagram account for market ${marketId}. Skipping.`);
      results.push({ post_id: post.id, status: 'skipped', reason: 'no_account' });
      continue;
    }

    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      console.error(`[Instagram Publish] Token expired for market ${marketId}`);
      results.push({ post_id: post.id, status: 'skipped', reason: 'token_expired' });
      continue;
    }

    if (!post.media_urls || post.media_urls.length === 0) {
      console.log(`[Instagram Publish] No media for post ${post.id}. Skipping.`);
      results.push({ post_id: post.id, status: 'skipped', reason: 'no_media' });
      continue;
    }

    const wasAutoApproved = post.status === 'pending_review';
    console.log(`[Instagram Publish] Publishing post ${post.id} (${wasAutoApproved ? 'auto-approved' : 'human-approved'}, ${post.content_type})...`);

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
      results.push({ post_id: post.id, status: 'failed', error: publishResult.error });
      continue;
    }

    // Cross-post to Facebook Page (fire-and-forget)
    let facebookPostId: string | undefined;
    try {
      const fbResult = await publishToFacebook(account, post.caption, post.media_urls);
      if (fbResult.success) {
        facebookPostId = fbResult.facebook_post_id;
        console.log(`[Instagram Publish] Cross-posted to Facebook: ${facebookPostId}`);
      }
    } catch (err: any) {
      console.error(`[Instagram Publish] Facebook error: ${err.message}`);
    }

    console.log(`[Instagram Publish] Published! ${publishResult.permalink}`);
    results.push({
      post_id: post.id,
      status: 'published',
      auto_approved: wasAutoApproved,
      permalink: publishResult.permalink,
      facebook_post_id: facebookPostId,
    });
  }

  return NextResponse.json({
    success: true,
    published: results.filter(r => r.status === 'published').length,
    results,
  });
}
