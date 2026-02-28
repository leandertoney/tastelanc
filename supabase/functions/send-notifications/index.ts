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
 * - POST /todays-pick - Send daily 4pm ET "Today's Pick" curated restaurant notification
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
 * Get all push tokens from the database, grouped by Expo project (app_slug).
 * Expo Push API rejects batch sends containing tokens from multiple projects
 * (PUSH_TOO_MANY_EXPERIENCE_IDS), so callers must send separate batches per group.
 */
async function getAllPushTokensGrouped(supabase: ReturnType<typeof createClient>): Promise<Map<string, string[]>> {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('token, app_slug');

  if (error || !data) {
    console.error('Error fetching push tokens:', error);
    return new Map();
  }

  const groups = new Map<string, string[]>();
  for (const t of data) {
    const slug = t.app_slug || 'tastelanc';
    if (!groups.has(slug)) groups.set(slug, []);
    groups.get(slug)!.push(t.token);
  }
  return groups;
}

/**
 * Send push notifications to all tokens, automatically batching by Expo project.
 * Takes a function that builds messages for a given set of tokens.
 */
async function sendToAllTokens(
  supabase: ReturnType<typeof createClient>,
  buildMessages: (tokens: string[]) => PushMessage[]
): Promise<{ sent: number; total: number }> {
  const groups = await getAllPushTokensGrouped(supabase);
  let sent = 0;
  let total = 0;

  for (const [slug, tokens] of groups) {
    const messages = buildMessages(tokens);
    total += messages.length;
    console.log(`Sending ${messages.length} messages for project ${slug}`);
    const result = await sendPushNotifications(messages);
    sent += result.data.filter(r => r.status === 'ok').length;
  }

  return { sent, total };
}

/**
 * Get push tokens for users who favorited a specific restaurant, grouped by project.
 */
async function getFavoriteUserTokensGrouped(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string
): Promise<Map<string, string[]>> {
  const { data, error } = await supabase
    .from('favorites')
    .select('user_id, push_tokens!inner(token, app_slug)')
    .eq('restaurant_id', restaurantId);

  if (error || !data) {
    console.error('Error fetching favorite user tokens:', error);
    return new Map();
  }

  const groups = new Map<string, string[]>();
  for (const f of data) {
    // @ts-ignore - Supabase join typing
    for (const t of (f.push_tokens || [])) {
      const slug = t.app_slug || 'tastelanc';
      if (!groups.has(slug)) groups.set(slug, []);
      groups.get(slug)!.push(t.token);
    }
  }
  return groups;
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

  // Send separate batches per Expo project to avoid PUSH_TOO_MANY_EXPERIENCE_IDS
  const { sent: successCount } = await sendToAllTokens(supabase, (tokens) =>
    tokens.map(token => ({
      to: token,
      sound: 'default' as const,
      title,
      body,
      data: {
        screen: count === 1 ? 'RestaurantDetail' : 'HappyHours',
        // @ts-ignore - Supabase join typing
        restaurantId: count === 1 ? happyHours[0].restaurant.id : undefined,
      },
    }))
  );

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

  // Get user's push tokens grouped by project (user may have both apps)
  const { data: tokenData } = await supabase
    .from('push_tokens')
    .select('token, app_slug')
    .eq('user_id', userId);

  if (!tokenData || tokenData.length === 0) {
    return { sent: false, reason: 'User has no push token' };
  }

  // Build message
  let body = `You're near ${restaurant.name}!`;
  if (happyHour?.description) {
    body = `${restaurant.name} has ${happyHour.description} right now!`;
  }

  // Group by project and send separate batches
  const groups = new Map<string, string[]>();
  for (const t of tokenData) {
    const slug = t.app_slug || 'tastelanc';
    if (!groups.has(slug)) groups.set(slug, []);
    groups.get(slug)!.push(t.token);
  }

  let anySent = false;
  for (const [, tokens] of groups) {
    const messages: PushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: happyHour ? 'Happy Hour Nearby!' : 'Check This Out!',
      body,
      data: {
        screen: 'RestaurantDetail',
        restaurantId,
      },
    }));
    const result = await sendPushNotifications(messages);
    if (result.data.some(r => r.status === 'ok')) anySent = true;
  }

  return { sent: anySent };
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
  // Get user's push tokens grouped by project
  const { data: tokenData } = await supabase
    .from('push_tokens')
    .select('token, app_slug')
    .eq('user_id', userId);

  if (!tokenData || tokenData.length === 0) {
    return { sent: false, reason: 'User has no push token' };
  }

  // Build the notification message
  const countText = restaurantCount > 0
    ? `Check out ${restaurantCount} restaurant${restaurantCount === 1 ? '' : 's'} nearby`
    : 'Discover restaurants nearby';

  // Group by project and send separate batches
  const groups = new Map<string, string[]>();
  for (const t of tokenData) {
    const slug = t.app_slug || 'tastelanc';
    if (!groups.has(slug)) groups.set(slug, []);
    groups.get(slug)!.push(t.token);
  }

  let anySent = false;
  for (const [, tokens] of groups) {
    const messages: PushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: `You're in ${areaName}!`,
      body: countText,
      data: {
        screen: 'AreaRestaurants',
        areaId,
        areaName,
      },
    }));
    const result = await sendPushNotifications(messages);
    if (result.data.some(r => r.status === 'ok')) anySent = true;
  }

  return { sent: anySent };
}

// ─── Pick strategy config ────────────────────────────────────────────────────

interface PickStrategy {
  type: string;
  title: string;
  emoji: string;
}

const PICK_STRATEGIES_BY_DAY: Record<string, PickStrategy> = {
  monday:    { type: 'most_loved',      title: "Today's Most Loved",    emoji: '❤️' },
  tuesday:   { type: 'happy_hour',      title: 'Happy Hour Pick',       emoji: '🍺' },
  wednesday: { type: 'hidden_gem',      title: 'Hidden Gem of the Day', emoji: '💎' },
  thursday:  { type: 'event_tonight',   title: 'Event Tonight',         emoji: '🎵' },
  friday:    { type: 'weekend_kickoff', title: 'Weekend Kickoff',       emoji: '🔥' },
  saturday:  { type: 'date_night',      title: "Tonight's Date Night Pick", emoji: '🌆' },
  sunday:    { type: 'brunch',          title: 'Brunch of the Day',     emoji: '☀️' },
};

/**
 * Send the daily "Today's Pick" push notification at 4pm ET.
 * Rotates pick categories by day of week. Uses day-of-month as a
 * deterministic seed so everyone gets the same pick, but it varies day-to-day.
 */
async function sendTodaysPick(supabase: ReturnType<typeof createClient>): Promise<{
  sent: number;
  restaurant?: string;
  strategy?: string;
  reason?: string;
}> {
  const now = new Date();
  const etLocale = { timeZone: 'America/New_York' };

  const dayName = now.toLocaleDateString('en-US', { ...etLocale, weekday: 'long' }).toLowerCase();
  const dayOfMonth = parseInt(now.toLocaleDateString('en-US', { ...etLocale, day: 'numeric' }), 10);
  const etDayOfWeek = dayName; // e.g. 'tuesday'

  const strategy = PICK_STRATEGIES_BY_DAY[dayName];
  if (!strategy) {
    return { sent: 0, reason: `Unknown day: ${dayName}` };
  }

  let restaurantId: string | null = null;
  let restaurantName = '';
  let notifBody = '';

  // ── Pick by strategy type ──────────────────────────────────────────────────

  if (strategy.type === 'most_loved') {
    // Try to find the most-voted restaurant this month from the votes table
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: voteData } = await supabase
      .from('votes')
      .select('restaurant_id')
      .eq('month', currentMonth);

    let topRestaurantId: string | null = null;
    if (voteData?.length) {
      // Tally votes client-side (edge function doesn't have RPC access easily)
      const tally = new Map<string, number>();
      for (const v of voteData) {
        tally.set(v.restaurant_id, (tally.get(v.restaurant_id) || 0) + 1);
      }
      const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
      // Rotate among top 5 so we don't spam the same #1 every Monday
      const topN = sorted.slice(0, Math.min(5, sorted.length));
      topRestaurantId = topN[dayOfMonth % topN.length][0];
    }

    if (topRestaurantId) {
      const { data: r } = await supabase
        .from('restaurants')
        .select('id, name, description, best_for')
        .eq('id', topRestaurantId)
        .single();

      if (r) {
        restaurantId = r.id;
        restaurantName = r.name;
        notifBody = `Lancaster is voting ${r.name} #1 this month. Have you tried it yet?`;
      }
    }

    // Fallback: no votes yet — pick from verified restaurants deterministically
    if (!restaurantId) {
      const { data } = await supabase
        .from('restaurants')
        .select('id, name, description, best_for')
        .eq('is_active', true)
        .eq('is_verified', true)
        .order('name')
        .limit(40);

      if (!data?.length) return { sent: 0, reason: 'No restaurants for most_loved' };
      const r = data[dayOfMonth % data.length];
      restaurantId = r.id;
      restaurantName = r.name;
      const extra = r.best_for?.length ? ` Known for ${(r.best_for as string[]).slice(0, 1)[0].toLowerCase()}.` : '';
      notifBody = `The community is loving ${r.name} right now.${extra} Have you been?`;
    }

  } else if (strategy.type === 'happy_hour') {
    const { data } = await supabase
      .from('happy_hours')
      .select(`
        restaurant_id, description, start_time,
        restaurants!inner(id, name, is_active, is_verified)
      `)
      .eq('is_active', true)
      .contains('days_of_week', [etDayOfWeek])
      .limit(30);

    if (!data?.length) return { sent: 0, reason: 'No happy hours today for happy_hour pick' };
    const hh = data[dayOfMonth % data.length] as any;
    const r = hh.restaurants;
    restaurantId = r.id;
    restaurantName = r.name;

    const [h] = hh.start_time.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
    notifBody = hh.description
      ? `${r.name}: ${hh.description} starting at ${dh} ${suffix}`
      : `${r.name} kicks off happy hour at ${dh} ${suffix} — grab a seat before it fills up`;

  } else if (strategy.type === 'hidden_gem') {
    // Verified restaurants that are NOT premium/elite — the underdogs
    const { data } = await supabase
      .from('restaurants')
      .select('id, name, description, best_for, cuisine')
      .eq('is_active', true)
      .eq('is_verified', true)
      .not('tier_id', 'in', `(${PAID_TIER_IDS.join(',')})`)
      .order('name')
      .limit(40);

    if (!data?.length) return { sent: 0, reason: 'No hidden gems found' };
    const r = data[dayOfMonth % data.length];
    restaurantId = r.id;
    restaurantName = r.name;
    notifBody = `Most people walk right past ${r.name}. Today's your sign to finally try it.`;

  } else if (strategy.type === 'event_tonight') {
    // Fetch events happening today or tonight
    const etToday = now.toLocaleDateString('en-US', { ...etLocale, year: 'numeric', month: '2-digit', day: '2-digit' })
      .split('/').reverse().join('-').replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3');
    // Simple YYYY-MM-DD in ET
    const year = now.toLocaleDateString('en-US', { ...etLocale, year: 'numeric' });
    const month = now.toLocaleDateString('en-US', { ...etLocale, month: '2-digit' });
    const day = now.toLocaleDateString('en-US', { ...etLocale, day: '2-digit' });
    const todayStr = `${year}-${month}-${day}`;

    const { data } = await supabase
      .from('events')
      .select(`
        id, name, description, event_type, start_time,
        restaurant:restaurants!inner(id, name, is_active)
      `)
      .eq('is_active', true)
      .or(`event_date.eq.${todayStr},is_recurring.eq.true`)
      .limit(30);

    // Filter recurring events to those on today's day
    const todaysEvents = (data || []).filter((e: any) => {
      if (!e.is_recurring) return true;
      return e.days_of_week?.includes(etDayOfWeek);
    });

    if (!todaysEvents.length) return { sent: 0, reason: 'No events tonight' };
    const ev = todaysEvents[dayOfMonth % todaysEvents.length] as any;
    const r = ev.restaurant;
    restaurantId = r.id;
    restaurantName = r.name;
    const timeStr = ev.start_time
      ? (() => {
          const [h] = ev.start_time.split(':').map(Number);
          const s = h >= 12 ? 'PM' : 'AM';
          const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
          return ` at ${dh} ${s}`;
        })()
      : ' tonight';
    notifBody = `${ev.name} at ${r.name}${timeStr}. Live entertainment in Lancaster tonight 🎶`;

  } else if (strategy.type === 'weekend_kickoff') {
    // Top verified restaurant with a happy hour or event on Friday
    const { data } = await supabase
      .from('restaurants')
      .select('id, name, description, best_for, categories')
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('name')
      .limit(50);

    if (!data?.length) return { sent: 0, reason: 'No restaurants for weekend_kickoff' };
    // Prefer bars/nightlife for Friday kickoff
    const preferred = (data as any[]).filter((r: any) =>
      r.categories?.some((c: string) => ['bars', 'nightlife', 'rooftops'].includes(c))
    );
    const pool = preferred.length ? preferred : data;
    const r = pool[dayOfMonth % pool.length] as any;
    restaurantId = r.id;
    restaurantName = r.name;
    notifBody = `Weekend starts NOW. ${r.name} is the place to be tonight in Lancaster 🔥`;

  } else if (strategy.type === 'date_night') {
    // Upscale dinner pick for Saturday
    const { data } = await supabase
      .from('restaurants')
      .select('id, name, description, best_for, categories')
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('name')
      .limit(50);

    if (!data?.length) return { sent: 0, reason: 'No restaurants for date_night' };
    const preferred = (data as any[]).filter((r: any) =>
      r.categories?.some((c: string) => ['dinner', 'rooftops'].includes(c))
    );
    const pool = preferred.length ? preferred : data;
    const r = pool[dayOfMonth % pool.length] as any;
    restaurantId = r.id;
    restaurantName = r.name;
    const tagline = r.best_for?.length
      ? r.best_for.slice(0, 1)[0]
      : 'a perfect Saturday evening';
    notifBody = `Make tonight special. ${r.name} is tonight's date night pick — perfect for ${tagline.toLowerCase()}.`;

  } else if (strategy.type === 'brunch') {
    const { data } = await supabase
      .from('restaurants')
      .select('id, name, description, best_for, categories')
      .eq('is_active', true)
      .eq('is_verified', true)
      .contains('categories', ['brunch'])
      .order('name')
      .limit(30);

    if (!data?.length) return { sent: 0, reason: 'No brunch spots found' };
    const r = (data as any[])[dayOfMonth % data.length];
    restaurantId = r.id;
    restaurantName = r.name;
    notifBody = `Sunday brunch sorted. ${r.name} is today's top pick — treat yourself ☀️`;
  }

  if (!restaurantId) return { sent: 0, reason: 'No restaurant selected' };

  // ── Send to all tokens (separate batches per Expo project) ──────────────

  const title = `${strategy.emoji} ${strategy.title}`;
  const { sent: successCount, total } = await sendToAllTokens(supabase, (tokens) =>
    tokens.map(token => ({
      to: token,
      sound: 'default' as const,
      title,
      body: notifBody,
      data: {
        screen: 'RestaurantDetail',
        restaurantId,
      },
    }))
  );

  if (total === 0) return { sent: 0, reason: 'No push tokens registered' };

  return {
    sent: successCount,
    restaurant: restaurantName,
    strategy: strategy.type,
  };
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

        const truncatedSummary = summary.length > 120 ? summary.substring(0, 117) + '...' : summary;
        const blogResult = await sendToAllTokens(supabase, (tokens) =>
          tokens.map(token => ({
            to: token,
            sound: 'default' as const,
            title: `New from Rosie: ${title}`,
            body: truncatedSummary,
            data: {
              screen: 'BlogDetail',
              blogSlug: slug,
            },
          }))
        );

        return new Response(JSON.stringify(blogResult), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'todays-pick': {
        const result = await sendTodaysPick(supabase);
        return new Response(JSON.stringify(result), {
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

        const broadcastResult = await sendToAllTokens(supabase, (tokens) =>
          tokens.map(token => ({
            to: token,
            sound: 'default' as const,
            title,
            body: message,
            data: data || {},
          }))
        );

        return new Response(JSON.stringify(broadcastResult), {
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
