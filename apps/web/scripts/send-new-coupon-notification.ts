/**
 * One-shot script: send a push notification for a specific coupon.
 *
 * Usage:
 *   npx tsx scripts/send-new-coupon-notification.ts <coupon-id>
 *
 * Example:
 *   npx tsx scripts/send-new-coupon-notification.ts bcaccafb-0975-4134-8e3e-2531a7eb3312
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const couponId = process.argv[2];
if (!couponId) {
  console.error('Usage: npx tsx scripts/send-new-coupon-notification.ts <coupon-id>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  // Fetch the coupon with restaurant + market info
  const { data: coupon, error: couponError } = await supabase
    .from('coupons')
    .select('id, title, discount_type, discount_value, restaurant:restaurants!inner(id, name, market_id, market:markets!inner(id, slug, app_slug))')
    .eq('id', couponId)
    .eq('is_active', true)
    .single();

  if (couponError || !coupon) {
    console.error('Coupon not found or not active:', couponError?.message);
    process.exit(1);
  }

  const restaurant = coupon.restaurant as any;
  const market = restaurant?.market as any;
  const restaurantName = restaurant?.name || 'a local restaurant';
  const marketSlug = market?.slug;
  const appSlug = market?.app_slug;
  const restaurantId = restaurant?.id;

  if (!appSlug || !marketSlug) {
    console.error('Could not resolve app_slug or market slug for this coupon');
    process.exit(1);
  }

  const discountLabel =
    coupon.discount_type === 'dollar_off' && coupon.discount_value
      ? `$${coupon.discount_value} off`
      : coupon.discount_type === 'percent_off' && coupon.discount_value
      ? `${coupon.discount_value}% off`
      : coupon.discount_type === 'bogo'
      ? 'a BOGO deal'
      : coupon.discount_type === 'free_item'
      ? 'a free item'
      : 'a new deal';

  console.log(`\nCoupon: ${coupon.title} (${discountLabel})`);
  console.log(`Restaurant: ${restaurantName}`);
  console.log(`Market: ${marketSlug} → app: ${appSlug}`);

  // Get push tokens for this market's app
  const { data: tokenData, error: tokenError } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('app_slug', appSlug);

  if (tokenError || !tokenData?.length) {
    console.error(`No push tokens found for app_slug: ${appSlug}`);
    process.exit(1);
  }

  const tokens = tokenData.map((t) => t.token);
  console.log(`\nSending to ${tokens.length} devices on ${appSlug}...`);

  const title = `New deal at ${restaurantName}!`;
  const body = `Get ${discountLabel} — tap to claim before it's gone.`;

  // Send via Expo Push API in batches of 100
  const BATCH_SIZE = 100;
  let totalSent = 0;
  let totalFailed = 0;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const messages = batch.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { screen: 'RestaurantDetail', restaurantId },
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    const json = await res.json() as any;
    const results: any[] = Array.isArray(json.data) ? json.data : [json];
    const ok = results.filter((r) => r.status === 'ok').length;
    const failed = results.filter((r) => r.status !== 'ok').length;
    totalSent += ok;
    totalFailed += failed;

    if (failed > 0) {
      const errors = results.filter((r) => r.status !== 'ok');
      console.warn(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${ok} sent, ${failed} failed`, errors.slice(0, 3));
    } else {
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${ok} sent`);
    }
  }

  console.log(`\nDone. Total sent: ${totalSent}, failed: ${totalFailed}`);

  // Log to notification_logs
  await supabase.from('notification_logs').insert({
    job_type: 'new_coupon_alert',
    market_slug: marketSlug,
    status: 'success',
    details: {
      coupon_id: couponId,
      restaurant: restaurantName,
      discount_label: discountLabel,
      tokens_targeted: tokens.length,
      sent: totalSent,
      failed: totalFailed,
      triggered_by: 'manual_script',
    },
  });

  console.log('Logged to notification_logs.');
}

main().catch((e) => { console.error(e); process.exit(1); });
