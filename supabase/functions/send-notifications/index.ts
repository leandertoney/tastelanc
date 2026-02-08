/**
 * Send Push Notifications Edge Function
 *
 * This function handles sending push notifications via Expo Push API.
 * It's called by scheduled functions and webhooks.
 *
 * Endpoints:
 * - POST /happy-hour-alerts - Send alerts for upcoming happy hours (premium/elite only)
 * - POST /geofence-alert - Send alert when user enters a restaurant geofence (premium/elite only)
 * - POST /area-entry - Send alert when user enters an area geofence for the first time
 * - POST /event-reminder - Send reminder for upcoming events (premium/elite only)
 * - POST /broadcast - Send notification to all users (admin only)
 * - POST /new-blog-post - Send notification to all users about a new blog post
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

interface ExpoPushResponse {
  data: Array<{
    status: 'ok' | 'error';
    id?: string;
    message?: string;
  }>;
}

/**
 * Send push notifications via Expo Push API
 */
async function sendPushNotifications(messages: PushMessage[]): Promise<ExpoPushResponse> {
  if (messages.length === 0) {
    return { data: [] };
  }

  // Expo recommends batching in chunks of 100
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const results: ExpoPushResponse['data'] = [];

  for (const chunk of chunks) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
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
 * Get all push tokens from the database
 */
async function getAllPushTokens(supabase: ReturnType<typeof createClient>): Promise<string[]> {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('token');

  if (error || !data) {
    console.error('Error fetching push tokens:', error);
    return [];
  }

  return data.map(t => t.token);
}

/**
 * Get push tokens for users who favorited a specific restaurant
 */
async function getFavoriteUserTokens(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('user_id, push_tokens!inner(token)')
    .eq('restaurant_id', restaurantId);

  if (error || !data) {
    console.error('Error fetching favorite user tokens:', error);
    return [];
  }

  // @ts-ignore - Supabase join typing
  return data.flatMap(f => f.push_tokens?.map((t: any) => t.token) || []);
}

/**
 * Check if a restaurant is premium or elite tier
 */
async function isPaidTier(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('tier_id')
    .eq('id', restaurantId)
    .single();

  if (error || !data) {
    return false;
  }

  return PAID_TIER_IDS.includes(data.tier_id);
}

/**
 * Send happy hour alerts for upcoming happy hours
 * Called by a scheduled function (e.g., every 30 minutes)
 */
async function sendHappyHourAlerts(supabase: ReturnType<typeof createClient>): Promise<{
  sent: number;
  restaurants: string[];
}> {
  const now = new Date();
  // Use ET timezone for day/time calculations since restaurants are in ET
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' }).toLowerCase();

  // Get current time in ET, truncated to minutes with 2-min look-back buffer
  const etTime = now.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const [hh, mm] = etTime.split(':').map(Number);
  const lookBackMin = hh * 60 + mm - 2;
  const lookAheadMin = hh * 60 + mm + 30;
  const fmt = (t: number) => {
    const h = Math.floor(t / 60) % 24;
    const m = t % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  };
  const currentTimeStr = fmt(Math.max(0, lookBackMin));
  const alertTimeStr = fmt(lookAheadMin);

  // Find happy hours starting in the next 30 minutes for paid tier restaurants
  const { data: happyHours, error } = await supabase
    .from('happy_hours')
    .select(`
      id,
      name,
      description,
      start_time,
      end_time,
      restaurant:restaurants!inner(id, name, tier_id)
    `)
    .eq('is_active', true)
    .contains('days_of_week', [dayOfWeek])
    .gte('start_time', currentTimeStr)
    .lte('start_time', alertTimeStr)
    .in('restaurants.tier_id', PAID_TIER_IDS);

  if (error || !happyHours || happyHours.length === 0) {
    console.log('No upcoming happy hours for paid restaurants');
    return { sent: 0, restaurants: [] };
  }

  // Get all push tokens
  const tokens = await getAllPushTokens(supabase);
  if (tokens.length === 0) {
    console.log('No push tokens registered');
    return { sent: 0, restaurants: [] };
  }

  const messages: PushMessage[] = [];
  const restaurantNames: string[] = [];

  for (const hh of happyHours) {
    // @ts-ignore - Supabase join typing
    const restaurant = hh.restaurant;
    restaurantNames.push(restaurant.name);
  }

  // Build a single digest notification instead of one per restaurant
  const count = restaurantNames.length;
  let title: string;
  let body: string;

  if (count === 1) {
    const hh = happyHours[0];
    // @ts-ignore - Supabase join typing
    const restaurant = hh.restaurant;
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

  for (const token of tokens) {
    messages.push({
      to: token,
      sound: 'default',
      title,
      body,
      data: {
        screen: count === 1 ? 'RestaurantDetail' : 'HappyHours',
        // @ts-ignore - Supabase join typing
        restaurantId: count === 1 ? happyHours[0].restaurant.id : undefined,
      },
    });
  }

  // Send notifications
  const result = await sendPushNotifications(messages);
  const successCount = result.data.filter(r => r.status === 'ok').length;

  return { sent: successCount, restaurants: restaurantNames };
}

/**
 * Send geofence alert when user enters restaurant area
 * Called by Radar webhook
 */
async function sendGeofenceAlert(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  restaurantId: string
): Promise<{ sent: boolean; reason?: string }> {
  // Check if restaurant is paid tier
  const isPaid = await isPaidTier(supabase, restaurantId);
  if (!isPaid) {
    return { sent: false, reason: 'Restaurant is not premium/elite tier' };
  }

  // Get restaurant details
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('name')
    .eq('id', restaurantId)
    .single();

  if (restaurantError || !restaurant) {
    return { sent: false, reason: 'Restaurant not found' };
  }

  // Check for active happy hour
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 8);

  const { data: happyHour } = await supabase
    .from('happy_hours')
    .select('description')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .contains('days_of_week', [dayOfWeek])
    .lte('start_time', currentTime)
    .gte('end_time', currentTime)
    .single();

  // Get user's push token
  const { data: tokenData } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .single();

  if (!tokenData) {
    return { sent: false, reason: 'User has no push token' };
  }

  // Build message
  let body = `You're near ${restaurant.name}!`;
  if (happyHour?.description) {
    body = `${restaurant.name} has ${happyHour.description} right now!`;
  }

  const messages: PushMessage[] = [{
    to: tokenData.token,
    sound: 'default',
    title: happyHour ? 'Happy Hour Nearby!' : 'Check This Out!',
    body,
    data: {
      screen: 'RestaurantDetail',
      restaurantId,
    },
  }];

  const result = await sendPushNotifications(messages);
  return { sent: result.data[0]?.status === 'ok' };
}

/**
 * Send area entry notification for first-time visits to neighborhoods
 * Called when user enters an area geofence for the first time
 */
async function sendAreaEntryNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  areaId: string,
  areaName: string,
  restaurantCount: number
): Promise<{ sent: boolean; reason?: string }> {
  // Get user's push token
  const { data: tokenData } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .single();

  if (!tokenData) {
    return { sent: false, reason: 'User has no push token' };
  }

  // Build the notification message
  const countText = restaurantCount > 0
    ? `Check out ${restaurantCount} restaurant${restaurantCount === 1 ? '' : 's'} on TasteLanc nearby`
    : 'Discover restaurants on TasteLanc nearby';

  const messages: PushMessage[] = [{
    to: tokenData.token,
    sound: 'default',
    title: `You're in ${areaName}!`,
    body: countText,
    data: {
      screen: 'AreaRestaurants',
      areaId,
      areaName,
    },
  }];

  const result = await sendPushNotifications(messages);
  return { sent: result.data[0]?.status === 'ok' };
}

// Main handler
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different endpoints
    switch (path) {
      case 'happy-hour-alerts': {
        const result = await sendHappyHourAlerts(supabase);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'geofence-alert': {
        const body = await req.json();
        const { userId, restaurantId } = body;

        if (!userId || !restaurantId) {
          return new Response(JSON.stringify({ error: 'Missing userId or restaurantId' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const result = await sendGeofenceAlert(supabase, userId, restaurantId);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'area-entry': {
        // Send notification when user enters an area for the first time
        const body = await req.json();
        const { userId, areaId, areaName, restaurantCount } = body;

        if (!userId || !areaId || !areaName) {
          return new Response(JSON.stringify({ error: 'Missing userId, areaId, or areaName' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const result = await sendAreaEntryNotification(
          supabase,
          userId,
          areaId,
          areaName,
          restaurantCount || 0
        );
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'new-blog-post': {
        // Send notification to all users about a new blog post
        const body = await req.json();
        const { title, summary, slug } = body;

        if (!title || !summary || !slug) {
          return new Response(JSON.stringify({ error: 'Missing title, summary, or slug' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const tokens = await getAllPushTokens(supabase);
        const truncatedSummary = summary.length > 120 ? summary.substring(0, 117) + '...' : summary;
        const messages: PushMessage[] = tokens.map(token => ({
          to: token,
          sound: 'default',
          title: `New from Rosie: ${title}`,
          body: truncatedSummary,
          data: {
            screen: 'BlogDetail',
            blogSlug: slug,
          },
        }));

        const result = await sendPushNotifications(messages);
        const successCount = result.data.filter(r => r.status === 'ok').length;

        return new Response(JSON.stringify({ sent: successCount, total: tokens.length }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'broadcast': {
        // Admin-only broadcast to all users
        const body = await req.json();
        const { title, message, data } = body;

        if (!title || !message) {
          return new Response(JSON.stringify({ error: 'Missing title or message' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const tokens = await getAllPushTokens(supabase);
        const messages: PushMessage[] = tokens.map(token => ({
          to: token,
          sound: 'default',
          title,
          body: message,
          data: data || {},
        }));

        const result = await sendPushNotifications(messages);
        const successCount = result.data.filter(r => r.status === 'ok').length;

        return new Response(JSON.stringify({ sent: successCount, total: tokens.length }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown endpoint' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
