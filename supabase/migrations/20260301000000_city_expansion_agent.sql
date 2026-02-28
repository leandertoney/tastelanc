-- ============================================================
-- CITY EXPANSION AGENT — DATABASE MIGRATION
--
-- Production-safe. Additive-only. Fully idempotent.
--
-- Tables created:
--   1. expansion_cities        — pipeline of cities being evaluated
--   2. expansion_brand_drafts  — AI-generated brand proposals per city
--   3. expansion_job_listings  — draft job listings per city
--   4. expansion_activity_log  — audit trail of all actions
--   5. inbound_emails          — incoming emails from info@ forwarding
--
-- Safety guarantees:
--   - CREATE TABLE IF NOT EXISTS
--   - Policy/trigger creation wrapped in existence checks
--   - CREATE INDEX IF NOT EXISTS
--   - Zero destructive statements
-- ============================================================


-- ============================================================
-- TABLE 1: EXPANSION CITIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expansion_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- City identity
  city_name TEXT NOT NULL,
  county TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'PA',
  slug TEXT NOT NULL UNIQUE,

  -- Research data (populated by AI agent)
  population INTEGER,
  median_income INTEGER,
  median_age NUMERIC(4,1),
  restaurant_count INTEGER,
  bar_count INTEGER,
  dining_scene_description TEXT,
  competition_analysis TEXT,
  market_potential_score INTEGER CHECK (market_potential_score BETWEEN 0 AND 100),
  research_data JSONB DEFAULT '{}',

  -- Geographic
  center_latitude DECIMAL(10,8),
  center_longitude DECIMAL(11,8),
  radius_miles INTEGER DEFAULT 25,

  -- Pipeline status
  status TEXT NOT NULL DEFAULT 'researching' CHECK (status IN (
    'researching',
    'researched',
    'brand_ready',
    'approved',
    'setup_in_progress',
    'live',
    'on_hold',
    'rejected'
  )),

  -- Admin tracking
  priority INTEGER DEFAULT 0,
  admin_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,

  -- Link to markets table (set when city goes live)
  market_id UUID REFERENCES public.markets(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.expansion_cities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'expansion_cities'
      AND policyname = 'Service role full access expansion_cities'
  ) THEN
    CREATE POLICY "Service role full access expansion_cities"
      ON public.expansion_cities
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expansion_cities_status ON public.expansion_cities(status);
CREATE INDEX IF NOT EXISTS idx_expansion_cities_score ON public.expansion_cities(market_potential_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_expansion_cities_slug ON public.expansion_cities(slug);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_expansion_cities_updated_at') THEN
    CREATE TRIGGER update_expansion_cities_updated_at
      BEFORE UPDATE ON public.expansion_cities
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;


-- ============================================================
-- TABLE 2: EXPANSION BRAND DRAFTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expansion_brand_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.expansion_cities(id) ON DELETE CASCADE,

  -- Brand identity
  app_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  ai_assistant_name TEXT NOT NULL,
  premium_name TEXT NOT NULL,

  -- Visual identity (matches MarketBrand.colors shape)
  colors JSONB NOT NULL DEFAULT '{}',

  -- Generated config (full MarketBrand object ready for market.ts)
  market_config_json JSONB NOT NULL DEFAULT '{}',

  -- SEO
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],

  -- Status
  is_selected BOOLEAN DEFAULT false,
  variant_number INTEGER NOT NULL DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.expansion_brand_drafts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'expansion_brand_drafts'
      AND policyname = 'Service role full access expansion_brand_drafts'
  ) THEN
    CREATE POLICY "Service role full access expansion_brand_drafts"
      ON public.expansion_brand_drafts
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expansion_brand_drafts_city ON public.expansion_brand_drafts(city_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_expansion_brand_drafts_updated_at') THEN
    CREATE TRIGGER update_expansion_brand_drafts_updated_at
      BEFORE UPDATE ON public.expansion_brand_drafts
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;


-- ============================================================
-- TABLE 3: EXPANSION JOB LISTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expansion_job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.expansion_cities(id) ON DELETE CASCADE,

  -- Job details
  title TEXT NOT NULL,
  role_type TEXT NOT NULL DEFAULT 'sales_rep' CHECK (role_type IN (
    'sales_rep', 'market_manager', 'content_creator', 'community_manager'
  )),
  description TEXT NOT NULL,
  requirements TEXT[],
  compensation_summary TEXT,
  location TEXT,
  is_remote BOOLEAN DEFAULT false,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'approved',
    'posted',
    'closed'
  )),

  -- Admin tracking
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.expansion_job_listings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'expansion_job_listings'
      AND policyname = 'Service role full access expansion_job_listings'
  ) THEN
    CREATE POLICY "Service role full access expansion_job_listings"
      ON public.expansion_job_listings
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expansion_job_listings_city ON public.expansion_job_listings(city_id);
CREATE INDEX IF NOT EXISTS idx_expansion_job_listings_status ON public.expansion_job_listings(status);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_expansion_job_listings_updated_at') THEN
    CREATE TRIGGER update_expansion_job_listings_updated_at
      BEFORE UPDATE ON public.expansion_job_listings
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;


-- ============================================================
-- TABLE 4: EXPANSION ACTIVITY LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expansion_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.expansion_cities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN (
    'city_added', 'research_started', 'research_completed',
    'brand_generated', 'brand_selected', 'brand_regenerated',
    'job_listing_generated', 'job_listing_approved', 'job_listing_rejected',
    'city_approved', 'city_rejected', 'city_put_on_hold',
    'market_created', 'status_changed', 'note_added'
  )),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.expansion_activity_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'expansion_activity_log'
      AND policyname = 'Service role full access expansion_activity_log'
  ) THEN
    CREATE POLICY "Service role full access expansion_activity_log"
      ON public.expansion_activity_log
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expansion_activity_log_city ON public.expansion_activity_log(city_id);
CREATE INDEX IF NOT EXISTS idx_expansion_activity_log_created ON public.expansion_activity_log(created_at DESC);


-- ============================================================
-- TABLE 5: INBOUND EMAILS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inbound_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email fields
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,

  -- Metadata
  headers JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',

  -- Admin management
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  admin_notes TEXT,
  category TEXT DEFAULT 'inquiry' CHECK (category IN (
    'inquiry', 'lead', 'spam', 'other'
  )),

  -- Optional link to expansion pipeline
  linked_city_id UUID REFERENCES public.expansion_cities(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inbound_emails'
      AND policyname = 'Service role full access inbound_emails'
  ) THEN
    CREATE POLICY "Service role full access inbound_emails"
      ON public.inbound_emails
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inbound_emails_created ON public.inbound_emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_is_read ON public.inbound_emails(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_inbound_emails_category ON public.inbound_emails(category);
