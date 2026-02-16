-- Phase 5: Add role-based admin columns to profiles
-- Replaces hardcoded email-based admin checks with database-driven roles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_market_id UUID DEFAULT NULL
    REFERENCES public.markets(id);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_admin_market_id ON public.profiles(admin_market_id) WHERE admin_market_id IS NOT NULL;

-- Constraint: admin_market_id must be set for market_admin, must be null for others
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_admin_market_role
  CHECK (
    (role = 'market_admin' AND admin_market_id IS NOT NULL)
    OR (role IS DISTINCT FROM 'market_admin')
  );
