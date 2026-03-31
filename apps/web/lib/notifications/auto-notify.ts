/**
 * Auto-Notification System
 *
 * Automatically sends push notifications to all users in a market when
 * restaurant owners create high-value content (coupons, events, specials,
 * happy hours).
 *
 * Architecture:
 * - Called fire-and-forget from dashboard API routes after successful creation
 * - Fetches push tokens for the restaurant's market
 * - Builds market-scoped messages and sends via the centralized gateway
 * - Each notification is deduped by content item ID (one notif per item)
 * - Uses skipThrottle since these are event-driven, not scheduled
 *
 * Market isolation: Tokens are filtered by app_slug matching the restaurant's
 * market. validateMarketScope() is called before every send.
 */

import { createClient } from '@supabase/supabase-js';
import { sendNotification } from './gateway';
import { validateMarketScope, getAppSlugForMarket } from './market-guard';

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

interface RestaurantInfo {
  restaurantId: string;
  restaurantName: string;
  marketId: string;
}

interface CouponData {
  id: string;
  title: string;
  description?: string | null;
  discount_type: 'percentage' | 'dollar_amount' | 'bogo' | 'free_item' | 'custom';
  discount_value?: number | null;
  max_claims_total?: number | null;
}

interface EventData {
  id: string;
  name: string;
  event_type?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  performer_name?: string | null;
}

interface SpecialData {
  id: string;
  name: string;
  description?: string | null;
  special_price?: number | null;
  original_price?: number | null;
  discount_description?: string | null;
}

interface HappyHourData {
  id: string;
  name?: string | null;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  days_of_week?: string[];
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Resolve a market_id to its slug.
 */
async function getMarketSlug(marketId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('markets')
    .select('slug')
    .eq('id', marketId)
    .single();
  return data?.slug || null;
}

/**
 * Fetch all push tokens for a specific app_slug (i.e., one market).
 */
async function getTokensForAppSlug(appSlug: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('app_slug', appSlug);

  if (error || !data) {
    console.error('[AutoNotify] Failed to fetch tokens:', error);
    return [];
  }

  return data.map((t: { token: string }) => t.token);
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${ampm}` : `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const DAY_ABBREVS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

function formatDaysOfWeek(days: string[]): string {
  if (!days || days.length === 0) return '';
  if (days.length === 7) return 'every day';
  return days.map((d) => DAY_ABBREVS[d.toLowerCase()] || d).join(', ');
}

// ─────────────────────────────────────────────────────────
// MESSAGE BUILDERS
// ─────────────────────────────────────────────────────────

function buildCouponMessage(restaurant: RestaurantInfo, coupon: CouponData): { title: string; body: string } {
  const name = restaurant.restaurantName;

  let dealText = '';
  switch (coupon.discount_type) {
    case 'percentage':
      dealText = coupon.discount_value ? `${coupon.discount_value}% off` : 'a discount';
      break;
    case 'dollar_amount':
      dealText = coupon.discount_value ? `$${coupon.discount_value} off` : 'a discount';
      break;
    case 'bogo':
      dealText = 'Buy One Get One';
      break;
    case 'free_item':
      dealText = 'a free item';
      break;
    default:
      dealText = coupon.title;
  }

  let body = `${name} just dropped a coupon: ${dealText}!`;
  if (coupon.max_claims_total) {
    body += ` Hurry — only ${coupon.max_claims_total} available.`;
  } else {
    body += ' Claim yours before it\'s gone.';
  }

  return {
    title: `New Deal at ${name}`,
    body,
  };
}

function buildEventMessage(restaurant: RestaurantInfo, event: EventData): { title: string; body: string } {
  const name = restaurant.restaurantName;
  let body = `${name} is hosting ${event.name}`;

  if (event.event_date) {
    body += ` on ${formatEventDate(event.event_date)}`;
  }
  if (event.start_time) {
    body += ` at ${formatTime12h(event.start_time)}`;
  }
  body += '. Don\'t miss it!';

  if (event.performer_name) {
    body = `${event.performer_name} at ${name}`;
    if (event.event_date) {
      body += ` — ${formatEventDate(event.event_date)}`;
    }
    body += '. Don\'t miss it!';
  }

  return {
    title: `New Event at ${name}`,
    body,
  };
}

function buildSpecialMessage(restaurant: RestaurantInfo, special: SpecialData): { title: string; body: string } {
  const name = restaurant.restaurantName;

  let body = '';
  if (special.special_price && special.original_price && special.original_price > special.special_price) {
    const savings = (special.original_price - special.special_price).toFixed(0);
    body = `${name} just added "${special.name}" — save $${savings}!`;
  } else if (special.discount_description) {
    body = `${name} just added "${special.name}" — ${special.discount_description}.`;
  } else {
    body = `${name} just added a new special: "${special.name}". Check it out!`;
  }

  return {
    title: `New Special at ${name}`,
    body,
  };
}

function buildHappyHourMessage(restaurant: RestaurantInfo, happyHour: HappyHourData): { title: string; body: string } {
  const name = restaurant.restaurantName;

  let body = `${name} just launched a happy hour`;
  if (happyHour.start_time && happyHour.end_time) {
    body += ` from ${formatTime12h(happyHour.start_time)} to ${formatTime12h(happyHour.end_time)}`;
  }
  if (happyHour.days_of_week && happyHour.days_of_week.length > 0 && happyHour.days_of_week.length < 7) {
    body += ` on ${formatDaysOfWeek(happyHour.days_of_week)}`;
  }
  body += '!';

  return {
    title: `New Happy Hour at ${name}`,
    body,
  };
}

// ─────────────────────────────────────────────────────────
// SEND LOGIC (shared by all triggers)
// ─────────────────────────────────────────────────────────

async function sendAutoNotification(
  restaurant: RestaurantInfo,
  notificationType: string,
  dedupKey: string,
  message: { title: string; body: string },
  navigationData: Record<string, unknown>,
): Promise<void> {
  try {
    // 1. Resolve market slug
    const marketSlug = await getMarketSlug(restaurant.marketId);
    if (!marketSlug) {
      console.error(`[AutoNotify] Could not resolve market slug for market_id=${restaurant.marketId}`);
      return;
    }

    // 2. Get app_slug for this market
    const appSlug = await getAppSlugForMarket(marketSlug);
    if (!appSlug) {
      console.error(`[AutoNotify] No app_slug for market ${marketSlug}`);
      return;
    }

    // 3. Fetch tokens for this market's app
    const tokens = await getTokensForAppSlug(appSlug);
    if (tokens.length === 0) {
      console.log(`[AutoNotify] No tokens for ${appSlug}, skipping ${notificationType}`);
      return;
    }

    // 4. Validate market scope
    const validation = await validateMarketScope(marketSlug, appSlug, tokens.length, notificationType);
    if (!validation.valid) {
      console.error(`[AutoNotify] Market scope validation failed:`, validation.error);
      return;
    }

    // 5. Build messages
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default' as const,
      title: message.title,
      body: message.body,
      data: {
        screen: 'RestaurantDetail',
        restaurantId: restaurant.restaurantId,
        ...navigationData,
      },
    }));

    // 6. Send via gateway
    const result = await sendNotification({
      notificationType,
      marketSlug,
      messages,
      dedupKey,
      skipThrottle: true,
      details: {
        restaurant: restaurant.restaurantName,
        restaurant_id: restaurant.restaurantId,
        app_slug: appSlug,
        trigger: 'auto',
      },
    });

    if (result.blocked) {
      console.log(`[AutoNotify] ${notificationType} blocked: ${result.blockReason}`);
    } else {
      console.log(`[AutoNotify] ${notificationType} sent to ${result.sent}/${result.total} tokens for ${appSlug}`);
    }
  } catch (error) {
    // Fire-and-forget — log but never throw
    console.error(`[AutoNotify] Error sending ${notificationType}:`, error);
  }
}

// ─────────────────────────────────────────────────────────
// PUBLIC API — called from dashboard API routes
// ─────────────────────────────────────────────────────────

/**
 * Notify all users in the restaurant's market about a new coupon.
 * Call fire-and-forget after successful coupon creation.
 */
export function notifyCouponCreated(restaurant: RestaurantInfo, coupon: CouponData): void {
  const message = buildCouponMessage(restaurant, coupon);
  // Fire-and-forget — don't await
  sendAutoNotification(
    restaurant,
    'auto_coupon_created',
    `auto:coupon:${coupon.id}`,
    message,
    { tab: 'Coupons' },
  );
}

/**
 * Notify all users in the restaurant's market about a new event.
 */
export function notifyEventCreated(restaurant: RestaurantInfo, event: EventData): void {
  const message = buildEventMessage(restaurant, event);
  sendAutoNotification(
    restaurant,
    'auto_event_created',
    `auto:event:${event.id}`,
    message,
    { tab: 'Events' },
  );
}

/**
 * Notify all users in the restaurant's market about a new special.
 */
export function notifySpecialCreated(restaurant: RestaurantInfo, special: SpecialData): void {
  const message = buildSpecialMessage(restaurant, special);
  sendAutoNotification(
    restaurant,
    'auto_special_created',
    `auto:special:${special.id}`,
    message,
    { tab: 'Specials' },
  );
}

/**
 * Notify all users in the restaurant's market about a new happy hour.
 */
export function notifyHappyHourCreated(restaurant: RestaurantInfo, happyHour: HappyHourData): void {
  const message = buildHappyHourMessage(restaurant, happyHour);
  sendAutoNotification(
    restaurant,
    'auto_happy_hour_created',
    `auto:happy_hour:${happyHour.id}`,
    message,
    { tab: 'HappyHours' },
  );
}
