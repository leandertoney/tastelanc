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
 * Sends a single daily digest push notification listing ALL happy hours
 * happening today at premium/elite restaurants. The digest fires 30 minutes
 * before the earliest happy hour of the day. Runs every 30 minutes to check,
 * but only sends once per day (dedup via notification_logs).
 */
export default async function handler(req: Request, context: Context) {
  console.log('[Happy Hour Alerts] Checking for daily digest...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // Deduplicate: check if we already sent a daily digest today
    const startOfDayET = new Date(
      now.toLocaleDateString('en-US', { timeZone: 'America/New_York' })
    );
    const { data: recentLogs } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('job_type', 'happy_hour_daily_digest')
      .eq('status', 'completed')
      .gte('created_at', startOfDayET.toISOString())
      .limit(1);

    if (recentLogs && recentLogs.length > 0) {
      console.log('[Happy Hour Alerts] Daily digest already sent today');
      return new Response(
        JSON.stringify({ sent: 0, message: 'Daily digest already sent today' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find ALL happy hours for today for paid tier restaurants
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
      .contains('days_of_week', [dayOfWeek]);

    if (hhError) {
      console.error('[Happy Hour Alerts] Error fetching happy hours:', hhError);
      throw hhError;
    }

    // Filter to only paid tier restaurants
    const paidHappyHours = (happyHours || []).filter((hh: any) =>
      PAID_TIER_IDS.includes(hh.restaurant?.tier_id)
    );

    if (paidHappyHours.length === 0) {
      console.log('[Happy Hour Alerts] No happy hours today for paid restaurants');
      return new Response(
        JSON.stringify({ sent: 0, message: 'No happy hours today' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the earliest happy hour start time
    const earliestStartTime = paidHappyHours
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

    // Only send if we've reached the trigger time (30 min before earliest HH)
    if (currentMinutes < triggerMinutes) {
      console.log('[Happy Hour Alerts] Too early, waiting for trigger time');
      return new Response(
        JSON.stringify({ sent: 0, message: 'Waiting for trigger time' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get all push tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token');

    if (tokenError || !tokenData || tokenData.length === 0) {
      console.log('[Happy Hour Alerts] No push tokens registered');
      return new Response(
        JSON.stringify({ sent: 0, message: 'No push tokens registered' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tokens = tokenData.map((t) => t.token);

    // Deduplicate restaurant names (a restaurant may have multiple happy hours)
    const restaurantNames = Array.from(
      new Set(paidHappyHours.map((hh: any) => hh.restaurant.name as string))
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

    // Send one digest notification to each device, always linking to HappyHours screen
    const messages: PushMessage[] = tokens.map((token) => ({
      to: token,
      sound: 'default' as const,
      title,
      body,
      data: { screen: 'HappyHours' },
    }));

    console.log(`[Happy Hour Alerts] Sending daily digest to ${messages.length} devices for ${count} restaurants`);
    const result = await sendPushNotifications(messages);
    const successCount = result.data.filter((r) => r.status === 'ok').length;

    // Log the run as daily digest
    await supabase.from('notification_logs').insert({
      job_type: 'happy_hour_daily_digest',
      status: 'completed',
      details: {
        sent: successCount,
        total: messages.length,
        restaurants: restaurantNames,
        happy_hour_count: paidHappyHours.length,
        earliest_start: earliestStartTime,
        day: dayOfWeek,
      },
    });

    console.log(`[Happy Hour Alerts] Sent ${successCount}/${messages.length} notifications`);

    return new Response(
      JSON.stringify({ sent: successCount, restaurants: restaurantNames }),
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
