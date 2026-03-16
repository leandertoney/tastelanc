-- Allow admin users to be scoped to multiple markets instead of just one.
-- Migrates admin_market_id (single UUID) → admin_market_ids (UUID array).

-- 1. Add the new array column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_market_ids UUID[] DEFAULT NULL;

-- 2. Migrate existing data: wrap single ID into an array
UPDATE public.profiles
  SET admin_market_ids = ARRAY[admin_market_id]
  WHERE admin_market_id IS NOT NULL;

-- 3. Drop old constraint and column
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_admin_market_role;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS admin_market_id;

-- 4. New constraint: market_admin must have at least one market, others must have null
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_admin_market_role
  CHECK (
    (role = 'market_admin' AND admin_market_ids IS NOT NULL AND array_length(admin_market_ids, 1) > 0)
    OR (role IS DISTINCT FROM 'market_admin')
  );

-- 5. Index for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_admin_market_ids
  ON public.profiles USING GIN (admin_market_ids)
  WHERE admin_market_ids IS NOT NULL;
