-- Per-market Stripe price tracking
-- Allows dynamic lookup of Stripe price IDs by market + price_type
-- New markets automatically get prices via the create-event-promotion-prices script

CREATE TABLE IF NOT EXISTS public.market_stripe_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id),
  price_type TEXT NOT NULL,
  stripe_product_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(market_id, price_type)
);

ALTER TABLE public.market_stripe_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read market_stripe_prices"
  ON public.market_stripe_prices FOR SELECT USING (true);

CREATE POLICY "Service role full access market_stripe_prices"
  ON public.market_stripe_prices FOR ALL TO service_role USING (true) WITH CHECK (true);
