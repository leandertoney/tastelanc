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

    // Get current time + 30 minutes in ET
    const etOptions = { timeZone: 'America/New_York' };
    const currentTimeStr = now.toLocaleTimeString('en-US', {
      ...etOptions,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const alertTime = new Date(now.getTime() + 30 * 60 * 1000);
    const alertTimeStr = alertTime.toLocaleTimeString('en-US', {
      ...etOptions,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    console.log(`[Happy Hour Alerts] Day: ${dayOfWeek}, Current: ${currentTimeStr}, Alert window: ${alertTimeStr}`);

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

    if (paidHappyHours.length === 0) {
      console.log('[Happy Hour Alerts] No upcoming happy hours for paid restaurants');

      // Log the run
      await supabase.from('notification_logs').insert({
        job_type: 'happy_hour_alerts',
        status: 'completed',
        details: { message: 'No upcoming happy hours', day: dayOfWeek, time: currentTimeStr },
      });

      return new Response(
        JSON.stringify({ sent: 0, restaurants: [], message: 'No upcoming happy hours' }),
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
        details: { message: 'No push tokens', restaurants: paidHappyHours.length },
      });

      return new Response(
        JSON.stringify({ sent: 0, restaurants: [], message: 'No push tokens registered' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tokens = tokenData.map((t) => t.token);
    const messages: PushMessage[] = [];
    const restaurantNames: string[] = [];

    for (const hh of paidHappyHours) {
      const restaurant = (hh as any).restaurant;
      restaurantNames.push(restaurant.name);

      // Format the start time for display
      const [hours] = hh.start_time.split(':');
      const h = parseInt(hours, 10);
      const suffix = h >= 12 ? 'pm' : 'am';
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const startTimeDisplay = `${displayHour}${suffix}`;

      // Create message for each token
      for (const token of tokens) {
        messages.push({
          to: token,
          sound: 'default',
          title: `Happy Hour at ${restaurant.name}!`,
          body: hh.description || `Starting at ${startTimeDisplay}`,
          data: {
            screen: 'RestaurantDetail',
            restaurantId: restaurant.id,
          },
        });
      }
    }

    // Send notifications
    console.log(`[Happy Hour Alerts] Sending ${messages.length} notifications for ${restaurantNames.length} restaurants`);
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

// Run every 30 minutes from 2pm-10pm ET (19:00-03:00 UTC next day)
// Note: Netlify cron uses UTC, so we need to account for ET offset
// ET is UTC-5 (or UTC-4 during DST)
// 2pm ET = 7pm UTC (19:00), 10pm ET = 3am UTC next day (03:00)
export const config: Config = {
  schedule: '*/30 19-23,0-3 * * *',
};
