// POST /api/instagram/spotlight/cron
// Advance-generation spotlight pipeline. Called weekly by pg_cron on Saturday at 8 AM ET.
//
// On each run, it scans the next 14 days for empty Sat (elite) and Sun (premium) spotlight
// slots and fills them in — giving you a 2-week preview to review once a week.
//
// Per-slot flow:
//   1. Select highest-scoring restaurant for the given tier
//   2. Generate the spotlight post (slides + caption)
//   3. Run AI quality check
//   4. If pass → set scheduled_publish_at to 11:30 AM ET on that date → auto-publishes
//   5. If fail → extract correction hints → retry (max 3 attempts)
//   6. If 3 strikes → mark status = 'abandoned' → log to notification_logs
//
// Auth: CRON_SECRET header or body.source = 'pg_cron'
// maxDuration = 300s — covers a single full generate+retry cycle. The Netlify function
// calls this route once per slot sequentially (see netlify/functions/spotlight-advance.ts).

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateRestaurantSpotlight } from '@/lib/instagram/generate';
import { fetchSpotlightCandidates } from '@/lib/instagram/scoring';
import { runQualityCheck, QualityFailure } from '@/lib/instagram/quality';
import { logSpotlightOutcome } from '@/lib/instagram/spotlight-summary';
import { MarketConfig } from '@/lib/instagram/types';
import { getAppName } from '@/lib/instagram/prompts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300; // 5 minutes — covers 3 full generate+check cycles

const MAX_RETRIES = 3;

// 11:30 AM ET → 16:30 UTC (covers both EST and EDT close enough)
const PUBLISH_HOUR_UTC = 16;
const PUBLISH_MINUTE_UTC = 30;

// Day of week → tier mapping (0=Sun, 6=Sat)
const DOW_TIER: Record<number, 'elite' | 'premium'> = {
  6: 'elite',    // Saturday
  0: 'premium',  // Sunday
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const isPgCron = body.source === 'pg_cron';
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isPgCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const marketSlug: string = body.market_slug ?? 'lancaster-pa';

  // Allow forcing a specific date + tier (used for manual override from admin calendar)
  const forceDate: string | null = body.date ?? null;      // YYYY-MM-DD
  const forceTier: 'elite' | 'premium' | null = body.tier === 'elite' ? 'elite'
    : body.tier === 'premium' ? 'premium'
    : null;

  const supabase = createServiceRoleClient();

  // Resolve market
  const { data: market, error: marketErr } = await supabase
    .from('markets')
    .select('id, slug, name, county, state')
    .eq('slug', marketSlug)
    .eq('is_active', true)
    .single();

  if (marketErr || !market) {
    return NextResponse.json({ error: `Market not found: ${marketSlug}` }, { status: 404 });
  }

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

  const appName = getAppName(marketSlug);

  // ── Build the list of slots to fill ──────────────────────────────────────────
  // If a specific date+tier was forced (manual admin override), just do that one.
  // Otherwise, scan the next 14 days for all Sat/Sun slots that don't yet have a post.

  interface SlotTarget {
    date: Date;
    dateStr: string;
    tier: 'elite' | 'premium';
    publishAt: Date;
  }

  let slotsToFill: SlotTarget[] = [];

  if (forceDate && forceTier) {
    const d = new Date(forceDate + 'T12:00:00Z');
    const publishAt = new Date(forceDate + 'T00:00:00Z');
    publishAt.setUTCHours(PUBLISH_HOUR_UTC, PUBLISH_MINUTE_UTC, 0, 0);
    slotsToFill = [{ date: d, dateStr: forceDate, tier: forceTier, publishAt }];
  } else {
    // Find all Sat/Sun in the next 14 days
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dow = d.getUTCDay();
      if (dow !== 0 && dow !== 6) continue;

      const tier = DOW_TIER[dow];
      const dateStr = d.toISOString().split('T')[0];

      // Check if this slot already has a non-abandoned post
      const { data: existing } = await supabase
        .from('instagram_posts')
        .select('id, status')
        .eq('market_id', market.id)
        .eq('post_date', dateStr)
        .eq('content_type', 'restaurant_spotlight')
        .neq('status', 'abandoned')
        .maybeSingle();

      if (existing) {
        console.log(`[SpotlightCron] Slot ${dateStr} (${tier}) already filled — skipping`);
        continue;
      }

      const publishAt = new Date(dateStr + 'T00:00:00Z');
      publishAt.setUTCHours(PUBLISH_HOUR_UTC, PUBLISH_MINUTE_UTC, 0, 0);

      slotsToFill.push({ date: d, dateStr, tier, publishAt });
    }
  }

  if (slotsToFill.length === 0) {
    return NextResponse.json({
      success: true,
      outcome: 'all_slots_filled',
      message: 'All Sat/Sun spotlight slots for the next 14 days are already filled',
    });
  }

  console.log(`[SpotlightCron] Filling ${slotsToFill.length} slot(s): ${slotsToFill.map(s => `${s.dateStr}(${s.tier})`).join(', ')}`);

  // Process each slot sequentially
  const results: Array<{
    date: string;
    tier: 'elite' | 'premium';
    outcome: 'scheduled' | 'abandoned' | 'no_candidates';
    restaurant_name: string | null;
    post_id: string | null;
    quality_score?: number;
    retry_count: number;
    failure_reasons: string[];
  }> = [];

  // Cache candidates per tier to avoid re-fetching for every slot
  const candidateCache: Partial<Record<'elite' | 'premium', any[]>> = {};

  for (const slot of slotsToFill) {
    const { date, dateStr, tier, publishAt } = slot;
    const todayStr = dateStr;
    const scheduledPublishAt = publishAt.toISOString();

    // Fetch candidates for this tier (cached)
    if (!candidateCache[tier]) {
      const allCandidates = await fetchSpotlightCandidates(supabase, market.id);
      candidateCache[tier] = allCandidates.filter(c => c.tier_name === tier);
    }
    const tierCandidates = candidateCache[tier]!;

    if (tierCandidates.length === 0) {
      await logSpotlightOutcome(supabase, {
        market_slug: marketSlug,
        tier,
        restaurant_name: null,
        restaurant_id: null,
        outcome: 'abandoned',
        retry_count: 0,
        failure_reasons: [`No active ${tier} restaurants found for market ${marketSlug}`],
        post_id: null,
        post_date: todayStr,
      });
      results.push({
        date: dateStr, tier, outcome: 'no_candidates',
        restaurant_name: null, post_id: null, retry_count: 0, failure_reasons: [`No ${tier} candidates`],
      });
      continue;
    }

    // Pick the top candidate for this slot — rotate through candidates so we don't always
    // pick the same restaurant. The scoring function already de-prioritizes recently featured
    // restaurants, so the top candidate is the right pick.
    const targetRestaurantId = tierCandidates[0].restaurant_id;
    const targetRestaurantName = tierCandidates[0].restaurant_name;

    const slotResult = await runSpotlightPipeline({
      supabase,
      market: marketConfig,
      date,
      dateStr: todayStr,
      tier,
      targetRestaurantId,
      targetRestaurantName,
      scheduledPublishAt,
      marketSlug,
      appName,
    });

    results.push(slotResult);

    // Invalidate candidate cache after each successful schedule so the next slot
    // picks a different restaurant (scoring de-prioritizes recently used ones)
    if (slotResult.outcome === 'scheduled') {
      delete candidateCache[tier];
    }
  }

  const scheduled = results.filter(r => r.outcome === 'scheduled').length;
  const abandoned = results.filter(r => r.outcome === 'abandoned').length;

  return NextResponse.json({
    success: true,
    slots_processed: slotsToFill.length,
    scheduled,
    abandoned,
    results,
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Self-correcting pipeline for a single slot
// ──────────────────────────────────────────────────────────────────────────────

interface PipelineOpts {
  supabase: ReturnType<typeof createServiceRoleClient>;
  market: MarketConfig;
  date: Date;
  dateStr: string;
  tier: 'elite' | 'premium';
  targetRestaurantId: string;
  targetRestaurantName: string;
  scheduledPublishAt: string;
  marketSlug: string;
  appName: string;
}

async function runSpotlightPipeline(opts: PipelineOpts) {
  const {
    supabase, market, date, dateStr, tier,
    targetRestaurantId, targetRestaurantName,
    scheduledPublishAt, marketSlug, appName,
  } = opts;

  let attempt = 0;
  let lastPostId: string | null = null;
  let captionHints: string[] = [];
  let excludeEntityIds: string[] = [];
  let skipPhotoIds: string[] = [];
  const allFailureReasons: string[] = [];

  while (attempt < MAX_RETRIES) {
    attempt++;
    console.log(`[SpotlightCron] ${dateStr} ${tier} — attempt ${attempt}/${MAX_RETRIES} — ${targetRestaurantName}`);

    const result = await generateRestaurantSpotlight({
      supabase,
      market,
      date,
      restaurantId: targetRestaurantId,
      scheduledPublishAt,
      captionHints: captionHints.length > 0 ? captionHints : undefined,
      excludeEntityIds: excludeEntityIds.length > 0 ? excludeEntityIds : undefined,
      skipPhotoIds: skipPhotoIds.length > 0 ? skipPhotoIds : undefined,
    });

    if (!result.success || !result.post_id) {
      const reason = result.error ?? 'Generation failed';
      console.error(`[SpotlightCron] Generation failed on attempt ${attempt}: ${reason}`);
      allFailureReasons.push(`Attempt ${attempt}: ${reason}`);
      if (lastPostId) await updateRetryTracking(supabase, lastPostId, attempt, reason, false);
      captionHints = [];
      continue;
    }

    lastPostId = result.post_id;

    const qr = await runQualityCheck(
      {
        id: result.post_id,
        caption: result.caption ?? '',
        media_urls: result.media_urls ?? [],
        generation_metadata: { spotlight_restaurant_id: targetRestaurantId },
      },
      {
        id: targetRestaurantId,
        name: targetRestaurantName,
        market_slug: marketSlug,
        app_name: appName,
      },
      supabase
    );

    console.log(`[SpotlightCron] Quality check: ${qr.passed ? 'PASSED' : 'FAILED'} (score ${qr.score}) — attempt ${attempt}`);

    if (qr.passed) {
      await updateRetryTracking(supabase, result.post_id, attempt, null, true);
      await logSpotlightOutcome(supabase, {
        market_slug: marketSlug,
        tier,
        restaurant_name: targetRestaurantName,
        restaurant_id: targetRestaurantId,
        outcome: 'scheduled',
        retry_count: attempt - 1,
        failure_reasons: allFailureReasons,
        post_id: result.post_id,
        post_date: dateStr,
      });
      return {
        date: dateStr,
        tier,
        outcome: 'scheduled' as const,
        restaurant_name: targetRestaurantName,
        post_id: result.post_id,
        quality_score: qr.score,
        retry_count: attempt - 1,
        failure_reasons: allFailureReasons,
      };
    }

    const failureReasonStr = qr.failures.map((f: QualityFailure) => f.description).join('; ');
    allFailureReasons.push(`Attempt ${attempt} (score ${qr.score}): ${failureReasonStr}`);
    await updateRetryTracking(supabase, result.post_id, attempt, failureReasonStr, false);

    captionHints = [...captionHints, ...qr.caption_suggestions];
    for (const failure of qr.failures) {
      if (failure.bad_entity_ids) {
        excludeEntityIds = [...new Set([...excludeEntityIds, ...failure.bad_entity_ids])];
      }
      if (failure.bad_photo_ids) {
        skipPhotoIds = [...new Set([...skipPhotoIds, ...failure.bad_photo_ids])];
      }
    }

    if (attempt >= MAX_RETRIES) break;
  }

  // 3 strikes — mark as abandoned
  if (lastPostId) {
    await supabase
      .from('instagram_posts')
      .update({ status: 'abandoned', retry_count: MAX_RETRIES })
      .eq('id', lastPostId);
  }

  await logSpotlightOutcome(supabase, {
    market_slug: marketSlug,
    tier,
    restaurant_name: targetRestaurantName,
    restaurant_id: targetRestaurantId,
    outcome: 'abandoned',
    retry_count: MAX_RETRIES,
    failure_reasons: allFailureReasons,
    post_id: lastPostId,
    post_date: dateStr,
  });

  console.error(`[SpotlightCron] Abandoned after ${MAX_RETRIES} attempts for ${targetRestaurantName} (${dateStr})`);

  return {
    date: dateStr,
    tier,
    outcome: 'abandoned' as const,
    restaurant_name: targetRestaurantName,
    post_id: lastPostId,
    retry_count: MAX_RETRIES,
    failure_reasons: allFailureReasons,
  };
}

// Update retry_count and retry_log on the instagram_posts row
async function updateRetryTracking(
  supabase: ReturnType<typeof createServiceRoleClient>,
  postId: string,
  attempt: number,
  failureReason: string | null,
  passed: boolean
): Promise<void> {
  const { data: existing } = await supabase
    .from('instagram_posts')
    .select('retry_log')
    .eq('id', postId)
    .single();

  const currentLog: any[] = (existing?.retry_log as any[]) ?? [];
  const newEntry = {
    attempt,
    passed,
    failure_reason: failureReason,
    checked_at: new Date().toISOString(),
  };

  await supabase
    .from('instagram_posts')
    .update({
      retry_count: attempt,
      retry_log: [...currentLog, newEntry],
    })
    .eq('id', postId);
}
