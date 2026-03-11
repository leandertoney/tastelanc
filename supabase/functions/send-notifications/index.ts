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

/**
 * Check if current time is within quiet hours (before 10 AM or after 9 PM ET).
 * All scheduled notifications MUST check this before sending.
 */
function isQuietHours(): { quiet: boolean; timeET: string } {
  const now = new Date();
  const timeET = now.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const hour = parseInt(timeET.split(':')[0], 10);
  return { quiet: hour < 10 || hour >= 21, timeET };
}

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

// ─── Notification types exempt from quiet hours ─────────────────────────────
// These are transactional/internal notifications that should send at any hour.
const QUIET_HOURS_EXEMPT = new Set([
  'sales_team_alert',
]);

// Throttle cooldown in minutes (matches apps/web/lib/notifications/throttle.ts)
const THROTTLE_COOLDOWN_MINUTES = 90;

/**
 * Low-level Expo Push API sender. NEVER call this directly — use sendViaGateway().
 */
async function _sendToExpo(messages: PushMessage[]): Promise<ExpoPushResponse> {
  if (messages.length === 0) {
    return { data: [] };
  }

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
 * Gateway response returned by sendViaGateway().
 */
interface GatewayResponse {
  sent: number;
  total: number;
  blocked: boolean;
  blockReason?: string;
}

/**
 * NOTIFICATION GATEWAY — the single enforcement point for ALL push notifications.
 *
 * Every notification in the system MUST go through this function. It enforces:
 * 1. Quiet hours (10 AM – 9 PM ET, unless exempt)
 * 2. Dedup (atomic via unique dedup_key in notification_logs)
 * 3. Throttle (90-min cooldown per market)
 * 4. Logging (every send is recorded for audit)
 *
 * New notification types automatically get all protections for free.
 */
async function sendViaGateway(
  supabase: ReturnType<typeof createClient>,
  params: {
    notificationType: string;
    marketSlug: string | null;
    messages: PushMessage[];
    dedupKey?: string;
    skipThrottle?: boolean;
    details?: Record<string, unknown>;
  },
): Promise<GatewayResponse> {
  const { notificationType, marketSlug, messages, dedupKey, skipThrottle, details } = params;

  if (messages.length === 0) {
    return { sent: 0, total: 0, blocked: false };
  }

  // 1. Quiet hours check (unless exempt)
  if (!QUIET_HOURS_EXEMPT.has(notificationType)) {
    const qh = isQuietHours();
    if (qh.quiet) {
      console.log(`[Gateway] BLOCKED ${notificationType}: quiet hours (${qh.timeET} ET)`);
      return { sent: 0, total: messages.length, blocked: true, blockReason: `Quiet hours: ${qh.timeET} ET` };
    }
  }

  // 2. Dedup check (atomic via unique index on dedup_key)
  if (dedupKey) {
    const { error: dedupError } = await supabase
      .from('notification_logs')
      .insert({
        job_type: notificationType,
        status: 'completed',
        market_slug: marketSlug,
        dedup_key: dedupKey,
        details: { ...details, placeholder: true },
      });

    if (dedupError) {
      // Unique constraint violation = already sent
      if (dedupError.code === '23505') {
        console.log(`[Gateway] BLOCKED ${notificationType}: duplicate (${dedupKey})`);
        return { sent: 0, total: messages.length, blocked: true, blockReason: `Duplicate: ${dedupKey}` };
      }
      // Other DB error — log but don't block (fail open)
      console.warn(`[Gateway] Dedup insert warning for ${notificationType}:`, dedupError.message);
    }
  }

  // 3. Throttle check (skip for transactional notifications)
  if (marketSlug && !skipThrottle) {
    const cooldownAgo = new Date(Date.now() - THROTTLE_COOLDOWN_MINUTES * 60 * 1000).toISOString();
    const { data: recentLogs } = await supabase
      .from('notification_logs')
      .select('job_type, created_at')
      .eq('status', 'completed')
      .eq('market_slug', marketSlug)
      .gte('created_at', cooldownAgo)
      .neq('job_type', notificationType) // Don't throttle against yourself (dedup handles that)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentLogs && recentLogs.length > 0) {
      const last = recentLogs[0];
      const minAgo = Math.round((Date.now() - new Date(last.created_at).getTime()) / 60000);
      console.log(`[Gateway] BLOCKED ${notificationType}: throttled (${last.job_type} sent ${minAgo}min ago)`);

      // Clean up the dedup placeholder if we inserted one
      if (dedupKey) {
        await supabase.from('notification_logs').delete().eq('dedup_key', dedupKey).eq('details->>placeholder', 'true');
      }

      return { sent: 0, total: messages.length, blocked: true, blockReason: `Throttled: ${last.job_type} sent ${minAgo}min ago` };
    }
  }

  // 4. Send via Expo Push API
  console.log(`[Gateway] Sending ${messages.length} messages for ${notificationType} (market: ${marketSlug || 'all'})`);
  const result = await _sendToExpo(messages);
  const sent = result.data.filter(r => r.status === 'ok').length;

  // 5. Log the send (update placeholder if dedup was used, otherwise insert new)
  if (dedupKey) {
    await supabase
      .from('notification_logs')
      .update({
        details: { ...details, sent, total: messages.length },
      })
      .eq('dedup_key', dedupKey);
  } else {
    await supabase.from('notification_logs').insert({
      job_type: notificationType,
      status: 'completed',
      market_slug: marketSlug,
      details: { ...details, sent, total: messages.length },
    });
  }

  return { sent, total: messages.length, blocked: false };
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
 * Routes through the gateway for quiet hours/throttle/dedup enforcement.
 */
async function sendToAllTokensViaGateway(
  supabase: ReturnType<typeof createClient>,
  notificationType: string,
  buildMessages: (tokens: string[]) => PushMessage[],
  opts?: { dedupKey?: string; details?: Record<string, unknown> },
): Promise<GatewayResponse> {
  const groups = await getAllPushTokensGrouped(supabase);
  const allMessages: PushMessage[] = [];

  for (const [slug, tokens] of groups) {
    const messages = buildMessages(tokens);
    console.log(`Building ${messages.length} messages for project ${slug}`);
    allMessages.push(...messages);
  }

  return sendViaGateway(supabase, {
    notificationType,
    marketSlug: null,
    messages: allMessages,
    dedupKey: opts?.dedupKey,
    details: opts?.details,
  });
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
 * Send happy hour alerts for upcoming happy hours.
 * Runs independently for each active market so notifications are scoped correctly.
 */
async function sendHappyHourAlerts(supabase: ReturnType<typeof createClient>): Promise<{
  sent: number;
  restaurants: string[];
}> {
  const { data: markets } = await supabase
    .from('markets')
    .select('id, slug')
    .eq('is_active', true);

  if (!markets?.length) return { sent: 0, restaurants: [] };

  let totalSent = 0;
  const allRestaurants: string[] = [];

  for (const market of markets) {
    const info = MARKET_INFO[market.slug];
    if (!info) {
      console.log(`No app info for market ${market.slug}, skipping happy hour alerts`);
      continue;
    }

    const result = await sendHappyHourAlertsForMarket(supabase, market.id, market.slug, info);
    totalSent += result.sent;
    allRestaurants.push(...result.restaurants);
  }

  return { sent: totalSent, restaurants: allRestaurants };
}

async function sendHappyHourAlertsForMarket(
  supabase: ReturnType<typeof createClient>,
  marketId: string,
  marketSlug: string,
  marketInfo: { appSlug: string; aiName: string; label: string },
): Promise<{ sent: number; restaurants: string[] }> {
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' }).toLowerCase();

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

  // Find happy hours starting soon for paid tier restaurants IN THIS MARKET
  const { data: happyHours, error } = await supabase
    .from('happy_hours')
    .select(`
      id,
      name,
      description,
      start_time,
      end_time,
      restaurant:restaurants!inner(id, name, tier_id, market_id)
    `)
    .eq('restaurant.market_id', marketId)
    .eq('is_active', true)
    .contains('days_of_week', [dayOfWeek])
    .gte('start_time', currentTimeStr)
    .lte('start_time', alertTimeStr)
    .in('restaurants.tier_id', PAID_TIER_IDS);

  if (error || !happyHours || happyHours.length === 0) {
    console.log(`No upcoming happy hours for paid restaurants in ${marketInfo.label}`);
    return { sent: 0, restaurants: [] };
  }

  const restaurantNames: string[] = [];
  for (const h of happyHours) {
    // @ts-ignore - Supabase join typing
    restaurantNames.push(h.restaurant.name);
  }

  const count = restaurantNames.length;
  let title: string;
  let body: string;

  if (count === 1) {
    const h = happyHours[0];
    // @ts-ignore - Supabase join typing
    const restaurant = h.restaurant;
    const [hours] = h.start_time.split(':');
    const hr = parseInt(hours, 10);
    const suffix = hr >= 12 ? 'pm' : 'am';
    const displayHour = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
    title = `Happy Hour at ${restaurant.name}!`;
    body = h.description || `Starting at ${displayHour}${suffix}`;
  } else if (count === 2) {
    title = `${count} Happy Hours Starting Soon!`;
    body = `${restaurantNames[0]} and ${restaurantNames[1]} have happy hours right now`;
  } else {
    title = `${count} Happy Hours Starting Soon!`;
    const preview = restaurantNames.slice(0, 2).join(', ');
    body = `${preview} + ${count - 2} more have happy hours right now`;
  }

  // Send ONLY to tokens for this market's app — via gateway
  const groups = await getAllPushTokensGrouped(supabase);
  const tokens = groups.get(marketInfo.appSlug) || [];
  console.log(`Happy Hour Alerts (${marketInfo.label}): sending to ${tokens.length} tokens for ${marketInfo.appSlug}`);

  if (tokens.length === 0) return { sent: 0, restaurants: restaurantNames };

  const now2 = new Date();
  const etDateStr = now2.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const messages = tokens.map(token => ({
    to: token,
    sound: 'default' as const,
    title,
    body,
    data: {
      screen: count === 1 ? 'RestaurantDetail' : 'HappyHours',
      // @ts-ignore - Supabase join typing
      restaurantId: count === 1 ? happyHours[0].restaurant.id : undefined,
    },
  }));

  const gw = await sendViaGateway(supabase, {
    notificationType: 'happy_hour_alerts',
    marketSlug,
    messages,
    dedupKey: `hh_alerts:${marketSlug}:${etDateStr}`,
    details: { restaurants: restaurantNames, app_slug: marketInfo.appSlug },
  });

  return { sent: gw.sent, restaurants: restaurantNames };
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

  // Build messages from all tokens and send via gateway
  const messages: PushMessage[] = tokenData.map(t => ({
    to: t.token,
    sound: 'default',
    title: happyHour ? 'Happy Hour Nearby!' : 'Check This Out!',
    body,
    data: {
      screen: 'RestaurantDetail',
      restaurantId,
    },
  }));

  const gw = await sendViaGateway(supabase, {
    notificationType: 'geofence_alert',
    marketSlug: null,
    messages,
    skipThrottle: true,
    details: { userId, restaurantId, restaurantName: restaurant.name },
  });

  return { sent: gw.sent > 0 };
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

  // Build messages from all tokens and send via gateway
  const messages: PushMessage[] = tokenData.map(t => ({
    to: t.token,
    sound: 'default',
    title: `You're in ${areaName}!`,
    body: countText,
    data: {
      screen: 'AreaRestaurants',
      areaId,
      areaName,
    },
  }));

  const gw = await sendViaGateway(supabase, {
    notificationType: 'area_entry',
    marketSlug: null,
    messages,
    skipThrottle: true,
    details: { userId, areaId, areaName },
  });

  return { sent: gw.sent > 0 };
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
// Map market slugs to their app slug and AI name for Today's Pick
const MARKET_INFO: Record<string, { appSlug: string; aiName: string; label: string }> = {
  'lancaster-pa': { appSlug: 'tastelanc', aiName: 'Rosie', label: 'Lancaster' },
  'cumberland-pa': { appSlug: 'taste-cumberland', aiName: 'Mollie', label: 'Cumberland' },
};

async function sendTodaysPick(supabase: ReturnType<typeof createClient>, targetMarketSlug?: string): Promise<{
  sent: number;
  restaurant?: string;
  strategy?: string;
  reason?: string;
}> {
  // Run Today's Pick independently for each active market
  let query = supabase.from('markets').select('id, slug').eq('is_active', true);

  // If a specific market is requested, only process that one
  if (targetMarketSlug) {
    query = query.eq('slug', targetMarketSlug);
  }

  const { data: markets } = await query;

  if (!markets?.length) return { sent: 0, reason: targetMarketSlug ? `Market ${targetMarketSlug} not found` : 'No active markets' };

  let totalSent = 0;
  let lastRestaurant = '';
  let lastStrategy = '';

  for (const market of markets) {
    const info = MARKET_INFO[market.slug];
    if (!info) {
      console.log(`No app info for market ${market.slug}, skipping`);
      continue;
    }

    const result = await sendTodaysPickForMarket(supabase, market.id, market.slug, info);
    totalSent += result.sent;
    if (result.restaurant) lastRestaurant = result.restaurant;
    if (result.strategy) lastStrategy = result.strategy;
  }

  return { sent: totalSent, restaurant: lastRestaurant, strategy: lastStrategy };
}

async function sendTodaysPickForMarket(
  supabase: ReturnType<typeof createClient>,
  marketId: string,
  marketSlug: string,
  marketInfo: { appSlug: string; aiName: string; label: string },
): Promise<{
  sent: number;
  restaurant?: string;
  strategy?: string;
  reason?: string;
}> {
  const now = new Date();
  const etLocale = { timeZone: 'America/New_York' };

  const dayName = now.toLocaleDateString('en-US', { ...etLocale, weekday: 'long' }).toLowerCase();
  const dayOfMonth = parseInt(now.toLocaleDateString('en-US', { ...etLocale, day: 'numeric' }), 10);

  const strategy = PICK_STRATEGIES_BY_DAY[dayName];
  if (!strategy) {
    return { sent: 0, reason: `Unknown day: ${dayName}` };
  }

  // ── Build eligible restaurant pool ─────────────────────────────────────────
  // Priority 1: Paid-tier restaurants (they pay for exposure)
  // Priority 2: Any restaurant with a happy hour or event today
  // NEVER pick a random restaurant just because it's in the DB.

  // Fetch paid-tier restaurants in this market
  const { data: paidRestaurants } = await supabase
    .from('restaurants')
    .select('id, name, description, best_for, categories, tier_id')
    .eq('market_id', marketId)
    .eq('is_active', true)
    .in('tier_id', PAID_TIER_IDS)
    .order('name')
    .limit(100);

  // Fetch restaurants with a happy hour today (any tier)
  const { data: hhData } = await supabase
    .from('happy_hours')
    .select(`
      restaurant_id, description, start_time,
      restaurants!inner(id, name, description, best_for, categories, tier_id, market_id)
    `)
    .eq('restaurants.market_id', marketId)
    .eq('is_active', true)
    .contains('days_of_week', [dayName])
    .limit(50);

  // Fetch restaurants with an event today (any tier)
  const year = now.toLocaleDateString('en-US', { ...etLocale, year: 'numeric' });
  const month = now.toLocaleDateString('en-US', { ...etLocale, month: '2-digit' });
  const day = now.toLocaleDateString('en-US', { ...etLocale, day: '2-digit' });
  const todayStr = `${year}-${month}-${day}`;

  const { data: eventData } = await supabase
    .from('events')
    .select(`
      id, name, description, event_type, start_time,
      restaurant:restaurants!inner(id, name, description, best_for, categories, tier_id, market_id)
    `)
    .eq('restaurant.market_id', marketId)
    .eq('is_active', true)
    .or(`event_date.eq.${todayStr},is_recurring.eq.true`)
    .limit(50);

  // Filter recurring events to today's day
  const todaysEvents = (eventData || []).filter((e: any) => {
    if (e.event_date === todayStr) return true;
    return e.days_of_week?.includes(dayName);
  });

  // Build a deduplicated map of eligible restaurants with their context
  interface EligibleRestaurant {
    id: string;
    name: string;
    description?: string;
    best_for?: string[];
    categories?: string[];
    isPaid: boolean;
    hasHappyHour: boolean;
    hasEvent: boolean;
    hhDescription?: string;
    hhStartTime?: string;
    eventName?: string;
    eventStartTime?: string;
  }

  const eligibleMap = new Map<string, EligibleRestaurant>();

  // Add paid restaurants
  for (const r of paidRestaurants || []) {
    eligibleMap.set(r.id, {
      id: r.id,
      name: r.name,
      description: r.description,
      best_for: r.best_for,
      categories: r.categories,
      isPaid: true,
      hasHappyHour: false,
      hasEvent: false,
    });
  }

  // Add/enrich with happy hour restaurants
  for (const hh of hhData || []) {
    const r = (hh as any).restaurants;
    const existing = eligibleMap.get(r.id);
    if (existing) {
      existing.hasHappyHour = true;
      existing.hhDescription = hh.description;
      existing.hhStartTime = hh.start_time;
    } else {
      eligibleMap.set(r.id, {
        id: r.id,
        name: r.name,
        description: r.description,
        best_for: r.best_for,
        categories: r.categories,
        isPaid: PAID_TIER_IDS.includes(r.tier_id),
        hasHappyHour: true,
        hasEvent: false,
        hhDescription: hh.description,
        hhStartTime: hh.start_time,
      });
    }
  }

  // Add/enrich with event restaurants
  for (const ev of todaysEvents) {
    const r = (ev as any).restaurant;
    const existing = eligibleMap.get(r.id);
    if (existing) {
      existing.hasEvent = true;
      existing.eventName = (ev as any).name;
      existing.eventStartTime = (ev as any).start_time;
    } else {
      eligibleMap.set(r.id, {
        id: r.id,
        name: r.name,
        description: r.description,
        best_for: r.best_for,
        categories: r.categories,
        isPaid: PAID_TIER_IDS.includes(r.tier_id),
        hasHappyHour: false,
        hasEvent: true,
        eventName: (ev as any).name,
        eventStartTime: (ev as any).start_time,
      });
    }
  }

  const eligible = Array.from(eligibleMap.values());
  if (eligible.length === 0) {
    return { sent: 0, reason: 'No eligible restaurants (need paid tier or activity today)' };
  }

  // Sort by priority: paid+activity > paid > activity-only
  eligible.sort((a, b) => {
    const scoreA = (a.isPaid ? 2 : 0) + (a.hasHappyHour || a.hasEvent ? 1 : 0);
    const scoreB = (b.isPaid ? 2 : 0) + (b.hasHappyHour || b.hasEvent ? 1 : 0);
    return scoreB - scoreA;
  });

  console.log(`Today's Pick (${marketInfo.label}): ${eligible.length} eligible restaurants`);

  // ── Pick from eligible pool based on day-of-week theme ─────────────────────

  let restaurantId: string | null = null;
  let restaurantName = '';
  let notifBody = '';

  const formatTime = (timeStr: string) => {
    const [h] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${dh} ${suffix}`;
  };

  if (strategy.type === 'most_loved') {
    // Try votes first, but only from eligible restaurants
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data: voteData } = await supabase
      .from('votes')
      .select('restaurant_id')
      .eq('month', currentMonth);

    let picked: EligibleRestaurant | null = null;
    if (voteData?.length) {
      const eligibleIds = new Set(eligible.map(e => e.id));
      const tally = new Map<string, number>();
      for (const v of voteData) {
        if (eligibleIds.has(v.restaurant_id)) {
          tally.set(v.restaurant_id, (tally.get(v.restaurant_id) || 0) + 1);
        }
      }
      if (tally.size > 0) {
        const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
        const topN = sorted.slice(0, Math.min(5, sorted.length));
        const winnerId = topN[dayOfMonth % topN.length][0];
        picked = eligibleMap.get(winnerId) || null;
      }
    }
    if (!picked) picked = eligible[dayOfMonth % eligible.length];
    restaurantId = picked.id;
    restaurantName = picked.name;
    const extra = picked.best_for?.length ? ` Known for ${picked.best_for[0].toLowerCase()}.` : '';
    notifBody = `The community is loving ${picked.name} right now.${extra} Have you been?`;

  } else if (strategy.type === 'happy_hour') {
    // Prefer eligible restaurants that actually have a HH today
    const withHH = eligible.filter(e => e.hasHappyHour);
    const pool = withHH.length ? withHH : eligible;
    const picked = pool[dayOfMonth % pool.length];
    restaurantId = picked.id;
    restaurantName = picked.name;
    if (picked.hasHappyHour && picked.hhStartTime) {
      notifBody = picked.hhDescription
        ? `${picked.name}: ${picked.hhDescription} starting at ${formatTime(picked.hhStartTime)}`
        : `${picked.name} kicks off happy hour at ${formatTime(picked.hhStartTime)} — grab a seat before it fills up`;
    } else {
      notifBody = `Check out ${picked.name} today in ${marketInfo.label}!`;
    }

  } else if (strategy.type === 'hidden_gem') {
    // Non-paid restaurants with activity today — the underdogs worth discovering
    const gems = eligible.filter(e => !e.isPaid && (e.hasHappyHour || e.hasEvent));
    const pool = gems.length ? gems : eligible;
    const picked = pool[dayOfMonth % pool.length];
    restaurantId = picked.id;
    restaurantName = picked.name;
    notifBody = `Most people walk right past ${picked.name}. Today's your sign to finally try it.`;

  } else if (strategy.type === 'event_tonight') {
    // Prefer eligible restaurants with events
    const withEvents = eligible.filter(e => e.hasEvent);
    if (withEvents.length) {
      const picked = withEvents[dayOfMonth % withEvents.length];
      restaurantId = picked.id;
      restaurantName = picked.name;
      const timeStr = picked.eventStartTime ? ` at ${formatTime(picked.eventStartTime)}` : ' tonight';
      notifBody = `${picked.eventName} at ${picked.name}${timeStr}. Live entertainment in ${marketInfo.label} tonight`;
    } else {
      // No events — fall back to any eligible
      const picked = eligible[dayOfMonth % eligible.length];
      restaurantId = picked.id;
      restaurantName = picked.name;
      notifBody = `Check out ${picked.name} tonight in ${marketInfo.label}!`;
    }

  } else if (strategy.type === 'weekend_kickoff') {
    // Prefer bars/nightlife with happy hours for Friday
    const withHH = eligible.filter(e => e.hasHappyHour);
    const bars = (withHH.length ? withHH : eligible).filter(e =>
      e.categories?.some(c => ['bars', 'nightlife', 'rooftops'].includes(c))
    );
    const pool = bars.length ? bars : (withHH.length ? withHH : eligible);
    const picked = pool[dayOfMonth % pool.length];
    restaurantId = picked.id;
    restaurantName = picked.name;
    notifBody = `Weekend starts NOW. ${picked.name} is the place to be tonight in ${marketInfo.label}`;

  } else if (strategy.type === 'date_night') {
    // Prefer dinner/upscale spots
    const dinner = eligible.filter(e =>
      e.categories?.some(c => ['dinner', 'rooftops', 'fine dining'].includes(c))
    );
    const pool = dinner.length ? dinner : eligible;
    const picked = pool[dayOfMonth % pool.length];
    restaurantId = picked.id;
    restaurantName = picked.name;
    const tagline = picked.best_for?.length
      ? picked.best_for[0]
      : 'a perfect Saturday evening';
    notifBody = `Make tonight special. ${picked.name} is tonight's date night pick — perfect for ${tagline.toLowerCase()}.`;

  } else if (strategy.type === 'brunch') {
    // Prefer brunch spots
    const brunch = eligible.filter(e => e.categories?.includes('brunch'));
    const pool = brunch.length ? brunch : eligible;
    const picked = pool[dayOfMonth % pool.length];
    restaurantId = picked.id;
    restaurantName = picked.name;
    notifBody = `Sunday brunch sorted. ${picked.name} is today's top pick — treat yourself`;
  }

  if (!restaurantId) return { sent: 0, reason: 'No restaurant selected' };

  // ── Send only to tokens for this market's app — via gateway ──────────────

  const title = `${strategy.emoji} ${strategy.title}`;
  const groups = await getAllPushTokensGrouped(supabase);
  const tokens = groups.get(marketInfo.appSlug) || [];
  console.log(`Today's Pick (${marketInfo.label}): sending to ${tokens.length} tokens for app ${marketInfo.appSlug}`);

  if (tokens.length === 0) return { sent: 0, reason: `No push tokens for ${marketInfo.appSlug}` };

  const etDateStr2 = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const messages = tokens.map(token => ({
    to: token,
    sound: 'default' as const,
    title,
    body: notifBody,
    data: {
      screen: 'RestaurantDetail',
      restaurantId,
    },
  }));

  const gw = await sendViaGateway(supabase, {
    notificationType: 'todays_pick',
    marketSlug,
    messages,
    dedupKey: `todays_pick:${marketSlug}:${etDateStr2}`,
    details: { restaurant: restaurantName, strategy: strategy.type, app_slug: marketInfo.appSlug },
  });

  return {
    sent: gw.sent,
    restaurant: restaurantName,
    strategy: strategy.type,
    reason: gw.blocked ? gw.blockReason : undefined,
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
      // All endpoints below route through sendViaGateway() which enforces
      // quiet hours, dedup, and throttle automatically.

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
        const body = await req.json();
        const { title, summary, slug, app_slug, ai_name } = body;

        if (!title || !summary || !slug) {
          return new Response(JSON.stringify({ error: 'Missing title, summary, or slug' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const targetAppSlug = app_slug || 'tastelanc';
        const aiDisplayName = ai_name || 'Rosie';
        const truncatedSummary = summary.length > 120 ? summary.substring(0, 117) + '...' : summary;

        const groups = await getAllPushTokensGrouped(supabase);
        const tokens = groups.get(targetAppSlug) || [];

        const messages = tokens.map(token => ({
          to: token,
          sound: 'default' as const,
          title: `New from ${aiDisplayName}: ${title}`,
          body: truncatedSummary,
          data: {
            screen: 'BlogDetail',
            blogSlug: slug,
          },
        }));

        const blogNow = new Date();
        const blogDateStr = blogNow.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

        const gw = await sendViaGateway(supabase, {
          notificationType: 'new_blog_post',
          marketSlug: null,
          messages,
          dedupKey: `blog:${targetAppSlug}:${blogDateStr}:${slug}`,
          details: { title, slug, app_slug: targetAppSlug },
        });

        return new Response(JSON.stringify({ sent: gw.sent, total: gw.total, blocked: gw.blocked, reason: gw.blockReason }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'todays-pick': {
        let targetMarketSlug: string | undefined;
        try {
          const body = await req.json();
          targetMarketSlug = body.market_slug;
        } catch {
          // No body — process all markets (backward compat)
        }
        const result = await sendTodaysPick(supabase, targetMarketSlug);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'broadcast': {
        const body = await req.json();
        const { title, message, data } = body;

        if (!title || !message) {
          return new Response(JSON.stringify({ error: 'Missing title or message' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const broadcastResult = await sendToAllTokensViaGateway(
          supabase,
          'broadcast',
          (tokens) => tokens.map(token => ({
            to: token,
            sound: 'default' as const,
            title,
            body: message,
            data: data || {},
          })),
        );

        return new Response(JSON.stringify(broadcastResult), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'gateway': {
        // Direct gateway endpoint for Node.js callers
        const body = await req.json();
        const { notificationType, marketSlug: gwMarket, messages: gwMessages, dedupKey: gwDedup, skipThrottle: gwSkip, details: gwDetails } = body;

        if (!notificationType || !gwMessages?.length) {
          return new Response(JSON.stringify({ error: 'Missing notificationType or messages' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const gwResult = await sendViaGateway(supabase, {
          notificationType,
          marketSlug: gwMarket || null,
          messages: gwMessages,
          dedupKey: gwDedup,
          skipThrottle: gwSkip,
          details: gwDetails,
        });

        return new Response(JSON.stringify(gwResult), {
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
