// POST /api/instagram/cron
// Combined cron endpoint: generates + publishes an Instagram post for a market.
// This is the main entry point called by pg_cron daily.
// Auth: CRON_SECRET or pg_cron source

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateInstagramPost } from '@/lib/instagram/generate';
import { publishToInstagram, updatePostAfterPublish } from '@/lib/instagram/publish';
import { MarketConfig } from '@/lib/instagram/types';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const isPgCron = body.source === 'pg_cron';
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isPgCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const marketSlug = body.market_slug || 'lancaster-pa';
  const supabase = createServiceRoleClient();

  // Resolve market
  const { data: market, error: marketError } = await supabase
    .from('markets')
    .select('id, slug, name, county, state')
    .eq('slug', marketSlug)
    .eq('is_active', true)
    .single();

  if (marketError || !market) {
    return NextResponse.json({ error: `Market not found: ${marketSlug}` }, { status: 404 });
  }

  // Load Instagram account
  const { data: account } = await supabase
    .from('instagram_accounts')
    .select('*')
    .eq('market_id', market.id)
    .eq('is_active', true)
    .maybeSingle();

  const marketConfig: MarketConfig = {
    market_id: market.id,
    market_slug: market.slug,
    market_name: market.name,
    county: market.county,
    state: market.state,
    instagram_account: account,
  };

  // Step 1: Generate post
  console.log(`[Instagram Cron] Generating post for ${marketSlug}...`);
  const genResult = await generateInstagramPost({
    supabase,
    market: marketConfig,
    date: new Date(),
  });

  if (!genResult.success) {
    console.error(`[Instagram Cron] Generation failed for ${marketSlug}: ${genResult.error}`);
    return NextResponse.json(
      {
        success: false,
        step: 'generate',
        error: genResult.error,
      },
      { status: 500 }
    );
  }

  console.log(`[Instagram Cron] Generated post ${genResult.post_id} (${genResult.content_type})`);

  // Step 2: Publish (only if Instagram account is configured)
  if (!account) {
    console.log(`[Instagram Cron] No Instagram account for ${marketSlug}. Post saved as draft.`);
    return NextResponse.json({
      success: true,
      step: 'generate_only',
      post_id: genResult.post_id,
      content_type: genResult.content_type,
      message: 'Post generated but not published — no Instagram account configured',
    });
  }

  // Check token
  if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
    console.error(`[Instagram Cron] Token expired for ${marketSlug}`);
    return NextResponse.json({
      success: false,
      step: 'publish',
      post_id: genResult.post_id,
      error: 'Instagram token expired',
    }, { status: 400 });
  }

  if (!genResult.media_urls || genResult.media_urls.length === 0) {
    console.log(`[Instagram Cron] No media for post. Saved as draft.`);
    return NextResponse.json({
      success: true,
      step: 'generate_only',
      post_id: genResult.post_id,
      content_type: genResult.content_type,
      message: 'Post generated but no media available for publishing',
    });
  }

  console.log(`[Instagram Cron] Publishing to Instagram...`);
  let publishResult = await publishToInstagram(account, genResult.caption!, genResult.media_urls);

  // Retry once on failure
  if (!publishResult.success) {
    console.error(`[Instagram Cron] Publish failed: ${publishResult.error}. Retrying...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    publishResult = await publishToInstagram(account, genResult.caption!, genResult.media_urls);
  }

  await updatePostAfterPublish(supabase, genResult.post_id!, publishResult);

  if (!publishResult.success) {
    console.error(`[Instagram Cron] Publish failed after retry: ${publishResult.error}`);
    return NextResponse.json({
      success: false,
      step: 'publish',
      post_id: genResult.post_id,
      error: publishResult.error,
    }, { status: 500 });
  }

  console.log(`[Instagram Cron] Published! ${publishResult.permalink}`);
  return NextResponse.json({
    success: true,
    post_id: genResult.post_id,
    content_type: genResult.content_type,
    instagram_media_id: publishResult.instagram_media_id,
    permalink: publishResult.permalink,
  });
}
