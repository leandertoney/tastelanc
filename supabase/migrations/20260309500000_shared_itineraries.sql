-- Shared Itineraries: allow users to share their day plans to the Pulse community feed

ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

-- Drop the existing restrictive policy (users can only see their own)
-- and replace with one that also allows reading shared itineraries
DROP POLICY IF EXISTS "Users can manage own itineraries" ON public.itineraries;

CREATE POLICY "Users can manage own itineraries"
  ON public.itineraries FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view shared itineraries"
  ON public.itineraries FOR SELECT
  USING (is_shared = TRUE);

-- Index for efficient Pulse feed queries
CREATE INDEX IF NOT EXISTS idx_itineraries_shared
  ON public.itineraries(is_shared, shared_at DESC)
  WHERE is_shared = TRUE;
