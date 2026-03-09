import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Look up the Stripe Price ID for event promotion in a specific market.
 * Prices are stored in market_stripe_prices and created per-market
 * via scripts/create-event-promotion-prices.ts.
 *
 * Falls back to the static EVENT_PROMOTION_PRICE_ID env var if no
 * market-specific price is found.
 */
export async function getEventPromotionPriceId(
  supabase: SupabaseClient,
  marketId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('market_stripe_prices')
    .select('stripe_price_id')
    .eq('market_id', marketId)
    .eq('price_type', 'event_promotion')
    .eq('is_active', true)
    .single();

  if (!error && data) {
    return data.stripe_price_id;
  }

  // Fallback to static env var
  const fallback = process.env.STRIPE_PRICE_EVENT_PROMOTION;
  if (fallback) {
    return fallback;
  }

  console.error(`No event_promotion price found for market ${marketId}`);
  return null;
}
