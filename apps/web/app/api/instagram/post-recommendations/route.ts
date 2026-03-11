// POST /api/instagram/post-recommendations
// Cron job: finds AI-approved recommendations whose 30-min countdown has expired
// and publishes them as Instagram Reels.
// Auth: CRON_SECRET or pg_cron

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { publishReelToInstagram } from '@/lib/instagram/publish';
import { getAppName, getMarketDisplayName } from '@/lib/instagram/prompts';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const isPgCron = body.source === 'pg_cron';
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isPgCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  // Find all recommendations ready to post:
  // - ig_status is 'ai_approved' or 'admin_approved'
  // - ig_scheduled_at has passed (or admin_approved posts immediately)
  const { data: readyRecs, error: fetchError } = await supabase
    .from('restaurant_recommendations')
    .select(`
      id, video_url, thumbnail_url, caption, caption_tag, market_id, restaurant_id, ig_status,
      ig_caption_override,
      restaurant:restaurants!inner(name, market:markets!inner(slug, name))
    `)
    .or('ig_status.eq.ai_approved,ig_status.eq.admin_approved')
    .lte('ig_scheduled_at', now);

  if (fetchError) {
    console.error('Error fetching ready recommendations:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }

  if (!readyRecs || readyRecs.length === 0) {
    return NextResponse.json({ message: 'No recommendations ready to post', posted: 0 });
  }

  const results: Array<{ id: string; success: boolean; error?: string; permalink?: string }> = [];

  for (const rec of readyRecs) {
    const restaurant = rec.restaurant as any;
    const marketSlug = restaurant?.market?.slug || 'lancaster-pa';
    const restaurantName = restaurant?.name || 'a local spot';
    const appName = getAppName(marketSlug);
    const marketName = getMarketDisplayName(marketSlug);

    // Get the Instagram account for this market
    const { data: igAccount } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('market_id', rec.market_id)
      .eq('is_active', true)
      .single();

    if (!igAccount) {
      console.warn(`No active Instagram account for market ${rec.market_id}, skipping rec ${rec.id}`);
      results.push({ id: rec.id, success: false, error: 'No Instagram account for market' });
      continue;
    }

    // Build caption for Instagram
    const TAG_LABELS: Record<string, string> = {
      must_try_dish: 'Must-Try Dish',
      best_vibes: 'Best Vibes',
      hidden_gem: 'Hidden Gem',
      date_night: 'Date Night',
      great_value: 'Great Value',
      best_drinks: 'Best Drinks',
      family_friendly: 'Family Friendly',
      late_night: 'Late Night Spot',
    };

    const tagLabel = rec.caption_tag ? TAG_LABELS[rec.caption_tag] : null;
    const igCaption = rec.ig_caption_override || buildReelCaption({
      restaurantName,
      caption: rec.caption,
      tagLabel,
      appName,
      marketName,
      marketSlug,
    });

    // Publish as Reel
    const publishResult = await publishReelToInstagram(
      igAccount,
      igCaption,
      rec.video_url,
      rec.thumbnail_url || undefined
    );

    if (publishResult.success) {
      await supabase
        .from('restaurant_recommendations')
        .update({
          ig_status: 'posted',
          ig_post_id: publishResult.instagram_media_id,
        })
        .eq('id', rec.id);
    } else {
      // Mark as failed but keep it reviewable — don't lose the rec
      await supabase
        .from('restaurant_recommendations')
        .update({
          ig_status: 'pending',
          ai_review_notes: `Post failed: ${publishResult.error}. Reset to pending for retry.`,
          ig_scheduled_at: null,
        })
        .eq('id', rec.id);
    }

    results.push({
      id: rec.id,
      success: publishResult.success,
      error: publishResult.error,
      permalink: publishResult.permalink,
    });
  }

  const posted = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return NextResponse.json({
    message: `Posted ${posted} reel(s), ${failed} failed`,
    posted,
    failed,
    results,
  });
}

function buildReelCaption(ctx: {
  restaurantName: string;
  caption: string | null;
  tagLabel: string | null;
  appName: string;
  marketName: string;
  marketSlug: string;
}): string {
  const lines: string[] = [];

  // Tag line
  if (ctx.tagLabel) {
    lines.push(`${ctx.tagLabel} at ${ctx.restaurantName}`);
  } else {
    lines.push(`Check out ${ctx.restaurantName}`);
  }

  // User's caption
  if (ctx.caption) {
    lines.push('');
    lines.push(ctx.caption);
  }

  // CTA
  lines.push('');
  lines.push(`Discover more on ${ctx.appName} — link in bio`);

  // Hashtags
  const marketTag = ctx.marketName.replace(/\s+/g, '');
  lines.push('');
  lines.push(`#${ctx.appName} #${marketTag}PA #LocalFood #FoodRecommendation`);

  return lines.join('\n');
}
