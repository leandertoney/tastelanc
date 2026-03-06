// POST /api/instagram/publish
// Publishes a draft Instagram post to Instagram Graph API.
// Auth: CRON_SECRET or pg_cron source

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

  const postId = body.post_id as string | undefined;
  const marketSlug = body.market_slug as string | undefined;

  const supabase = createServiceRoleClient();

  // Find the post to publish
  let postQuery = supabase
    .from('instagram_posts')
    .select('*')
    .eq('status', 'draft');

  if (postId) {
    postQuery = postQuery.eq('id', postId);
  } else if (marketSlug) {
    // Find today's draft for this market
    const { data: market } = await supabase
      .from('markets')
      .select('id')
      .eq('slug', marketSlug)
      .single();

    if (!market) {
      return NextResponse.json({ error: `Market not found: ${marketSlug}` }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];
    postQuery = postQuery.eq('market_id', market.id).eq('post_date', today);
  }

  const { data: post, error: postError } = await postQuery.maybeSingle();

  if (postError || !post) {
    return NextResponse.json(
      { success: false, error: 'No draft post found to publish' },
      { status: 404 }
    );
  }

  // Get the Instagram account for this market
  const { data: account, error: accountError } = await supabase
    .from('instagram_accounts')
    .select('*')
    .eq('market_id', post.market_id)
    .eq('is_active', true)
    .single();

  if (accountError || !account) {
    await updatePostAfterPublish(supabase, post.id, {
      success: false,
      error: 'No active Instagram account configured for this market',
    });
    return NextResponse.json(
      { success: false, error: 'No Instagram account configured' },
      { status: 400 }
    );
  }

  // Check token expiry
  if (account.token_expires_at) {
    const expiresAt = new Date(account.token_expires_at);
    if (expiresAt < new Date()) {
      await updatePostAfterPublish(supabase, post.id, {
        success: false,
        error: 'Instagram access token has expired. Run token refresh.',
      });
      return NextResponse.json(
        { success: false, error: 'Access token expired' },
        { status: 400 }
      );
    }
  }

  if (!post.media_urls || post.media_urls.length === 0) {
    await updatePostAfterPublish(supabase, post.id, {
      success: false,
      error: 'Post has no media URLs',
    });
    return NextResponse.json(
      { success: false, error: 'No media URLs on post' },
      { status: 400 }
    );
  }

  // Publish to Instagram
  const result = await publishToInstagram(account, post.caption, post.media_urls);

  // Update post record
  await updatePostAfterPublish(supabase, post.id, result);

  // If failed, retry once
  if (!result.success) {
    console.error(`Instagram publish failed for post ${post.id}: ${result.error}. Retrying...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const retryResult = await publishToInstagram(account, post.caption, post.media_urls);
    await updatePostAfterPublish(supabase, post.id, retryResult);

    if (!retryResult.success) {
      return NextResponse.json(
        { success: false, error: `Publish failed after retry: ${retryResult.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      retried: true,
      instagram_media_id: retryResult.instagram_media_id,
      permalink: retryResult.permalink,
    });
  }

  return NextResponse.json({
    success: true,
    instagram_media_id: result.instagram_media_id,
    permalink: result.permalink,
  });
}
