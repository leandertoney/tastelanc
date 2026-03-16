// POST /api/instagram/cron
// Combined cron endpoint: generates an Instagram post for a market.
// V2: Uses weekly content calendar (M-F, 1 post/day) with approval flow.
// Posts are created as 'pending_review' with a scheduled_publish_at time.
// A separate publish cron auto-publishes if no human rejects within the timeout.
// Auth: CRON_SECRET or pg_cron source

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateInstagramPost } from '@/lib/instagram/generate';
import { MarketConfig } from '@/lib/instagram/types';
import { cleanupOldSlides } from '@/lib/instagram/overlay';
import {
  getThemeForDay,
  DEFAULT_PUBLISH_HOUR_ET,
  DEFAULT_PUBLISH_MINUTE_ET,
} from '@/lib/instagram/prompts';

/**
 * Compute the scheduled publish time in UTC for a given date.
 * Default: 11:30 AM ET on the target date.
 * Can be overridden with scheduled_publish_at in the request body.
 */
function computeScheduledPublishAt(
  targetDate: Date,
  overrideIso?: string
): string {
  if (overrideIso) return overrideIso;

  // Build 11:30 AM ET for the target date
  const dateStr = targetDate.toISOString().split('T')[0];
  // Use Intl to figure out the current ET offset
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'shortOffset',
  });
  const parts = etFormatter.formatToParts(targetDate);
  const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT-5';
  // Parse offset like "GMT-5" or "GMT-4"
  const offsetMatch = offsetPart.match(/GMT([+-]\d+)/);
  const etOffsetHours = offsetMatch ? parseInt(offsetMatch[1]) : -5;

  // Convert 11:30 AM ET to UTC
  const utcHour = DEFAULT_PUBLISH_HOUR_ET - etOffsetHours;
  const publishAt = new Date(`${dateStr}T${String(utcHour).padStart(2, '0')}:${String(DEFAULT_PUBLISH_MINUTE_ET).padStart(2, '0')}:00.000Z`);
  return publishAt.toISOString();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const isPgCron = body.source === 'pg_cron';
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isPgCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const marketSlug = body.market_slug || 'lancaster-pa';
  const previewOnly = body.preview_only === true;
  const postSlot = body.post_slot || 'am';
  const targetDate = body.target_date ? new Date(body.target_date + 'T12:00:00') : new Date();
  const supabase = createServiceRoleClient();

  // Determine content type from weekly calendar or force override
  const theme = body.force_type ? null : getThemeForDay(targetDate);
  const forceType = body.force_type || theme?.contentType || undefined;
  const forceSubtype = body.force_subtype || theme?.forceSubtype || undefined;
  const dayTheme = body.day_theme || theme?.theme || undefined;

  // Compute scheduled publish time
  const scheduledPublishAt = body.scheduled_publish_at
    ? body.scheduled_publish_at
    : (previewOnly ? undefined : computeScheduledPublishAt(targetDate, body.scheduled_publish_at));

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

  // Generate post
  console.log(`[Instagram Cron] Generating post for ${marketSlug} (date: ${targetDate.toISOString().split('T')[0]}, theme: ${dayTheme || 'auto'})...`);
  const genResult = await generateInstagramPost({
    supabase,
    market: marketConfig,
    date: targetDate,
    forceType,
    forceSubtype,
    postSlot,
    scheduledPublishAt,
    dayTheme,
  });

  if (!genResult.success) {
    console.error(`[Instagram Cron] Generation failed for ${marketSlug}: ${genResult.error}`);
    return NextResponse.json(
      { success: false, step: 'generate', error: genResult.error },
      { status: 500 }
    );
  }

  console.log(`[Instagram Cron] Generated post ${genResult.post_id} (${genResult.content_type}, scheduled: ${scheduledPublishAt || 'none'})`);

  // In the new approval flow, we never auto-publish from this endpoint.
  // The publish-approved cron handles publishing at the scheduled time.
  // If preview_only, just return the preview.
  if (previewOnly) {
    console.log(`[Instagram Cron] Preview mode — skipping publish.`);
    return NextResponse.json({
      success: true,
      step: 'preview',
      post_id: genResult.post_id,
      content_type: genResult.content_type,
      media_urls: genResult.media_urls,
      caption: genResult.caption,
      scheduled_publish_at: scheduledPublishAt,
      day_theme: dayTheme,
      message: 'Post generated as pending_review — will auto-publish at scheduled time unless rejected',
    });
  }

  // For backward compatibility: if no scheduled_publish_at, use the old immediate-publish flow
  if (!scheduledPublishAt) {
    if (!account) {
      return NextResponse.json({
        success: true,
        step: 'generate_only',
        post_id: genResult.post_id,
        content_type: genResult.content_type,
        message: 'Post generated but not published — no Instagram account configured',
      });
    }

    // This path is for legacy/manual calls only
    return NextResponse.json({
      success: true,
      step: 'scheduled',
      post_id: genResult.post_id,
      content_type: genResult.content_type,
      scheduled_publish_at: scheduledPublishAt,
      day_theme: dayTheme,
      message: 'Post generated — awaiting publish cron or manual action',
    });
  }

  // Fire-and-forget: clean up old composited slides
  cleanupOldSlides(supabase, marketSlug).catch(err =>
    console.error(`[Instagram Cron] Slide cleanup failed: ${err.message}`)
  );

  return NextResponse.json({
    success: true,
    step: 'scheduled',
    post_id: genResult.post_id,
    content_type: genResult.content_type,
    scheduled_publish_at: scheduledPublishAt,
    day_theme: dayTheme,
    message: 'Post generated as pending_review — will auto-publish at scheduled time unless rejected',
  });
}
