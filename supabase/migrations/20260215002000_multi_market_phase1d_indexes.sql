-- ============================================================
-- MULTI-MARKET MIGRATION — PHASE 1D
--
-- Production-safe. Additive-only. Fully idempotent.
--
-- Creates performance indexes for market_id columns
-- added in Phases 1A, 1B, and 1C.
--
-- Depends on: Phase 1A (markets table)
--             Phase 1B (restaurants.market_id)
--             Phase 1C (all other market_id columns)
--
-- Safety guarantees:
--   - CREATE INDEX IF NOT EXISTS only
--   - No schema changes
--   - No constraint changes
--   - No RLS changes
--   - Zero destructive statements
-- ============================================================


-- markets
CREATE INDEX IF NOT EXISTS idx_markets_slug
  ON public.markets(slug);

CREATE INDEX IF NOT EXISTS idx_markets_active
  ON public.markets(is_active)
  WHERE is_active = true;

-- restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_market_active
  ON public.restaurants(market_id, is_active)
  WHERE is_active = true;

-- events
CREATE INDEX IF NOT EXISTS idx_events_market_active
  ON public.events(market_id, is_active)
  WHERE is_active = true;

-- self_promoters
CREATE INDEX IF NOT EXISTS idx_self_promoters_market
  ON public.self_promoters(market_id)
  WHERE is_active = true;

-- areas
CREATE INDEX IF NOT EXISTS idx_areas_market
  ON public.areas(market_id)
  WHERE is_active = true;

-- featured_ads
CREATE INDEX IF NOT EXISTS idx_featured_ads_market
  ON public.featured_ads(market_id)
  WHERE is_active = true;

-- blog_posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_market
  ON public.blog_posts(market_id);

-- business_leads
CREATE INDEX IF NOT EXISTS idx_business_leads_market
  ON public.business_leads(market_id);

-- itineraries
CREATE INDEX IF NOT EXISTS idx_itineraries_market
  ON public.itineraries(market_id);


-- ============================================================
-- PHASE 1D COMPLETE
--
-- Indexes created:
--   idx_markets_slug
--   idx_markets_active
--   idx_restaurants_market_active
--   idx_events_market_active
--   idx_self_promoters_market
--   idx_areas_market
--   idx_featured_ads_market
--   idx_blog_posts_market
--   idx_business_leads_market
--   idx_itineraries_market
--
-- 0 schema changes
-- 0 constraint changes
-- 0 RLS changes
-- 0 destructive operations
-- ============================================================
