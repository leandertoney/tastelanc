import type { Config, Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { validateMarketScope } from '../../lib/notifications/market-guard';
import { sendNotification } from '../../lib/notifications/gateway';

const PAID_TIER_IDS = [
  '00000000-0000-0000-0000-000000000002', // premium
  '00000000-0000-0000-0000-000000000003', // elite
];

// 7 unique rotation types — one per day of week, zero repeats
const ROTATION_BY_DAY: Record<string, string> = {
  monday:    'whos_open_tonight',
  tuesday:   'deals_spotlight',
  wednesday: 'hidden_gem',
  thursday:  'trivia_night',
  friday:    'weekend_vibes',
  saturday:  'live_music',
  sunday:    'trending_this_week',
};

interface DigestContent {
  title: string;
  body: string;
  screen: string;
  restaurantId?: string;
  restaurantName?: string;
  meta?: Record<string, unknown>;
}

// ─── Builder: Who's Open Tonight (Monday) ────────────────────────────────────

async function buildWhosOpen(
  supabase: any,
  marketId: string,
): Promise<DigestContent | null> {
  const now = new Date();
  const dayOfWeek = now
    .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' })
    .toLowerCase();

  const { data: openHours, error } = await supabase
    .from('restaurant_hours')
    .select('restaurant_id, restaurant:restaurants!inner(id, name, market_id, is_active)')
    .eq('restaurant.market_id', marketId)
    .eq('restaurant.is_active', true)
    .eq('day_of_week', dayOfWeek)
    .eq('is_closed', false);

  if (error) {
    console.error('[Evening Digest] buildWhosOpen error:', error);
    return null;
  }

  const openRestaurants = openHours || [];
  const count = openRestaurants.length;

  if (count === 0) return null;

  return {
    title: "Who's Open Tonight?",
    body: `${count} spot${count === 1 ? '' : 's'} open tonight — tap to find your pick`,
    screen: 'Explore',
    meta: { open_count: count },
  };
}

// ─── Builder: Deals Spotlight (Tuesday) ──────────────────────────────────────

async function buildDealsSpotlight(
  supabase: any,
  marketId: string,
  dayOfWeek: string,
  dayOfMonth: number,
): Promise<DigestContent | null> {
  // Try specials first
  const { data: specials } = await supabase
    .from('specials')
    .select('id, name, discount_description, restaurant:restaurants!inner(id, name, tier_id, market_id, is_active)')
    .eq('restaurant.market_id', marketId)
    .eq('restaurant.is_active', true)
    .eq('is_active', true)
    .contains('days_of_week', [dayOfWeek]);

  const specialList = (specials || []) as any[];

  if (specialList.length > 0) {
    // Prefer paid tier, then deterministic pick
    const paid = specialList.filter((s) => PAID_TIER_IDS.includes(s.restaurant?.tier_id));
    const pool = paid.length > 0 ? paid : specialList;
    const pick = pool[dayOfMonth % pool.length];

    const desc = pick.discount_description || pick.name;
    return {
      title: 'Today\'s Deal',
      body: `${pick.restaurant.name}: ${desc}`,
      screen: 'RestaurantDetail',
      restaurantId: pick.restaurant.id,
      restaurantName: pick.restaurant.name,
      meta: { special_id: pick.id, source: 'specials' },
    };
  }

  // Fallback: coupons
  const { data: coupons } = await supabase
    .from('coupons')
    .select('id, title, discount_type, discount_value, restaurant:restaurants!inner(id, name, market_id, is_active)')
    .eq('restaurant.market_id', marketId)
    .eq('restaurant.is_active', true)
    .eq('is_active', true);

  const couponList = (coupons || []) as any[];
  if (couponList.length === 0) return null;

  // Prefer BOGO > percent_off > dollar_off > others
  const COUPON_PRIORITY: Record<string, number> = { bogo: 0, percent_off: 1, dollar_off: 2, free_item: 3, custom: 4 };
  couponList.sort((a, b) => (COUPON_PRIORITY[a.discount_type] ?? 5) - (COUPON_PRIORITY[b.discount_type] ?? 5));
  const pick = couponList[dayOfMonth % couponList.length];

  return {
    title: 'Today\'s Deal',
    body: `${pick.restaurant.name}: ${pick.title}`,
    screen: 'RestaurantDetail',
    restaurantId: pick.restaurant.id,
    restaurantName: pick.restaurant.name,
    meta: { coupon_id: pick.id, source: 'coupons' },
  };
}

// ─── Builder: Hidden Gem (Wednesday / Sunday) ─────────────────────────────────

async function buildHiddenGem(
  supabase: any,
  marketId: string,
  dayOfWeek: string,
  dayOfMonth: number,
): Promise<DigestContent | null> {
  // Non-paid restaurants with any activity today
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, best_for, categories, tier_id')
    .eq('market_id', marketId)
    .eq('is_active', true)
    .not('tier_id', 'in', `(${PAID_TIER_IDS.join(',')})`);

  const candidates = (restaurants || []) as any[];
  if (candidates.length === 0) return null;

  // Filter to those with activity today (special, event, or happy hour)
  const restaurantIds = candidates.map((r: any) => r.id);

  const [specialsRes, eventsRes, hhRes] = await Promise.all([
    supabase
      .from('specials')
      .select('restaurant_id')
      .in('restaurant_id', restaurantIds)
      .eq('is_active', true)
      .contains('days_of_week', [dayOfWeek]),
    supabase
      .from('events')
      .select('restaurant_id')
      .in('restaurant_id', restaurantIds)
      .eq('is_active', true)
      .contains('days_of_week', [dayOfWeek]),
    supabase
      .from('happy_hours')
      .select('restaurant_id')
      .in('restaurant_id', restaurantIds)
      .eq('is_active', true)
      .contains('days_of_week', [dayOfWeek]),
  ]);

  const activeIds = new Set([
    ...((specialsRes.data || []) as any[]).map((r: any) => r.restaurant_id),
    ...((eventsRes.data || []) as any[]).map((r: any) => r.restaurant_id),
    ...((hhRes.data || []) as any[]).map((r: any) => r.restaurant_id),
  ]);

  let pool = candidates.filter((r: any) => activeIds.has(r.id));

  // Fall back to any non-paid active restaurant if no activity found
  if (pool.length === 0) pool = candidates;
  if (pool.length === 0) return null;

  const pick = pool[dayOfMonth % pool.length];

  return {
    title: 'Hidden Gem',
    body: `${pick.name} — have you been? They've got something going on today.`,
    screen: 'RestaurantDetail',
    restaurantId: pick.id,
    restaurantName: pick.name,
    meta: { source: 'hidden_gem', had_activity: activeIds.has(pick.id) },
  };
}

// ─── Builder: Trivia Night (Thursday) ────────────────────────────────────────

async function buildTriviaTonight(
  supabase: any,
  marketId: string,
  dayOfWeek: string,
  dayOfMonth: number,
): Promise<DigestContent | null> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const { data: events } = await supabase
    .from('events')
    .select('id, name, start_time, restaurant:restaurants!inner(id, name, market_id, is_active)')
    .eq('restaurant.market_id', marketId)
    .eq('restaurant.is_active', true)
    .eq('is_active', true)
    .eq('event_type', 'trivia')
    .or(`event_date.eq.${today},and(is_recurring.eq.true,days_of_week.cs.{"${dayOfWeek}"})`);

  const triviaEvents = (events || []) as any[];
  if (triviaEvents.length === 0) return null;

  if (triviaEvents.length === 1) {
    const ev = triviaEvents[0];
    const timeStr = ev.start_time ? formatTime(ev.start_time) : 'tonight';
    return {
      title: 'Trivia Night',
      body: `🎯 ${ev.restaurant.name} — ${timeStr}. Who's your team?`,
      screen: 'RestaurantDetail',
      restaurantId: ev.restaurant.id,
      restaurantName: ev.restaurant.name,
      meta: { event_id: ev.id, count: 1 },
    };
  }

  const count = triviaEvents.length;
  const pick = triviaEvents[dayOfMonth % count];
  return {
    title: 'Trivia Night Roundup',
    body: `🎯 ${count} trivia nights tonight — ${pick.restaurant.name} and more. Pick your spot.`,
    screen: 'Explore',
    meta: { count, sample_restaurant: pick.restaurant.name },
  };
}

// ─── Builder: Live Music (Saturday) ──────────────────────────────────────────

async function buildLiveMusic(
  supabase: any,
  marketId: string,
  dayOfWeek: string,
  dayOfMonth: number,
): Promise<DigestContent | null> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const { data: events } = await supabase
    .from('events')
    .select('id, name, start_time, performer_name, restaurant:restaurants!inner(id, name, market_id, is_active)')
    .eq('restaurant.market_id', marketId)
    .eq('restaurant.is_active', true)
    .eq('is_active', true)
    .eq('event_type', 'music')
    .or(`event_date.eq.${today},and(is_recurring.eq.true,days_of_week.cs.{"${dayOfWeek}"})`);

  const musicEvents = (events || []) as any[];
  if (musicEvents.length === 0) return null;

  // Prefer events with a performer name
  const withPerformer = musicEvents.filter((e: any) => e.performer_name);
  const pool = withPerformer.length > 0 ? withPerformer : musicEvents;
  const pick = pool[dayOfMonth % pool.length];

  const timeStr = pick.start_time ? formatTime(pick.start_time) : 'tonight';
  const performer = pick.performer_name ? `${pick.performer_name} at ` : '';

  return {
    title: 'Live Music Tonight',
    body: `🎵 ${performer}${pick.restaurant.name} — ${timeStr}`,
    screen: 'RestaurantDetail',
    restaurantId: pick.restaurant.id,
    restaurantName: pick.restaurant.name,
    meta: { event_id: pick.id, performer: pick.performer_name, total_music_events: musicEvents.length },
  };
}

// ─── Builder: Weekend Vibes (Friday) ─────────────────────────────────────────

async function buildWeekendVibes(
  supabase: any,
  marketId: string,
  dayOfWeek: string,
  dayOfMonth: number,
): Promise<DigestContent | null> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const { data: events } = await supabase
    .from('events')
    .select('id, name, event_type, start_time, performer_name, restaurant:restaurants!inner(id, name, market_id, is_active)')
    .eq('restaurant.market_id', marketId)
    .eq('restaurant.is_active', true)
    .eq('is_active', true)
    .in('event_type', ['music', 'trivia', 'bingo'])
    .or(`event_date.eq.${today},and(is_recurring.eq.true,days_of_week.cs.{"${dayOfWeek}"})`);

  const evList = (events || []) as any[];

  if (evList.length > 0) {
    const count = evList.length;
    // Pick one highlight event deterministically
    const pick = evList[dayOfMonth % count];
    const timeStr = pick.start_time ? formatTime(pick.start_time) : 'tonight';
    const performer = pick.performer_name ? ` (${pick.performer_name})` : '';

    const body = count === 1
      ? `🔥 ${pick.restaurant.name}${performer} — ${timeStr}. Your weekend starts now.`
      : `🔥 ${count} events tonight — ${pick.restaurant.name} and more. Tap to explore.`;

    return {
      title: 'Your Weekend Starts Now',
      body,
      screen: count === 1 ? 'RestaurantDetail' : 'Explore',
      restaurantId: count === 1 ? pick.restaurant.id : undefined,
      restaurantName: count === 1 ? pick.restaurant.name : undefined,
      meta: { event_count: count, event_type: pick.event_type },
    };
  }

  // Fallback: bars/nightlife with happy hours today
  const { data: hhBars } = await supabase
    .from('happy_hours')
    .select('restaurant_id, restaurant:restaurants!inner(id, name, categories, market_id, is_active, tier_id)')
    .eq('restaurant.market_id', marketId)
    .eq('restaurant.is_active', true)
    .eq('is_active', true)
    .contains('days_of_week', [dayOfWeek]);

  const barList = (hhBars || []).filter((h: any) =>
    Array.isArray(h.restaurant?.categories) &&
    h.restaurant.categories.some((c: string) => ['bar', 'nightlife', 'brewery', 'taproom'].includes(c.toLowerCase()))
  ) as any[];

  if (barList.length === 0) return null;

  const pick = barList[dayOfMonth % barList.length];
  return {
    title: 'Your Weekend Starts Now',
    body: `🔥 Happy hour at ${pick.restaurant.name} — tap to see the details`,
    screen: 'RestaurantDetail',
    restaurantId: pick.restaurant.id,
    restaurantName: pick.restaurant.name,
    meta: { source: 'bar_happy_hour' },
  };
}

// ─── Builder: Trending This Week (Sunday) ────────────────────────────────────

async function buildTrending(
  supabase: any,
  marketId: string,
): Promise<DigestContent | null> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: checkins } = await supabase
    .from('checkins')
    .select('restaurant_id, restaurant:restaurants!inner(id, name, market_id, is_active)')
    .eq('restaurant.market_id', marketId)
    .eq('restaurant.is_active', true)
    .gte('created_at', sevenDaysAgo.toISOString());

  const checkinList = (checkins || []) as any[];
  if (checkinList.length === 0) return null;

  // Count by restaurant
  const counts: Record<string, { count: number; name: string; id: string }> = {};
  for (const c of checkinList) {
    const id = c.restaurant_id;
    if (!counts[id]) {
      counts[id] = { count: 0, name: c.restaurant.name, id };
    }
    counts[id].count++;
  }

  const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
  const top = sorted[0];

  return {
    title: 'Trending This Week',
    body: `🏆 ${top.name} is the most visited spot this week — worth the hype?`,
    screen: 'RestaurantDetail',
    restaurantId: top.id,
    restaurantName: top.name,
    meta: { checkin_count: top.count, total_restaurants: sorted.length },
  };
}

// ─── Fallback chain orchestrator ─────────────────────────────────────────────

async function buildDigestContent(
  supabase: any,
  marketId: string,
  rotationType: string,
  dayOfWeek: string,
  dayOfMonth: number,
): Promise<DigestContent | null> {
  switch (rotationType) {
    case 'whos_open_tonight':
      return (
        (await buildWhosOpen(supabase, marketId)) ??
        (await buildDealsSpotlight(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        null
      );

    case 'deals_spotlight':
      return (
        (await buildDealsSpotlight(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        (await buildHiddenGem(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        null
      );

    case 'hidden_gem':
      return (
        (await buildHiddenGem(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        (await buildDealsSpotlight(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        null
      );

    case 'trivia_night':
      return (
        (await buildTriviaTonight(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        (await buildEventsTonight(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        (await buildDealsSpotlight(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        null
      );

    case 'weekend_vibes':
      return (
        (await buildWeekendVibes(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        (await buildEventsTonight(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        null
      );

    case 'live_music':
      return (
        (await buildLiveMusic(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        (await buildEventsTonight(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        (await buildWeekendVibes(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        null
      );

    case 'trending_this_week':
      return (
        (await buildTrending(supabase, marketId)) ??
        (await buildHiddenGem(supabase, marketId, dayOfWeek, dayOfMonth)) ??
        null
      );

    default:
      return null;
  }
}

// ─── Generic events tonight (used as fallback in multiple chains) ─────────────

async function buildEventsTonight(
  supabase: any,
  marketId: string,
  dayOfWeek: string,
  dayOfMonth: number,
): Promise<DigestContent | null> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const { data: events } = await supabase
    .from('events')
    .select('id, name, event_type, start_time, performer_name, restaurant:restaurants!inner(id, name, tier_id, market_id, is_active)')
    .eq('restaurant.market_id', marketId)
    .eq('restaurant.is_active', true)
    .eq('is_active', true)
    .or(`event_date.eq.${today},and(is_recurring.eq.true,days_of_week.cs.{"${dayOfWeek}"})`);

  const evList = (events || []) as any[];
  if (evList.length === 0) return null;

  // Priority: music > trivia > bingo > promotion > other
  const TYPE_PRIORITY: Record<string, number> = { music: 0, trivia: 1, bingo: 2, promotion: 3 };
  evList.sort((a, b) => (TYPE_PRIORITY[a.event_type] ?? 4) - (TYPE_PRIORITY[b.event_type] ?? 4));

  const paid = evList.filter((e: any) => PAID_TIER_IDS.includes(e.restaurant?.tier_id));
  const pool = paid.length > 0 ? paid : evList;
  const pick = pool[dayOfMonth % pool.length];

  const timeStr = pick.start_time ? formatTime(pick.start_time) : 'tonight';
  const performer = pick.performer_name ? ` (${pick.performer_name})` : '';

  return {
    title: 'Tonight\'s Events',
    body: `🎉 ${pick.restaurant.name}${performer} — ${pick.event_type} at ${timeStr}`,
    screen: 'RestaurantDetail',
    restaurantId: pick.restaurant.id,
    restaurantName: pick.restaurant.name,
    meta: { event_id: pick.id, total_events: evList.length },
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatTime(timeStr: string): string {
  const [hh, mm] = timeStr.split(':').map(Number);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const hour = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
  return mm === 0 ? `${hour} ${suffix}` : `${hour}:${String(mm).padStart(2, '0')} ${suffix}`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export default async function handler(req: Request, context: Context) {
  console.log('[Evening Digest] Running daily rotation...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Resolve market
    const marketSlug = process.env.NEXT_PUBLIC_MARKET_SLUG || 'lancaster-pa';
    const { data: marketRow } = await supabase
      .from('markets')
      .select('id, app_slug, name')
      .eq('slug', marketSlug)
      .eq('is_active', true)
      .single();

    if (!marketRow) {
      console.error(`[Evening Digest] Market "${marketSlug}" not found`);
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

    const dayOfMonth = parseInt(
      now.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'America/New_York' }),
      10
    );

    const etDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

    const rotationType = ROTATION_BY_DAY[dayOfWeek];
    console.log(`[Evening Digest] Day: ${dayOfWeek}, rotation: ${rotationType}`);

    if (!rotationType) {
      console.error(`[Evening Digest] No rotation type for day: ${dayOfWeek}`);
      return new Response(
        JSON.stringify({ sent: 0, error: 'Unknown day' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build content with fallback chain
    const content = await buildDigestContent(supabase, marketId, rotationType, dayOfWeek, dayOfMonth);

    if (!content) {
      console.log(`[Evening Digest] No content available for ${rotationType} on ${dayOfWeek}`);
      return new Response(
        JSON.stringify({ sent: 0, message: `No content for ${rotationType}` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Evening Digest] Content: "${content.title}" — "${content.body}"`);

    // Fetch push tokens for this market's app
    const targetAppSlug = marketRow.app_slug || 'tastelanc';
    const { data: tokenData, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('app_slug', targetAppSlug);

    if (tokenError || !tokenData || tokenData.length === 0) {
      console.log(`[Evening Digest] No push tokens for ${targetAppSlug}`);
      return new Response(
        JSON.stringify({ sent: 0, message: `No push tokens for ${targetAppSlug}` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tokens = tokenData.map((t) => t.token);

    // Market guard
    const guard = await validateMarketScope(marketSlug, targetAppSlug, tokens.length, 'evening_digest');
    if (!guard.valid) {
      console.error(`[Evening Digest] ${guard.error}`);
      return new Response(
        JSON.stringify({ sent: 0, error: guard.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build push messages
    const data: Record<string, unknown> = { screen: content.screen };
    if (content.restaurantId) data.restaurantId = content.restaurantId;

    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default' as const,
      title: content.title,
      body: content.body,
      data,
    }));

    console.log(`[Evening Digest] Sending ${messages.length} messages (${rotationType}) via gateway`);

    const gw = await sendNotification({
      notificationType: 'evening_digest',
      marketSlug,
      messages,
      dedupKey: `evening_digest:${marketSlug}:${etDateStr}`,
      details: {
        market_slug: marketSlug,
        app_slug: targetAppSlug,
        rotation_type: rotationType,
        day_of_week: dayOfWeek,
        restaurant: content.restaurantName,
        ...content.meta,
      },
    });

    if (gw.blocked) {
      console.log(`[Evening Digest] Blocked by gateway: ${gw.blockReason}`);
      return new Response(
        JSON.stringify({ sent: 0, message: gw.blockReason }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Evening Digest] Sent ${gw.sent}/${gw.total} notifications (${rotationType})`);

    return new Response(
      JSON.stringify({
        sent: gw.sent,
        rotation_type: rotationType,
        title: content.title,
        restaurant: content.restaurantName,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Evening Digest] Error:', error);

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await supabase.from('notification_logs').insert({
        job_type: 'evening_digest',
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

// Fire once daily at 2 PM ET.
// 2 PM EDT = 18:00 UTC, 2 PM EST = 19:00 UTC — cover both with a range.
// Dedup key (evening_digest:market:date) ensures only the first invocation sends.
export const config: Config = {
  schedule: '0 18-19 * * *',
};
