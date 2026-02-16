-- ============================================================
-- MULTI-MARKET MIGRATION — PHASE 1C
--
-- Production-safe. Additive-only. Fully idempotent.
--
-- Adds market_id to: events, self_promoters, areas,
--   featured_ads, blog_posts, business_leads, itineraries,
--   rosie_cache, user_preferences
--
-- Depends on: Phase 1A (markets table seeded)
--             Phase 1B (restaurants.market_id populated)
--
-- Safety guarantees:
--   - ADD COLUMN IF NOT EXISTS
--   - Backfills use deterministic scalar subqueries
--   - Safety re-backfill before every SET NOT NULL
--   - No indexes (deferred to Phase 1D)
--   - No policy changes
--   - No constraint drops
--   - Zero destructive statements
-- ============================================================


-- ============================================================
-- 1C.1: events
-- Events can belong to restaurants OR self_promoters.
-- Step 1: inherit market_id from restaurant (where available)
-- Step 2: default remaining to lancaster-pa
-- Constraint: NOT NULL
-- ============================================================

-- 1C.1a: Add column (nullable first)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES public.markets(id);

-- 1C.1b: Backfill events that have a restaurant_id
-- Deterministic: correlated scalar subquery, one restaurant per event
UPDATE public.events
SET market_id = (
  SELECT r.market_id
  FROM public.restaurants r
  WHERE r.id = public.events.restaurant_id
)
WHERE restaurant_id IS NOT NULL
  AND market_id IS NULL;

-- 1C.1c: Backfill remaining events (self-promoter events, any orphans)
UPDATE public.events
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- 1C.1d: Safety re-backfill
UPDATE public.events
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- 1C.1e: Enforce NOT NULL
ALTER TABLE public.events
  ALTER COLUMN market_id SET NOT NULL;


-- ============================================================
-- 1C.2: self_promoters
-- Constraint: NOT NULL
-- ============================================================

-- 1C.2a: Add column (nullable first)
ALTER TABLE public.self_promoters
  ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES public.markets(id);

-- 1C.2b: Backfill all to Lancaster
UPDATE public.self_promoters
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- 1C.2c: Safety re-backfill
UPDATE public.self_promoters
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- 1C.2d: Enforce NOT NULL
ALTER TABLE public.self_promoters
  ALTER COLUMN market_id SET NOT NULL;


-- ============================================================
-- 1C.3: areas
-- Constraint: NOT NULL
-- ============================================================

-- 1C.3a: Add column (nullable first)
ALTER TABLE public.areas
  ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES public.markets(id);

-- 1C.3b: Backfill all to Lancaster
UPDATE public.areas
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- 1C.3c: Safety re-backfill
UPDATE public.areas
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- 1C.3d: Enforce NOT NULL
ALTER TABLE public.areas
  ALTER COLUMN market_id SET NOT NULL;


-- ============================================================
-- 1C.4: featured_ads
-- Constraint: NULLABLE (NULL = show in all markets)
-- ============================================================

-- 1C.4a: Add column (nullable, stays nullable)
ALTER TABLE public.featured_ads
  ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES public.markets(id);

-- 1C.4b: Backfill existing ads to Lancaster
UPDATE public.featured_ads
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- NO SET NOT NULL — NULL = global/all-markets ad


-- ============================================================
-- 1C.5: blog_posts
-- Constraint: NOT NULL
-- ============================================================

-- 1C.5a: Add column (nullable first)
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES public.markets(id);

-- 1C.5b: Backfill all to Lancaster
UPDATE public.blog_posts
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- 1C.5c: Safety re-backfill
UPDATE public.blog_posts
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- 1C.5d: Enforce NOT NULL
ALTER TABLE public.blog_posts
  ALTER COLUMN market_id SET NOT NULL;


-- ============================================================
-- 1C.6: business_leads
-- Constraint: NULLABLE (legacy leads may lack market context)
-- ============================================================

-- 1C.6a: Add column (nullable, stays nullable)
ALTER TABLE public.business_leads
  ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES public.markets(id);

-- 1C.6b: Backfill existing leads to Lancaster
UPDATE public.business_leads
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- NO SET NOT NULL — nullable by design


-- ============================================================
-- 1C.7: itineraries
-- Constraint: NOT NULL
-- ============================================================

-- 1C.7a: Add column (nullable first)
ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES public.markets(id);

-- 1C.7b: Backfill all to Lancaster
UPDATE public.itineraries
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- 1C.7c: Safety re-backfill
UPDATE public.itineraries
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- 1C.7d: Enforce NOT NULL
ALTER TABLE public.itineraries
  ALTER COLUMN market_id SET NOT NULL;


-- ============================================================
-- 1C.8: rosie_cache
-- Constraint: NULLABLE (NULL = market-agnostic cached answer)
-- ============================================================

-- 1C.8a: Add column (nullable, stays nullable)
ALTER TABLE public.rosie_cache
  ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES public.markets(id);

-- 1C.8b: Backfill existing cache entries to Lancaster
UPDATE public.rosie_cache
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa')
WHERE market_id IS NULL;

-- NO SET NOT NULL — nullable by design


-- ============================================================
-- 1C.9: user_preferences
-- Add default_market_id column only. Nullable. No backfill.
-- Users will select their market in-app.
-- ============================================================

-- 1C.9a: Add column (nullable, stays nullable)
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS default_market_id UUID REFERENCES public.markets(id);

-- NO backfill — user-selected value
-- NO SET NOT NULL — nullable by design


-- ============================================================
-- PHASE 1C COMPLETE
--
-- Tables modified (NOT NULL):
--   events, self_promoters, areas, blog_posts, itineraries
--
-- Tables modified (NULLABLE):
--   featured_ads, business_leads, rosie_cache
--
-- Tables enhanced:
--   user_preferences (+default_market_id)
--
-- No indexes (deferred to Phase 1D)
-- No policy changes
-- 0 destructive operations
-- ============================================================
