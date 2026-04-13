import type { Config, Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { validateMarketScope } from '../../lib/notifications/market-guard';
import { sendNotification } from '../../lib/notifications/gateway';

/**
 * New Coupon Alerts Netlify Scheduled Function
 *
 * Runs every hour. Checks for coupons created in the last 25 hours (slightly
 * wider than the 24h window to avoid missing coupons at hour boundaries).
 * Sends a push notification to all users in that market, once per coupon
 * (deduped by coupon ID via the gateway dedupKey).
 */
export default async function handler(req: Request, context: Context) {
  console.log('[New Coupon Alerts] Checking for new coupons...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all active markets
    const { data: markets, error: marketsError } = await supabase
      .from('markets')
      .select('id, name, slug, app_slug')
      .eq('is_active', true);

    if (marketsError || !markets?.length) {
      console.error('[New Coupon Alerts] Failed to fetch markets:', marketsError);
      return new Response(JSON.stringify({ sent: 0, error: 'No markets found' }), { status: 500 });
    }

    // 25-hour window to avoid gaps at hour boundaries
    const windowStart = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

    let totalSent = 0;

    for (const market of markets) {
      const marketId = market.id;
      const marketSlug = market.slug;
      const appSlug = market.app_slug;

      if (!appSlug) {
        console.log(`[New Coupon Alerts] Skipping market ${marketSlug} — no app_slug`);
        continue;
      }

      // Find new active coupons for this market created in the last 25 hours
      // Exclude coupons with send_notification = false (promotional/informational deals)
      const { data: coupons, error: couponsError } = await supabase
        .from('coupons')
        .select('id, title, discount_type, discount_value, restaurant:restaurants!inner(id, name, market_id)')
        .eq('is_active', true)
        .eq('send_notification', true)
        .eq('restaurant.market_id', marketId)
        .gte('created_at', windowStart)
        .order('created_at', { ascending: false });

      if (couponsError) {
        console.error(`[New Coupon Alerts] Error fetching coupons for ${marketSlug}:`, couponsError);
        continue;
      }

      if (!coupons?.length) {
        console.log(`[New Coupon Alerts] No new coupons for ${marketSlug}`);
        continue;
      }

      // Get push tokens for this market's app
      const { data: tokenData, error: tokenError } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('app_slug', appSlug);

      if (tokenError || !tokenData?.length) {
        console.log(`[New Coupon Alerts] No push tokens for ${appSlug}`);
        continue;
      }

      const tokens = tokenData.map((t) => t.token);

      // Market guard
      const guard = await validateMarketScope(marketSlug, appSlug, tokens.length, 'new_coupon_alert');
      if (!guard.valid) {
        console.error(`[New Coupon Alerts] ${guard.error}`);
        continue;
      }

      // Send one notification per new coupon (deduped — won't re-send if already sent today)
      for (const coupon of coupons) {
        const restaurantName = (coupon.restaurant as any)?.name || 'a local restaurant';

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

        const title = `New deal at ${restaurantName}!`;
        const body = `Get ${discountLabel} — tap to claim before it's gone.`;

        const messages = tokens.map((token) => ({
          to: token,
          sound: 'default' as const,
          title,
          body,
          data: { screen: 'RestaurantDetail', restaurantId: (coupon.restaurant as any)?.id },
        }));

        const dedupKey = `new_coupon:${coupon.id}`;

        console.log(`[New Coupon Alerts] Sending ${messages.length} messages for coupon ${coupon.id} (${restaurantName})`);

        const gw = await sendNotification({
          notificationType: 'new_coupon_alert',
          marketSlug,
          messages,
          dedupKey,
          details: {
            market_slug: marketSlug,
            app_slug: appSlug,
            coupon_id: coupon.id,
            restaurant: restaurantName,
            discount_label: discountLabel,
          },
        });

        if (gw.blocked) {
          console.log(`[New Coupon Alerts] Blocked for coupon ${coupon.id}: ${gw.blockReason}`);
        } else {
          console.log(`[New Coupon Alerts] Sent ${gw.sent}/${gw.total} for coupon ${coupon.id}`);
          totalSent += gw.sent;
        }
      }
    }

    return new Response(JSON.stringify({ sent: totalSent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[New Coupon Alerts] Unexpected error:', error);
    return new Response(JSON.stringify({ sent: 0, error: String(error) }), { status: 500 });
  }
}

// Run every hour
export const config: Config = {
  schedule: '0 * * * *',
};
