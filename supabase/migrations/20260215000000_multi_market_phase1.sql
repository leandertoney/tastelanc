-- ============================================================
-- MULTI-MARKET MIGRATION — PHASE 1A + PHASE 1B
--
-- Production-safe. Additive-only. Fully idempotent.
--
-- Phase 1A: Create markets table, enable RLS, seed rows
-- Phase 1B: Add market_id to restaurants, backfill, enforce NOT NULL, index
--
-- Safety guarantees:
--   - CREATE TABLE IF NOT EXISTS
--   - ADD COLUMN IF NOT EXISTS
--   - Policy/trigger creation wrapped in existence checks
--   - INSERT ON CONFLICT DO NOTHING
--   - UPDATE WHERE market_id IS NULL (no-op on re-run)
--   - SET NOT NULL is idempotent in PostgreSQL
--   - CREATE INDEX IF NOT EXISTS
--   - Zero destructive statements
-- ============================================================


-- ============================================================
-- PHASE 1A: CREATE MARKETS TABLE
-- ============================================================

-- 1A.1: Create the markets table
CREATE TABLE IF NOT EXISTS public.markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  county TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'PA',
  center_latitude DECIMAL(10,8),
  center_longitude DECIMAL(11,8),
  radius_miles INTEGER DEFAULT 25,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 1A.2: Enable RLS on markets (idempotent — no-op if already enabled)
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

-- 1A.3: RLS policy — public read active markets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'markets'
      AND policyname = 'Public read active markets'
  ) THEN
    CREATE POLICY "Public read active markets" ON public.markets
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- 1A.4: RLS policy — service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'markets'
      AND policyname = 'Service role full access markets'
  ) THEN
    CREATE POLICY "Service role full access markets" ON public.markets
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- 1A.5: Updated_at trigger (idempotent — checks pg_trigger)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_markets_updated_at'
  ) THEN
    CREATE TRIGGER update_markets_updated_at
      BEFORE UPDATE ON public.markets
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- 1A.6: Seed initial markets (idempotent — ON CONFLICT DO NOTHING)
INSERT INTO public.markets (name, slug, county, state, center_latitude, center_longitude, radius_miles)
VALUES
  ('Lancaster County', 'lancaster-pa', 'Lancaster', 'PA', 40.0379, -76.3055, 25),
  ('Cumberland County', 'cumberland-pa', 'Cumberland', 'PA', 40.1632, -77.2640, 25)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- PHASE 1B: ADD market_id TO restaurants
-- ============================================================

-- 1B.1: Add column (nullable first, idempotent)
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES public.markets(id);

-- 1B.2: Backfill all existing restaurants to Lancaster
-- Deterministic: markets.slug has UNIQUE constraint, returns exactly 1 row
-- Idempotent: WHERE market_id IS NULL means no-op on re-run
UPDATE public.restaurants
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- 1B.3: Safety re-backfill (catches rows inserted during 1B.1 → 1B.2 window)
UPDATE public.restaurants
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- 1B.4: Enforce NOT NULL
-- Idempotent: PostgreSQL SET NOT NULL on an already NOT NULL column is a no-op
ALTER TABLE public.restaurants
  ALTER COLUMN market_id SET NOT NULL;

-- 1B.5: Create composite index for the primary query pattern
-- Idempotent: IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_restaurants_market_active
  ON public.restaurants(market_id, is_active)
  WHERE is_active = true;


-- ============================================================
-- PHASE 1A + 1B COMPLETE
--
-- Changes applied:
--   1 new table:   markets (2 rows seeded)
--   1 table modified: restaurants (+market_id NOT NULL)
--   1 index created: idx_restaurants_market_active
--   2 RLS policies: on markets table only
--   1 trigger: on markets table only
--   0 destructive operations
-- ============================================================
