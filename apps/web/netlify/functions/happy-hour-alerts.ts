import type { Config, Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { validateMarketScope } from '../../lib/notifications/market-guard';
import { sendNotification } from '../../lib/notifications/gateway';

// Market app_slug is now read from the `markets` table instead of hardcoded here.

// Tier IDs that get push notification features
const PAID_TIER_IDS = [
  '00000000-0000-0000-0000-000000000002', // premium
  '00000000-0000-0000-0000-000000000003', // elite
];

/**
 * Happy Hour Alerts Netlify Scheduled Function
 *
 * Queries happy hours for the day, checks the trigger window, builds messages,
 * and sends through the centralized gateway (which handles quiet hours, dedup,
 * throttle, and logging automatically).
 */
export default async function handler(req: Request, context: Context) {
  console.log('[Happy Hour Alerts] Checking for daily digest...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Resolve market
    const marketSlug = process.env.NEXT_PUBLIC_MARKET_SLUG || 'lancaster-pa';
    const { data: marketRow } = await supabase
      .from('markets').select('id, app_slug').eq('slug', marketSlug).eq('is_active', true).single();
    if (!marketRow) {
      console.error(`[Happy Hour Alerts] Market "${marketSlug}" not found`);
      return new Response(
        JSON.stringify({ sent: 0, error: 'Market not found' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const marketId = marketRow.id;

    const now = new Date();
    const dayOfWeek = now
      .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' })
      .toLowerCase();

    // Get current time in ET
    const currentTimeET = now.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    console.log(`[Happy Hour Alerts] Day: ${dayOfWeek}, Time ET: ${currentTimeET}`);

    // Find ALL happy hours for today for paid tier restaurants (scoped to market)
    const { data: happyHours, error: hhError } = await supabase
      .from('happy_hours')
      .select(
        `
        id,
        name,
        description,
        start_time,
        end_time,
        restaurant:restaurants!inner(id, name, tier_id)
      `
      )
      .eq('restaurant.market_id', marketId)
      .eq('is_active', true)
      .contains('days_of_week', [dayOfWeek]);

    if (hhError) {
      console.error('[Happy Hour Alerts] Error fetching happy hours:', hhError);
      throw hhError;
    }

    const allHappyHours = happyHours || [];

    // Filter to only paid tier restaurants — used to decide whether to send
    const paidHappyHours = allHappyHours.filter((hh: any) =>
      PAID_TIER_IDS.includes(hh.restaurant?.tier_id)
    );

    if (paidHappyHours.length === 0) {
      console.log('[Happy Hour Alerts] No happy hours today for paid restaurants');
      return new Response(
        JSON.stringify({ sent: 0, message: 'No happy hours today' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the earliest happy hour start time (across all, for trigger window)
    const earliestStartTime = allHappyHours
      .map((hh: any) => hh.start_time as string)
      .sort()[0]; // HH:MM:SS format sorts lexically

    // Calculate 30 minutes before the earliest happy hour
    const [ehh, emm] = earliestStartTime.split(':').map(Number);
    const earliestMinutes = ehh * 60 + emm;
    const triggerMinutes = earliestMinutes - 30;

    // Current time in minutes
    const [chh, cmm] = currentTimeET.split(':').map(Number);
    const currentMinutes = chh * 60 + cmm;

    console.log(
      `[Happy Hour Alerts] Earliest HH: ${earliestStartTime}, ` +
      `trigger at: ${Math.floor(triggerMinutes / 60)}:${String(triggerMinutes % 60).padStart(2, '0')}, ` +
      `current: ${currentTimeET}`
    );

    // Only send within the trigger window: 30 min before earliest HH to 2 hours after
    if (currentMinutes < triggerMinutes) {
      console.log('[Happy Hour Alerts] Too early, waiting for trigger time');
      return new Response(
        JSON.stringify({ sent: 0, message: 'Waiting for trigger time' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const maxTriggerMinutes = triggerMinutes + 120; // 2-hour send window
    if (currentMinutes > maxTriggerMinutes) {
      console.log(`[Happy Hour Alerts] Past send window (trigger was ${Math.floor(triggerMinutes / 60)}:${String(triggerMinutes % 60).padStart(2, '0')}, now ${currentTimeET})`);
      return new Response(
        JSON.stringify({ sent: 0, message: 'Past send window' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Only send to push tokens for this market's app
    const targetAppSlug = marketRow.app_slug || 'tastelanc';
    console.log(`[Happy Hour Alerts] Targeting app_slug: ${targetAppSlug} for market: ${marketSlug}`);

    const { data: tokenData, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('app_slug', targetAppSlug);

    if (tokenError || !tokenData || tokenData.length === 0) {
      console.log(`[Happy Hour Alerts] No push tokens for ${targetAppSlug}`);
      return new Response(
        JSON.stringify({ sent: 0, message: `No push tokens for ${targetAppSlug}` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tokens = tokenData.map(t => t.token);

    // Market guard: validate scoping before sending
    const guard = await validateMarketScope(marketSlug, targetAppSlug, tokens.length, 'happy_hour_daily_digest');
    if (!guard.valid) {
      console.error(`[Happy Hour Alerts] ${guard.error}`);
      return new Response(
        JSON.stringify({ sent: 0, error: guard.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Deduplicate restaurant names across ALL happy hours (not just paid)
    // so the notification count matches what users see in the app
    const restaurantNames = Array.from(
      new Set(allHappyHours.map((hh: any) => hh.restaurant.name as string))
    );
    const count = restaurantNames.length;

    let title: string;
    let body: string;

    if (count === 1) {
      title = `Happy Hour at ${restaurantNames[0]}!`;
      body = 'Tap to see the details';
    } else {
      title = `${count} Happy Hours Today!`;
      body = "Tap to see what's happening near you";
    }

    // Build messages and send through the gateway
    // Gateway enforces: quiet hours, dedup (via dedupKey), throttle, and logging
    const etDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default' as const,
      title,
      body,
      data: { screen: 'HappyHours' },
    }));

    console.log(`[Happy Hour Alerts] Sending ${messages.length} messages via gateway for ${targetAppSlug}`);

    const gw = await sendNotification({
      notificationType: 'happy_hour_daily_digest',
      marketSlug,
      messages,
      dedupKey: `hh_digest:${marketSlug}:${etDateStr}`,
      details: {
        market_slug: marketSlug,
        app_slug: targetAppSlug,
        restaurants: restaurantNames,
        happy_hour_count: allHappyHours.length,
        paid_happy_hour_count: paidHappyHours.length,
        earliest_start: earliestStartTime,
        day: dayOfWeek,
      },
    });

    if (gw.blocked) {
      console.log(`[Happy Hour Alerts] Blocked by gateway: ${gw.blockReason}`);
      return new Response(
        JSON.stringify({ sent: 0, message: gw.blockReason }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Happy Hour Alerts] Sent ${gw.sent}/${gw.total} notifications`);

    return new Response(
      JSON.stringify({ sent: gw.sent, restaurants: restaurantNames }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Happy Hour Alerts] Error:', error);

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await supabase.from('notification_logs').insert({
        job_type: 'happy_hour_daily_digest',
        status: 'error',
        details: { error: String(error) },
      });
    } catch {
      // Ignore logging errors
    }

    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Check every 30 minutes from 10am-10pm ET
// Netlify cron uses UTC. ET is UTC-5 (EST) or UTC-4 (EDT).
// 10am ET = 3pm UTC (EST) / 2pm UTC (EDT)
// 10pm ET = 3am UTC (EST) / 2am UTC (EDT)
// Cover both EST and EDT with 14:00-23:59 + 00:00-03:00
export const config: Config = {
  schedule: '*/30 14-23,0-3 * * *',
};
