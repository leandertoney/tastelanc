import type { Config, Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Tier IDs that get push notification features
const PAID_TIER_IDS = [
  '00000000-0000-0000-0000-000000000002', // premium
  '00000000-0000-0000-0000-000000000003', // elite
];

interface PushMessage {
  to: string;
  sound?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Send push notifications via Expo Push API
 */
async function sendPushNotifications(messages: PushMessage[]) {
  if (messages.length === 0) {
    return { data: [] };
  }

  // Expo recommends batching in chunks of 100
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const results: Array<{ status: string; id?: string; message?: string }> = [];

  for (const chunk of chunks) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    });

    const result = await response.json();
    if (result.data) {
      results.push(...result.data);
    }
  }

  return { data: results };
}

/**
 * Happy Hour Alerts Netlify Scheduled Function
 *
 * Sends push notifications for upcoming happy hours at premium/elite restaurants.
 * Runs every 30 minutes from 2pm-10pm ET.
 */
export default async function handler(req: Request, context: Context) {
  console.log('[Happy Hour Alerts] Starting scheduled job...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    const dayOfWeek = now
      .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' })
      .toLowerCase();

    // Get current time in ET, truncated to minutes (no seconds) to avoid
    // missing happy hours that start at exact :00/:30 boundaries.
    // We also look back 2 minutes to catch HHs that just started.
    const etOptions = { timeZone: 'America/New_York' };
    const currentHour = now.toLocaleTimeString('en-US', {
      ...etOptions,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Truncate seconds and subtract 2 minutes for a small look-back buffer
    const [hh, mm] = currentHour.split(':').map(Number);
    const lookBackMinutes = hh * 60 + mm - 2; // 2 min look-back
    const lookAheadMinutes = hh * 60 + mm + 30; // 30 min look-ahead

    const formatTime = (totalMinutes: number) => {
      const h = Math.floor(totalMinutes / 60) % 24;
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    };

    const currentTimeStr = formatTime(Math.max(0, lookBackMinutes));
    const alertTimeStr = formatTime(lookAheadMinutes);

    console.log(`[Happy Hour Alerts] Day: ${dayOfWeek}, Window: ${currentTimeStr} - ${alertTimeStr}`);

    // Find happy hours starting in the next 30 minutes for paid tier restaurants
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
      .eq('is_active', true)
      .contains('days_of_week', [dayOfWeek])
      .gte('start_time', currentTimeStr)
      .lte('start_time', alertTimeStr);

    if (hhError) {
      console.error('[Happy Hour Alerts] Error fetching happy hours:', hhError);
      throw hhError;
    }

    // Filter to only paid tier restaurants
    const paidHappyHours = (happyHours || []).filter((hh: any) =>
      PAID_TIER_IDS.includes(hh.restaurant?.tier_id)
    );

    // Deduplicate: check if we already sent alerts for these happy hours today
    const { data: recentLogs } = await supabase
      .from('notification_logs')
      .select('details')
      .eq('job_type', 'happy_hour_alerts')
      .eq('status', 'completed')
      .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

    const alreadySentHHIds = new Set<string>();
    for (const log of recentLogs || []) {
      const ids = (log.details as any)?.happy_hour_ids;
      if (Array.isArray(ids)) ids.forEach((id: string) => alreadySentHHIds.add(id));
    }

    const newHappyHours = paidHappyHours.filter((hh: any) => !alreadySentHHIds.has(hh.id));

    if (newHappyHours.length === 0) {
      const reason = paidHappyHours.length > 0 ? 'Already sent today' : 'No upcoming happy hours';
      console.log(`[Happy Hour Alerts] ${reason} for paid restaurants`);

      // Log the run
      await supabase.from('notification_logs').insert({
        job_type: 'happy_hour_alerts',
        status: 'completed',
        details: { message: reason, day: dayOfWeek, time: currentTimeStr },
      });

      return new Response(
        JSON.stringify({ sent: 0, restaurants: [], message: reason }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get all push tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token');

    if (tokenError || !tokenData || tokenData.length === 0) {
      console.log('[Happy Hour Alerts] No push tokens registered');

      await supabase.from('notification_logs').insert({
        job_type: 'happy_hour_alerts',
        status: 'completed',
        details: { message: 'No push tokens', restaurants: newHappyHours.length },
      });

      return new Response(
        JSON.stringify({ sent: 0, restaurants: [], message: 'No push tokens registered' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tokens = tokenData.map((t) => t.token);
    const messages: PushMessage[] = [];
    const restaurantNames: string[] = [];

    for (const hh of newHappyHours) {
      const restaurant = (hh as any).restaurant;
      restaurantNames.push(restaurant.name);
    }

    // Build a single digest notification instead of one per restaurant
    const count = restaurantNames.length;
    let title: string;
    let body: string;

    if (count === 1) {
      // Single happy hour - use specific messaging
      const hh = newHappyHours[0];
      const restaurant = (hh as any).restaurant;
      const [hours] = hh.start_time.split(':');
      const h = parseInt(hours, 10);
      const suffix = h >= 12 ? 'pm' : 'am';
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      title = `Happy Hour at ${restaurant.name}!`;
      body = hh.description || `Starting at ${displayHour}${suffix}`;
    } else if (count === 2) {
      title = `${count} Happy Hours Starting Soon!`;
      body = `${restaurantNames[0]} and ${restaurantNames[1]} have happy hours right now`;
    } else {
      title = `${count} Happy Hours Starting Soon!`;
      const preview = restaurantNames.slice(0, 2).join(', ');
      body = `${preview} + ${count - 2} more have happy hours right now`;
    }

    // Send one digest notification to each device
    for (const token of tokens) {
      messages.push({
        to: token,
        sound: 'default',
        title,
        body,
        data: {
          screen: count === 1 ? 'RestaurantDetail' : 'HappyHours',
          restaurantId: count === 1 ? (newHappyHours[0] as any).restaurant.id : undefined,
        },
      });
    }

    // Send notifications
    console.log(`[Happy Hour Alerts] Sending ${messages.length} digest notifications for ${count} restaurants`);
    const result = await sendPushNotifications(messages);
    const successCount = result.data.filter((r) => r.status === 'ok').length;

    // Log the run
    await supabase.from('notification_logs').insert({
      job_type: 'happy_hour_alerts',
      status: 'completed',
      details: {
        sent: successCount,
        total: messages.length,
        restaurants: restaurantNames,
        happy_hour_ids: newHappyHours.map((hh: any) => hh.id),
        day: dayOfWeek,
        time: currentTimeStr,
      },
    });

    console.log(`[Happy Hour Alerts] Sent ${successCount}/${messages.length} notifications`);

    return new Response(
      JSON.stringify({ sent: successCount, restaurants: restaurantNames }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Happy Hour Alerts] Error:', error);

    // Try to log the error
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await supabase.from('notification_logs').insert({
        job_type: 'happy_hour_alerts',
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

// Run every 30 minutes from 11am-10pm ET
// Netlify cron uses UTC. ET is UTC-5 (EST) or UTC-4 (EDT).
// 11am ET = 4pm UTC (EST) / 3pm UTC (EDT)
// 10pm ET = 3am UTC (EST) / 2am UTC (EDT)
// Using 15:00-23:59 + 00:00-03:00 to cover both EST and EDT
export const config: Config = {
  schedule: '*/30 15-23,0-3 * * *',
};
