-- Self-Promoters Feature Migration
-- Adds support for DJs, musicians, and performers to promote their events

-- =====================
-- SELF PROMOTERS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.self_promoters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Profile info
  name TEXT NOT NULL,                    -- Artist/DJ/Band name
  slug TEXT NOT NULL UNIQUE,             -- For artist page URL
  bio TEXT,                              -- Artist bio
  genre TEXT,                            -- Music genre (e.g., "Rock", "DJ/EDM", "Jazz")
  profile_image_url TEXT,                -- Profile picture

  -- Contact & social
  email TEXT,
  phone TEXT,
  website TEXT,
  instagram TEXT,

  -- Subscription
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- MODIFY EVENTS TABLE
-- =====================

-- Add self_promoter_id column
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS self_promoter_id UUID REFERENCES public.self_promoters(id) ON DELETE CASCADE;

-- Make restaurant_id nullable (events can belong to either restaurant OR self_promoter)
ALTER TABLE public.events
  ALTER COLUMN restaurant_id DROP NOT NULL;

-- Add check constraint: event must belong to either restaurant OR self_promoter (exactly one)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_owner_check'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_owner_check
      CHECK (
        (restaurant_id IS NOT NULL AND self_promoter_id IS NULL) OR
        (restaurant_id IS NULL AND self_promoter_id IS NOT NULL)
      );
  END IF;
END $$;

-- =====================
-- INDEXES
-- =====================

CREATE INDEX IF NOT EXISTS idx_self_promoters_owner ON public.self_promoters(owner_id);
CREATE INDEX IF NOT EXISTS idx_self_promoters_slug ON public.self_promoters(slug);
CREATE INDEX IF NOT EXISTS idx_self_promoters_active ON public.self_promoters(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_events_self_promoter ON public.events(self_promoter_id) WHERE self_promoter_id IS NOT NULL;

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE public.self_promoters ENABLE ROW LEVEL SECURITY;

-- Public can read active self-promoters
CREATE POLICY "Public read active self_promoters" ON public.self_promoters
  FOR SELECT USING (is_active = true);

-- Owners can update their own self-promoter profile
CREATE POLICY "Owners can update own self_promoter" ON public.self_promoters
  FOR UPDATE USING (auth.uid() = owner_id);

-- Service role has full access (for admin operations)
CREATE POLICY "Service role full access self_promoters" ON public.self_promoters
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================
-- UPDATE EVENTS POLICY
-- =====================

-- Drop the existing events policy and recreate to include self-promoter access
DROP POLICY IF EXISTS "Owners can manage events" ON public.events;

CREATE POLICY "Owners can manage events" ON public.events FOR ALL USING (
  -- Restaurant owners can manage their restaurant's events
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
  OR
  -- Self-promoters can manage their own events
  EXISTS (SELECT 1 FROM public.self_promoters WHERE id = self_promoter_id AND owner_id = auth.uid())
);

-- =====================
-- TRIGGERS
-- =====================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_self_promoters_updated_at
  BEFORE UPDATE ON public.self_promoters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
