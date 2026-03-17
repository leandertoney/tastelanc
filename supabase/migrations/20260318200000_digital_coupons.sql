-- Digital Coupons System
-- Restaurants create coupons, users claim them in-app, redeem with rotating codes at the restaurant.
-- No POS integration needed. Restaurants see anonymized analytics only (no user PII).

-- ============================================================================
-- Table: coupons (restaurant-created offers)
-- ============================================================================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent_off', 'dollar_off', 'bogo', 'free_item', 'custom')),
  discount_value NUMERIC,
  original_price NUMERIC,
  image_url TEXT,

  -- Availability
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  days_of_week TEXT[] DEFAULT '{}',
  start_time TIME,
  end_time TIME,

  -- Limits
  max_claims_total INTEGER,
  max_claims_per_user INTEGER DEFAULT 1,
  claims_count INTEGER DEFAULT 0,

  -- State
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Table: coupon_claims (user claims + redemptions)
-- ============================================================================
CREATE TABLE public.coupon_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- User email captured for platform use ONLY — never exposed to restaurants
  user_email TEXT NOT NULL,

  -- Two-phase redemption tracking
  status TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'redeemed', 'expired', 'cancelled')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ,
  redeemed_by_staff TEXT,

  -- Anti-abuse: HMAC seed for rotating verification codes
  claim_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- One claim per user per coupon
  UNIQUE(coupon_id, user_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_coupons_restaurant ON public.coupons(restaurant_id);
CREATE INDEX idx_coupons_active_dates ON public.coupons(is_active, start_date, end_date);
CREATE INDEX idx_coupon_claims_user ON public.coupon_claims(user_id);
CREATE INDEX idx_coupon_claims_coupon ON public.coupon_claims(coupon_id);
CREATE INDEX idx_coupon_claims_status ON public.coupon_claims(status) WHERE status = 'claimed';

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_claims ENABLE ROW LEVEL SECURITY;

-- Anyone can browse active coupons
CREATE POLICY "Anyone can view active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true);

-- Restaurant owners can manage their coupons (via service role for writes, but SELECT for dashboard)
CREATE POLICY "Restaurant owners can view all their coupons"
  ON public.coupons FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

-- Users can view their own claims
CREATE POLICY "Users can view their own claims"
  ON public.coupon_claims FOR SELECT
  USING (user_id = auth.uid());

-- Restaurant owners can view AGGREGATE claim data for their coupons (for analytics)
-- Note: The API layer ensures only aggregate data is returned, never individual PII
CREATE POLICY "Restaurant owners can view claims for their coupons"
  ON public.coupon_claims FOR SELECT
  USING (
    coupon_id IN (
      SELECT c.id FROM public.coupons c
      JOIN public.restaurants r ON r.id = c.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

-- Service role handles all writes (INSERT, UPDATE, DELETE)
-- This follows the established pattern used by specials, photos, etc.

-- ============================================================================
-- Updated_at trigger (reuse existing function if available)
-- ============================================================================
DO $$
BEGIN
  -- Create the trigger function if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END
$$;

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
